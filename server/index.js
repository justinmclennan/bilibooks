import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import textToSpeech from '@google-cloud/text-to-speech';
import { STORY_SYSTEM_PROMPT, PLANNING_SYSTEM_PROMPT } from '../src/prompts/storySpec.js';
import { concatenateWavs, createSilenceBuffer } from './audioUtils.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ttsClient = new textToSpeech.TextToSpeechClient();

const SENTENCE_COUNT_TARGETS = {
  'pre-a1': { 150: { min: 30, max: 50 }, 300: { min: 60, max: 100 }, 450: { min: 90, max: 150 } },
  'a1': { 150: { min: 22, max: 30 }, 300: { min: 43, max: 60 }, 450: { min: 65, max: 90 } },
  'a2': { 150: { min: 12, max: 19 }, 300: { min: 24, max: 38 }, 450: { min: 35, max: 57 } },
  'b1': { 150: { min: 8, max: 11 }, 300: { min: 15, max: 22 }, 450: { min: 23, max: 32 } },
};

function getSentenceCountRange(style, words) {
  const level = SENTENCE_COUNT_TARGETS[style];
  if (!level) return { min: 5, max: 10 };

  // Find closest word target
  const targets = [150, 300, 450];
  const closest = targets.reduce((prev, curr) =>
    Math.abs(curr - words) < Math.abs(prev - words) ? curr : prev
  );

  return level[closest] || { min: 10, max: 20 };
}

/**
 * Pedagogical word count tool: Counts target-language words only.
 */
function countTargetWords(chapterData) {
  if (!chapterData.lines) return 0;
  return chapterData.lines.reduce((acc, line) => {
    return acc + (line.target || "").split(/\s+/).filter(w => w.length > 0).length;
  }, 0);
}

/**
 * Validates a chapter against proficiency-level constraints and word count targets.
 */
function validateChapter(chapterData, wordsPerChapter, sentenceLevelStyle) {
  const actualWordCount = countTargetWords(chapterData);
  const actualSentenceCount = chapterData.lines ? chapterData.lines.length : 0;

  let minWords, maxWords;
  if (wordsPerChapter === 150) { minWords = 125; maxWords = 175; }
  else if (wordsPerChapter === 300) { minWords = 250; maxWords = 350; }
  else if (wordsPerChapter === 450) { minWords = 400; maxWords = 500; }
  else { minWords = wordsPerChapter * 0.8; maxWords = wordsPerChapter * 1.2; }

  const sentenceRange = getSentenceCountRange(sentenceLevelStyle, wordsPerChapter);

  const tooShort = actualWordCount < minWords;
  const tooLong = actualWordCount > maxWords;
  const lowSentenceCount = actualSentenceCount < sentenceRange.min;

  let lineRange = { min: 3, max: 20 };
  let mustSplit = false;

  if (sentenceLevelStyle === 'pre-a1') { lineRange = { min: 3, max: 5 }; }
  else if (sentenceLevelStyle === 'a1') { lineRange = { min: 5, max: 7 }; }
  else if (sentenceLevelStyle === 'a2') { lineRange = { min: 8, max: 13 }; mustSplit = true; }
  else if (sentenceLevelStyle === 'b1') { lineRange = { min: 14, max: 20 }; mustSplit = true; }

  let lineViolations = [];
  if (!chapterData.lines) return { valid: false, tooShort: true, tooLong: false, tooManyViolations: true, actualWordCount: 0, actualSentenceCount: 0, lineViolations: ["No lines generated"] };

  chapterData.lines.forEach((line, idx) => {
    const fullCount = (line.target || "").split(/\s+/).filter(w => w.length > 0).length;
    if (fullCount < lineRange.min || fullCount > lineRange.max) {
      lineViolations.push(`Line ${idx + 1} has ${fullCount} words (Expected ${lineRange.min}-${lineRange.max})`);
    }
    if (mustSplit) {
      const h1t = (line.targetFirstHalf || "").trim();
      const h2t = (line.targetSecondHalf || "").trim();
      const h1n = (line.nativeFirstHalf || "").trim();
      const h2n = (line.nativeSecondHalf || "").trim();
      if (!h1t || !h2t || !h1n || !h2n) {
        lineViolations.push(`Line ${idx + 1} is missing split halves`);
      }
    }
  });

  const tooManyViolations = lineViolations.length > (chapterData.lines.length * 0.2);

  return {
    valid: !tooShort && !tooLong && !lowSentenceCount && !tooManyViolations,
    tooShort,
    tooLong,
    lowSentenceCount,
    tooManyViolations,
    actualWordCount,
    actualSentenceCount,
    sentenceRange,
    lineViolations,
    minWords,
    maxWords
  };
}

app.post('/api/generate-story', async (req, res) => {
  const {
    baseLanguage,
    targetLanguage,
    level,
    chapterCount,
    sentenceLevelStyle,
    wordsPerChapter,
    storyIdea,
    vocabulary,
    planningMode
  } = req.body;

  if (!baseLanguage || !targetLanguage || !level) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    console.log('--- Starting Planning Step ---');
    const planningUserPrompt = `
Target Language: ${targetLanguage}
Base Language: ${baseLanguage}
Chapters: ${chapterCount}
Vocabulary: ${vocabulary}
Idea: ${storyIdea}
Planning Mode: ${planningMode}
    `.trim();

    const planningResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: PLANNING_SYSTEM_PROMPT },
        { role: "user", content: planningUserPrompt }
      ],
      response_format: { type: "json_object" },
    });

    const plan = JSON.parse(planningResponse.choices[0].message.content);
    console.log('Plan created:', plan.title);

    const chapters = [];
    let combinedVocabList = [];
    let previousSummaries = [];

    for (const chapterPlan of plan.chapters) {
      const sRange = getSentenceCountRange(sentenceLevelStyle, wordsPerChapter);
      const targetSentences = Math.floor((sRange.min + sRange.max) / 2);

      console.log(`--- Generating Chapter ${chapterPlan.chapterNumber}: ${chapterPlan.chapterTitle} ---`);
      console.log(`Requested Style: ${sentenceLevelStyle}, Words: ${wordsPerChapter}, Target Sentences: ${targetSentences}`);

      const generatePrompt = (retryMessage = null, existingLines = null) => {
        let prompt = `
Target Language: ${targetLanguage}
Base Language: ${baseLanguage}
CEFR Level: ${level}
Sentence Level Style: ${sentenceLevelStyle}
Words Per Chapter Target: ${wordsPerChapter}
Target Sentence Count: ${targetSentences}
Chapter Info: ${JSON.stringify(chapterPlan)}
Continuity Context: ${previousSummaries.join(' ')}
        `.trim();

        if (existingLines) {
          prompt += `\n\nCONTINUE STORY: The chapter is currently too short. Here are the existing lines:\n${JSON.stringify(existingLines)}\n\nPlease CONTINUE the story starting from the last line and add approximately ${targetSentences - existingLines.length} more sentences to reach the target word count. DO NOT repeat the beginning of the story.`;
        }

        if (retryMessage) {
          prompt += `\n\nRETRY INSTRUCTION: ${retryMessage}`;
        }
        return prompt;
      };

      const getChapterFromAI = async (prompt) => {
        // Inject languages into the system prompt
        const systemPrompt = STORY_SYSTEM_PROMPT
          .replace(/{targetLanguage}/g, targetLanguage)
          .replace(/{baseLanguage}/g, baseLanguage);

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          max_tokens: 4000,
        });
        return JSON.parse(response.choices[0].message.content);
      };

      let chapterData = await getChapterFromAI(generatePrompt());
      let validation = validateChapter(chapterData, wordsPerChapter, sentenceLevelStyle);
      let retryUsed = false;

      // Handle too short / low sentence count via Continuation Loop
      let continuationAttempts = 0;
      while (!validation.valid && (validation.tooShort || validation.lowSentenceCount) && continuationAttempts < 3) {
        retryUsed = true;
        continuationAttempts++;
        console.log(`Chapter too short (${validation.actualWordCount}/${validation.minWords} words, ${validation.actualSentenceCount}/${validation.sentenceRange.min} sentences). Continuation attempt ${continuationAttempts}...`);

        const continuationData = await getChapterFromAI(generatePrompt(null, chapterData.lines));

        // Append new lines
        if (continuationData.lines && Array.isArray(continuationData.lines)) {
          chapterData.lines = [...chapterData.lines, ...continuationData.lines];
          if (continuationData.vocabularyList) {
            chapterData.vocabularyList = [...(chapterData.vocabularyList || []), ...continuationData.vocabularyList];
          }
          chapterData.chapterSummary = continuationData.chapterSummary || chapterData.chapterSummary;
        }

        validation = validateChapter(chapterData, wordsPerChapter, sentenceLevelStyle);
        console.log(`Continuation attempt ${continuationAttempts} result: ${validation.valid ? 'PASSED' : 'STILL FAILING'} (${validation.actualWordCount} words)`);
      }

      // Handle other violations (formatting, length) via regular retry
      if (!validation.valid) {
        retryUsed = true;
        console.log(`Validation failed for Ch ${chapterPlan.chapterNumber}:`, validation);

        let correction = "";
        if (validation.tooShort || validation.tooLong || validation.lowSentenceCount) {
          correction = `This chapter is ${validation.actualWordCount} words and ${validation.actualSentenceCount} sentences. It must have ${validation.minWords}–${validation.maxWords} words and at least ${validation.sentenceRange.min} sentences. Regenerate this chapter completely with the correct length while preserving the plan.`;
        } else if (validation.tooManyViolations) {
          correction = `This chapter failed sentence style validation. Violations: ${validation.lineViolations.slice(0, 3).join(', ')}. Please ensure every sentence follows the ${sentenceLevelStyle} rules.`;
        }

        chapterData = await getChapterFromAI(generatePrompt(correction));
        validation = validateChapter(chapterData, wordsPerChapter, sentenceLevelStyle);
        console.log(`Final validation result for Ch ${chapterPlan.chapterNumber}: ${validation.valid ? 'PASSED' : 'FAILED'} (${validation.actualWordCount} words)`);
      }

      chapterData.estimatedTargetWordCount = validation.actualWordCount;
      chapterData.actualSentenceCount = validation.actualSentenceCount;
      chapterData.validationPassed = validation.valid;
      chapterData.retryUsed = retryUsed;
      chapterData.validationDetails = validation;

      chapters.push(chapterData);
      previousSummaries.push(chapterData.chapterSummary || "");

      if (chapterData.vocabularyList) {
        combinedVocabList = [...combinedVocabList, ...chapterData.vocabularyList];
      }
    }

    // Deduplicate vocab
    const uniqueVocab = Array.from(new Set(combinedVocabList.map(v => v.target)))
      .map(target => combinedVocabList.find(v => v.target === target));

    res.json({
      title: plan.title,
      storyArc: plan.storyArc,
      chapters: chapters,
      vocabularyList: uniqueVocab,
      allPassed: chapters.every(c => c.validationPassed)
    });

  } catch (error) {
    console.error('Error generating story:', error);
    res.status(500).json({ error: 'Failed to generate story' });
  }
});

/**
 * Audio Generation Endpoint
 */
const VOICE_MAP = {
  'French': { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A' },
  'Spanish': { languageCode: 'es-ES', name: 'es-ES-Neural2-A' },
  'English': { languageCode: 'en-US', name: 'en-US-Neural2-D' },
  'German': { languageCode: 'de-DE', name: 'de-DE-Neural2-F' },
  'Japanese': { languageCode: 'ja-JP', name: 'ja-JP-Neural2-C' },
};

app.post('/api/generate-audio', async (req, res) => {
  const { ssml, segments, targetLanguage, baseLanguage, voiceName } = req.body;

  console.log('--- Audio Generation Request ---');

  const getVoice = (langName) => VOICE_MAP[langName] || VOICE_MAP['English'];

  // Handle segments for bilingual/stitching (WAV output)
  if (segments && Array.isArray(segments)) {
    const targetVoice = getVoice(targetLanguage);
    const baseVoice = getVoice(baseLanguage);

    console.log(`Bilingual Mode: Target=${targetLanguage} (${targetVoice.name}), Base=${baseLanguage} (${baseVoice.name})`);

    try {
      const audioBuffers = [];
      for (const segment of segments) {
        if (segment.type === 'pause') {
          const silence = createSilenceBuffer(segment.duration);
          audioBuffers.push({ buffer: silence, isSilence: true });
          continue;
        }

        const voice = segment.lang === 'target' ? targetVoice : baseVoice;
        const request = {
          input: { text: segment.text },
          voice: voice,
          audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);
        // Google Cloud TTS LINEAR16 returns a WAV file with a 44-byte header.
        // We strip the header to get raw PCM data for clean concatenation.
        const pcmData = Buffer.from(response.audioContent).slice(44);
        audioBuffers.push({ buffer: pcmData, isSilence: false });
      }

      const finalWav = concatenateWavs(audioBuffers);
      res.json({ audioContent: finalWav.toString('base64'), format: 'wav' });
      return;
    } catch (error) {
       console.error('Bilingual Audio Error:', error);
       return res.status(500).json({ error: 'Bilingual audio generation failed.' });
    }
  }

  // Handle single-voice SSML (MP3 output)
  if (!ssml || typeof ssml !== 'string' || !ssml.includes('<speak>')) {
    return res.status(400).json({ error: 'No valid SSML was provided for audio generation.' });
  }

  const targetVoice = getVoice(targetLanguage);
  const voice = voiceName ? { name: voiceName, languageCode: voiceName.substring(0, 5) } : targetVoice;

  console.log(`SSML Mode: Voice=${voice.name}, Target=${targetLanguage}, Length=${ssml.length}`);

  try {
    const request = {
      input: { ssml: ssml },
      voice: voice,
      audioConfig: { audioEncoding: 'MP3' },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    res.json({ audioContent: response.audioContent.toString('base64'), format: 'mp3' });
  } catch (error) {
    console.error('Google TTS Error:', error);
    res.status(500).json({ error: 'Audio generation failed.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
