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
  let minWords, maxWords;

  if (wordsPerChapter === 150) { minWords = 125; maxWords = 175; }
  else if (wordsPerChapter === 300) { minWords = 250; maxWords = 350; }
  else if (wordsPerChapter === 450) { minWords = 400; maxWords = 500; }
  else { minWords = wordsPerChapter * 0.8; maxWords = wordsPerChapter * 1.2; }

  const tooShort = actualWordCount < minWords;
  const tooLong = actualWordCount > maxWords;

  let lineRange = { min: 3, max: 20 };
  let mustSplit = false;

  if (sentenceLevelStyle === 'pre-a1') { lineRange = { min: 3, max: 5 }; }
  else if (sentenceLevelStyle === 'a1') { lineRange = { min: 5, max: 7 }; }
  else if (sentenceLevelStyle === 'a2') { lineRange = { min: 8, max: 13 }; mustSplit = true; }
  else if (sentenceLevelStyle === 'b1') { lineRange = { min: 14, max: 20 }; mustSplit = true; }

  let lineViolations = [];
  if (!chapterData.lines) return { valid: false, tooShort: true, tooLong: false, tooManyViolations: true, actualWordCount: 0, lineViolations: ["No lines generated"] };

  chapterData.lines.forEach((line, idx) => {
    const fullCount = (line.target || "").split(/\s+/).filter(w => w.length > 0).length;

    if (fullCount < lineRange.min || fullCount > lineRange.max) {
      lineViolations.push(`Line ${idx + 1} has ${fullCount} words (Expected ${lineRange.min}-${lineRange.max})`);
    }

    if (mustSplit) {
      const c1 = (line.targetFirstHalf || "").split(/\s+/).filter(w => w.length > 0).length;
      const c2 = (line.targetSecondHalf || "").split(/\s+/).filter(w => w.length > 0).length;
      if (c1 === 0 || c2 === 0) {
        lineViolations.push(`Line ${idx + 1} is not split into two halves`);
      }
    }
  });

  const tooManyViolations = lineViolations.length > (chapterData.lines.length * 0.2);

  return {
    valid: !tooShort && !tooLong && !tooManyViolations,
    tooShort,
    tooLong,
    tooManyViolations,
    actualWordCount,
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
      console.log(`--- Generating Chapter ${chapterPlan.chapterNumber}: ${chapterPlan.chapterTitle} ---`);

      const generatePrompt = (retryMessage = null) => {
        let prompt = `
Target Language: ${targetLanguage}
Base Language: ${baseLanguage}
CEFR Level: ${level}
Sentence Level Style: ${sentenceLevelStyle}
Words Per Chapter Target: ${wordsPerChapter}
Chapter Info: ${JSON.stringify(chapterPlan)}
Continuity Context: ${previousSummaries.join(' ')}
        `.trim();

        if (retryMessage) {
          prompt += `\n\nRETRY INSTRUCTION: ${retryMessage}`;
        }
        return prompt;
      };

      const getChapterFromAI = async (prompt) => {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: STORY_SYSTEM_PROMPT },
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

      if (!validation.valid) {
        retryUsed = true;
        console.log(`Validation failed for Ch ${chapterPlan.chapterNumber}:`, validation);

        let correction = "";
        if (validation.tooShort || validation.tooLong) {
          correction = `This chapter failed length validation. It has ${validation.actualWordCount} target-language words, but it must have ${validation.minWords}–${validation.maxWords}. Regenerate this chapter with the correct number of target-language words while preserving the chapter purpose, vocabulary plan, CEFR level, and sentence style.`;
        } else if (validation.tooManyViolations) {
          correction = `This chapter failed sentence style validation. Violations: ${validation.lineViolations.slice(0, 3).join(', ')}. Please ensure every sentence follows the ${sentenceLevelStyle} length rules and splitting requirements.`;
        }

        chapterData = await getChapterFromAI(generatePrompt(correction));
        validation = validateChapter(chapterData, wordsPerChapter, sentenceLevelStyle);
        console.log(`Retry result for Ch ${chapterPlan.chapterNumber}: ${validation.valid ? 'PASSED' : 'FAILED'}`);
      }

      chapterData.estimatedTargetWordCount = validation.actualWordCount;
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
 * Single-voice TTS can return MP3 directly from Google TTS.
 * Dual-voice interlinear audio requires stitching multiple audio segments (currently outputting WAV).
 */
app.post('/api/generate-audio', async (req, res) => {
  const { ssml, segments, targetLanguage, baseLanguage, voiceName } = req.body;

  console.log('--- Audio Generation Request ---');
  console.log('SSML provided:', !!ssml);
  console.log('Segments provided:', !!segments);
  console.log('Audio format requested:', ssml ? 'MP3 (SSML)' : 'WAV (Segments)');
  console.log('Target Lang:', targetLanguage);
  console.log('Voice Name:', voiceName);

  if (ssml) {
    console.log('SSML length:', ssml.length);
    console.log('SSML Preview:', ssml.substring(0, 120));
  }

  // Handle segments for bilingual/stitching (WAV output)
  if (segments && Array.isArray(segments)) {
    const voiceMap = {
      'French': { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A' },
      'Spanish': { languageCode: 'es-ES', name: 'es-ES-Neural2-A' },
      'English': { languageCode: 'en-US', name: 'en-US-Neural2-D' },
      'German': { languageCode: 'de-DE', name: 'de-DE-Neural2-F' },
    };

    const getVoice = (lang) => voiceMap[lang] || voiceMap['English'];

    try {
      const audioBuffers = [];
      for (const segment of segments) {
        if (segment.type === 'pause') {
          const silence = createSilenceBuffer(segment.duration);
          audioBuffers.push({ buffer: silence, isSilence: true });
          continue;
        }

        const voice = segment.lang === 'target' ? getVoice(targetLanguage) : getVoice(baseLanguage);
        const request = {
          input: { text: segment.text },
          voice: voice,
          audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);
        audioBuffers.push({ buffer: Buffer.from(response.audioContent), isSilence: false });
      }

      const finalWav = concatenateWavs(audioBuffers);
      res.set('Content-Type', 'audio/wav');
      res.send(finalWav);
      return;
    } catch (error) {
       console.error('Bilingual Audio Error:', error);
       return res.status(500).json({ error: 'Bilingual audio generation failed. Check backend logs.' });
    }
  }

  // Handle single-voice SSML (MP3 output)
  if (!ssml || typeof ssml !== 'string' || !ssml.includes('<speak>')) {
    return res.status(400).json({ error: 'No valid SSML was provided for audio generation.' });
  }

  const voiceMap = {
    'French': { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A' },
    'Spanish': { languageCode: 'es-ES', name: 'es-ES-Neural2-A' },
    'English': { languageCode: 'en-US', name: 'en-US-Neural2-D' },
    'German': { languageCode: 'de-DE', name: 'de-DE-Neural2-F' },
  };

  const defaultVoice = voiceMap[targetLanguage] || voiceMap['English'];
  const voice = voiceName ? { name: voiceName, languageCode: voiceName.substring(0, 5) } : defaultVoice;

  try {
    const request = {
      input: { ssml: ssml },
      voice: voice,
      audioConfig: { audioEncoding: 'MP3' },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.audioContent);
  } catch (error) {
    console.error('Google TTS Error:', error);
    let msg = 'Audio generation failed. Check backend logs.';
    if (error.code === 7) msg = 'Permission denied for Text-to-Speech.';
    if (error.code === 3) msg = 'No valid SSML was provided for audio generation.';
    if (error.message?.includes('credentials')) msg = 'Google credentials were not found.';
    if (error.message?.includes('API has not been used')) msg = 'Google Cloud Text-to-Speech API may not be enabled.';

    res.status(500).json({ error: msg });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
