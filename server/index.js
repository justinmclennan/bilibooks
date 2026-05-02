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

function countTargetWords(chapterData) {
  if (!chapterData.lines) return 0;
  return chapterData.lines.reduce((acc, line) => {
    return acc + (line.target || "").split(/\s+/).filter(w => w.length > 0).length;
  }, 0);
}

function validateChapter(chapterData, wordsPerChapter, sentenceLevelStyle) {
  const actualWordCount = countTargetWords(chapterData);
  let minWords;

  if (wordsPerChapter === 150) { minWords = 125; }
  else if (wordsPerChapter === 300) { minWords = 250; }
  else if (wordsPerChapter === 450) { minWords = 400; }
  else { minWords = wordsPerChapter * 0.8; }

  const tooShort = actualWordCount < minWords;

  let lineRange = { min: 3, max: 20 };
  let halfRange = null;

  if (sentenceLevelStyle === 'pre-a1') { lineRange = { min: 3, max: 6 }; }
  else if (sentenceLevelStyle === 'a1') { lineRange = { min: 5, max: 8 }; }
  else if (sentenceLevelStyle === 'a2') { lineRange = { min: 8, max: 14 }; halfRange = { min: 4, max: 8 }; }
  else if (sentenceLevelStyle === 'b1') { lineRange = { min: 14, max: 22 }; halfRange = { min: 6, max: 12 }; }

  let lineViolations = 0;
  if (!chapterData.lines) return { valid: false, tooShort: true, tooManyViolations: true, actualWordCount: 0, lineViolations: 0 };

  chapterData.lines.forEach(line => {
    const fullCount = (line.target || "").split(/\s+/).filter(w => w.length > 0).length;

    // Check full sentence length
    if (fullCount < lineRange.min || fullCount > lineRange.max) {
      lineViolations++;
      return;
    }

    // Check halves if applicable
    if (halfRange) {
      const c1 = (line.targetFirstHalf || "").split(/\s+/).filter(w => w.length > 0).length;
      const c2 = (line.targetSecondHalf || "").split(/\s+/).filter(w => w.length > 0).length;
      if (c1 < halfRange.min || c1 > halfRange.max || c2 < halfRange.min || c2 > halfRange.max) {
        lineViolations++;
      }
    }
  });

  const tooManyViolations = lineViolations > (chapterData.lines.length * 0.3);

  return {
    valid: !tooShort && !tooManyViolations,
    tooShort,
    tooManyViolations,
    actualWordCount,
    lineViolations
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
    // Step 1: Planning
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

    // Step 2: Story Generation per Chapter
    const chapters = [];
    let combinedVocabList = [];

    for (const chapterPlan of plan.chapters) {
      const storyUserPrompt = `
Target Language: ${targetLanguage}
Base Language: ${baseLanguage}
Level: ${level}
Sentence Level Style: ${sentenceLevelStyle}
Words Per Chapter: ${wordsPerChapter}
Chapter Plan: ${JSON.stringify(chapterPlan)}
      `.trim();

      const getChapter = async (prompt, retryMessage = null) => {
        const messages = [
          { role: "system", content: STORY_SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ];
        if (retryMessage) {
          messages.push({ role: "assistant", content: "Previous attempt failed validation." });
          messages.push({ role: "user", content: retryMessage });
        }

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: messages,
          response_format: { type: "json_object" },
        });
        return JSON.parse(response.choices[0].message.content);
      };

      let chapterData = await getChapter(storyUserPrompt);
      let validation = validateChapter(chapterData, wordsPerChapter, sentenceLevelStyle);
      let retryUsed = false;

      if (!validation.valid) {
        retryUsed = true;
        console.log(`Validation failed for Chapter ${chapterPlan.chapterNumber}:`, validation);
        let correction = "";
        if (validation.tooShort) {
          correction += `Chapter ${chapterPlan.chapterNumber} is too short. It has only ${validation.actualWordCount} target-language words, but the requested target is ${wordsPerChapter}. Regenerate with approximately ${wordsPerChapter} target-language words. `;
        }
        if (validation.tooManyViolations) {
          correction += `Too many lines violate the '${sentenceLevelStyle}' style requirements. Please ensure every sentence and split half follows the specified length constraints. `;
        }

        chapterData = await getChapter(storyUserPrompt, correction.trim());
        validation = validateChapter(chapterData, wordsPerChapter, sentenceLevelStyle);
        console.log(`Retry validation result:`, validation.valid);
      }

      chapterData.estimatedTargetWordCount = validation.actualWordCount;
      chapterData.validationPassed = validation.valid;
      chapterData.retryUsed = retryUsed;
      chapterData.validationDetails = validation;

      chapters.push(chapterData);
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

app.post('/api/generate-audio', async (req, res) => {
  const { segments, targetLanguage, baseLanguage } = req.body;

  if (!segments || !Array.isArray(segments)) {
    return res.status(400).json({ error: 'Segments are required' });
  }

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
    res.json({ audioContent: finalWav.toString('base64') });
  } catch (error) {
    console.error('Error generating audio:', error);
    res.status(500).json({ error: 'Audio generation failed. Please check Google Cloud credentials.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
