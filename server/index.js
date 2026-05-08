import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import textToSpeech from '@google-cloud/text-to-speech';
import { STORY_SYSTEM_PROMPT, PLANNING_SYSTEM_PROMPT } from '../src/prompts/storySpec.js';
import { concatenateWavs, createSilenceBuffer } from './audioUtils.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ttsClient = new textToSpeech.TextToSpeechClient();

function calculateGenerationTargets(sentencesPerChapter, sentenceLevelStyle) {
  const styleConfig = {
    'pre-a1': { avg: 4, min: 3, max: 5 },
    'a1': { avg: 6, min: 5, max: 7 },
    'a2': { avg: 10.5, min: 8, max: 13 },
    'b1': { avg: 16, min: 14, max: 20 }
  };

  const config = styleConfig[sentenceLevelStyle] || styleConfig['a1'];

  const targetSentenceCount = sentencesPerChapter;
  // Use a +/- 1 sentence tolerance
  const minSentenceCount = Math.max(1, targetSentenceCount - 1);
  const maxSentenceCount = targetSentenceCount + 1;

  // Derive approximate word counts for reference/legacy display
  const targetWords = targetSentenceCount * config.avg;
  const minChapterWords = Math.floor(targetWords * 0.75);
  const maxChapterWords = Math.ceil(targetWords * 1.25);

  return {
    minChapterWords,
    maxChapterWords,
    targetAverageSentenceWords: config.avg,
    targetSentenceCount,
    minSentenceCount,
    maxSentenceCount,
    minSentenceWords: config.min,
    maxSentenceWords: config.max
  };
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
function validateChapter(chapterData, targets, sentenceLevelStyle) {
  const actualWordCount = countTargetWords(chapterData);
  const actualSentenceCount = chapterData.lines ? chapterData.lines.length : 0;

  const tooFewSentences = actualSentenceCount < targets.minSentenceCount;
  const tooManySentences = actualSentenceCount > targets.maxSentenceCount;

  const mustSplit = (sentenceLevelStyle === 'a2' || sentenceLevelStyle === 'b1');

  let lineViolations = [];
  let splitViolations = [];
  let sentencesUnderMinCount = 0;

  if (!chapterData.lines) {
    return {
      valid: false,
      reasons: ["No lines generated"],
      actualWordCount: 0,
      actualSentenceCount: 0,
      sentencesUnderMinCount: 0,
      targets
    };
  }

  chapterData.lines.forEach((line, idx) => {
    const fullCount = (line.target || "").split(/\s+/).filter(w => w.length > 0).length;
    if (fullCount < targets.minSentenceWords) {
      sentencesUnderMinCount++;
    }
    if (fullCount < targets.minSentenceWords || fullCount > targets.maxSentenceWords) {
      lineViolations.push(`Line ${idx + 1} has ${fullCount} words (Expected ${targets.minSentenceWords}-${targets.maxSentenceWords})`);
    }
    if (mustSplit) {
      const h1t = (line.targetFirstHalf || "").trim();
      const h2t = (line.targetSecondHalf || "").trim();
      const h1n = (line.nativeFirstHalf || "").trim();
      const h2n = (line.nativeSecondHalf || "").trim();
      if (!h1t || !h2t || !h1n || !h2n) {
        splitViolations.push(`Line ${idx + 1} is missing split halves`);
      }
    }
  });

  const tooManyLengthViolations = lineViolations.length > (chapterData.lines.length * 0.2);
  const hasSplitViolations = splitViolations.length > 0;

  const reasons = [];
  if (tooFewSentences) reasons.push(`Too few sentences (${actualSentenceCount}/${targets.minSentenceCount})`);
  if (tooManySentences) reasons.push(`Too many sentences (${actualSentenceCount}/${targets.maxSentenceCount})`);
  if (tooManyLengthViolations) reasons.push(`Too many sentence length violations (${lineViolations.length}/${actualSentenceCount})`);
  if (hasSplitViolations) reasons.push(`Missing split halves in ${splitViolations.length} sentences`);

  return {
    valid: reasons.length === 0,
    reasons,
    tooFewSentences,
    tooManySentences,
    tooManyLengthViolations,
    hasSplitViolations,
    actualWordCount,
    actualSentenceCount,
    averageSentenceLength: actualSentenceCount > 0 ? (actualWordCount / actualSentenceCount).toFixed(1) : 0,
    sentencesUnderMinCount,
    lineViolations,
    splitViolations,
    targets
  };
}

app.post('/api/generate-story', async (req, res) => {
  const {
    baseLanguage,
    targetLanguage,
    level,
    chapterCount,
    sentenceLevelStyle,
    sentencesPerChapter,
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

    const targets = calculateGenerationTargets(sentencesPerChapter, sentenceLevelStyle);

    for (const chapterPlan of plan.chapters) {
      console.log(`--- Generating Chapter ${chapterPlan.chapterNumber}: ${chapterPlan.chapterTitle} ---`);
      console.log(`Selected sentencesPerChapter: ${sentencesPerChapter}`);
      console.log(`Selected sentenceLevelStyle: ${sentenceLevelStyle}`);
      console.log(`Target Sentence Count: ${targets.minSentenceCount}-${targets.maxSentenceCount}`);
      console.log(`Target Sentence Length: ${targets.minSentenceWords}-${targets.maxSentenceWords} words each.`);

      const generatePrompt = (retryMessage = null, existingLines = null) => {
        let prompt = `
Target Language: ${targetLanguage}
Base Language: ${baseLanguage}
CEFR Level: ${level}
Sentence Level Style: ${sentenceLevelStyle}
Target Sentence Count: ${targets.minSentenceCount}-${targets.maxSentenceCount}
Each ${targetLanguage} sentence must be ${targets.minSentenceWords}-${targets.maxSentenceWords} words.
Chapter Info: ${JSON.stringify(chapterPlan)}
Continuity Context: ${previousSummaries.join(' ')}
        `.trim();

        if (existingLines) {
          prompt += `\n\nCONTINUE STORY: The chapter is currently too short. Here are the existing lines:\n${JSON.stringify(existingLines)}\n\nPlease CONTINUE the story starting from the last line and add more sentences to reach the target word count. DO NOT repeat the beginning of the story.`;
        }

        if (retryMessage) {
          prompt += `\n\nRETRY INSTRUCTION: ${retryMessage}`;
        }
        return prompt;
      };

      const getChapterFromAI = async (prompt) => {
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
      let validation = validateChapter(chapterData, targets, sentenceLevelStyle);
      let repairAttempt = 0;

      while (!validation.valid && repairAttempt < 2) {
        repairAttempt++;
        console.log(`Validation failed (Attempt ${repairAttempt}): ${validation.reasons.join(', ')}`);
        console.log(`Actual target word count: ${validation.actualWordCount}`);
        console.log(`Actual sentence count: ${validation.actualSentenceCount}`);
        console.log(`Average target words per sentence: ${validation.averageSentenceLength}`);
        console.log(`Sentences under min words: ${validation.sentencesUnderMinCount}`);
        console.log(`Sentence length violations: ${validation.lineViolations.length}`);

        let correction = "";
        if (validation.tooFewSentences) {
          console.log(`Repair Mode B: Too few sentences: add sentences.`);
          const neededSentences = targets.targetSentenceCount - validation.actualSentenceCount;
          correction = `The chapter has too few sentences (${validation.actualSentenceCount}).
          REPAIR: Add approximately ${neededSentences} more ${targetLanguage} sentences to reach the target of ${targets.targetSentenceCount}. Ensure each sentence is ${targets.minSentenceWords}-${targets.maxSentenceWords} words.`;
        }
        else if (validation.tooManySentences) {
          console.log(`Repair Mode C: Too many sentences: compress chapter.`);
          correction = `The chapter has too many sentences (${validation.actualSentenceCount}).
          REPAIR: Compress the story to reach the target of ${targets.targetSentenceCount} sentences. Ensure each sentence is ${targets.minSentenceWords}-${targets.maxSentenceWords} words.`;
        }
        else if (validation.tooManyLengthViolations) {
          console.log(`Repair Mode D: Sentence length violations: rewrite for sentence density.`);
          correction = `Too many sentences are outside the target range of ${targets.minSentenceWords}-${targets.maxSentenceWords} words.
          REPAIR: Rewrite the chapter so each ${targetLanguage} sentence is within ${targets.minSentenceWords}-${targets.maxSentenceWords} words. Keep the total sentence count around ${targets.targetSentenceCount}.`;
        }
        else if (validation.hasSplitViolations) {
          console.log(`Repair Mode F: Missing split halves.`);
          correction = `Some sentences are missing 'targetFirstHalf', 'targetSecondHalf', etc.
          REPAIR: Provide the split halves for EVERY sentence without changing the meaning.`;
        }
        else {
          correction = `Validation failed: ${validation.reasons.join('. ')}. Please fix and regenerate the chapter.`;
        }

        chapterData = await getChapterFromAI(generatePrompt(correction));
        validation = validateChapter(chapterData, targets, sentenceLevelStyle);
      }

      console.log(`Final validation result for Ch ${chapterPlan.chapterNumber}: ${validation.valid ? 'PASSED' : 'FAILED'} (${validation.actualWordCount} words, ${validation.actualSentenceCount} sentences)`);
      console.log(`Final word count: ${validation.actualWordCount}`);
      console.log(`Final sentence count: ${validation.actualSentenceCount}`);
      console.log(`Final average words per sentence: ${validation.averageSentenceLength}`);

      chapterData.estimatedTargetWordCount = validation.actualWordCount;
      chapterData.actualSentenceCount = validation.actualSentenceCount;
      chapterData.validationPassed = validation.valid;
      chapterData.repairAttempts = repairAttempt;
      chapterData.validationDetails = validation;

      chapters.push(chapterData);
      previousSummaries.push(chapterData.chapterSummary || "");

      if (chapterData.vocabularyList) {
        combinedVocabList = [...combinedVocabList, ...chapterData.vocabularyList];
      }
    }

    // Deduplicate vocab
    const uniqueVocab = Array.from(new Set(combinedVocabList.map(v => v.termTargetLanguage || v.target)))
      .map(term => combinedVocabList.find(v => (v.termTargetLanguage || v.target) === term));

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
      enableTimePointing: ['SSML_MARK'],
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    res.json({
      audioContent: response.audioContent.toString('base64'),
      format: 'mp3',
      timepoints: response.timepoints
    });
  } catch (error) {
    console.error('Google TTS Error:', error);
    res.status(500).json({ error: 'Audio generation failed.' });
  }
});

/**
 * Library Routes
 */
const LIBRARY_DIR = path.join(__dirname, '..', 'saved-library');

// Ensure library dir exists
if (!fs.existsSync(LIBRARY_DIR)) {
  fs.mkdirSync(LIBRARY_DIR, { recursive: true });
}

app.get('/api/library', async (req, res) => {
  try {
    const folders = fs.readdirSync(LIBRARY_DIR);
    const library = folders
      .map(folder => {
        const metadataPath = path.join(LIBRARY_DIR, folder, 'metadata.json');
        if (fs.existsSync(metadataPath)) {
          return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(library);
  } catch (error) {
    console.error('Error fetching library:', error);
    res.status(500).json({ error: 'Failed to fetch library' });
  }
});

app.get('/api/library/:id', async (req, res) => {
  const { id } = req.params;
  const metadataPath = path.join(LIBRARY_DIR, id, 'metadata.json');

  if (!fs.existsSync(metadataPath)) {
    return res.status(404).json({ error: 'Story not found' });
  }

  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    res.json(metadata);
  } catch (error) {
    console.error('Error fetching story details:', error);
    res.status(500).json({ error: 'Failed to fetch story details' });
  }
});

app.get('/api/library/:id/file/:filename', async (req, res) => {
  const { id, filename } = req.params;
  const filePath = path.join(LIBRARY_DIR, id, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.sendFile(filePath);
});

app.post('/api/library/save', async (req, res) => {
  const {
    storyData,
    formData,
    contentVersions,
    audioFiles // Array of { id, audioContent, format }
  } = req.body;

  if (!storyData || !formData) {
    return res.status(400).json({ error: 'Missing required data' });
  }

  try {
    const safeTitle = (storyData.title || 'untitled')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 30);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folderName = `${safeTitle}-${timestamp}`;
    const folderPath = path.join(LIBRARY_DIR, folderName);

    fs.mkdirSync(folderPath, { recursive: true });

    // Save Metadata
    const metadata = {
      id: folderName,
      title: storyData.title,
      baseLanguage: formData.baseLanguage,
      targetLanguage: formData.targetLanguage,
      level: formData.level,
      chapterCount: formData.chapterCount,
      sentencesPerChapter: formData.sentencesPerChapter,
      sentenceLevelStyle: formData.sentenceLevelStyle,
      storyIdea: formData.storyIdea,
      vocabulary: storyData.vocabularyList || [],
      storyArc: storyData.storyArc,
      chapters: storyData.chapters || [],
      createdAt: new Date().toISOString(),
      audioFiles: []
    };

    // Save Scripts and SSML
    if (contentVersions) {
      Object.entries(contentVersions).forEach(([key, version]) => {
        if (version.readable) {
          fs.writeFileSync(path.join(folderPath, `${key}.txt`), version.readable);
        }
        if (version.ssml) {
          fs.writeFileSync(path.join(folderPath, `${key}.ssml`), version.ssml);
        }
      });
    }

    // Save Audio Files
    if (audioFiles && Array.isArray(audioFiles)) {
      audioFiles.forEach(file => {
        const filename = `${file.id}.${file.format}`;
        const buffer = Buffer.from(file.audioContent, 'base64');
        fs.writeFileSync(path.join(folderPath, filename), buffer);
        metadata.audioFiles.push({
          id: file.id,
          filename,
          format: file.format,
          timepoints: file.timepoints
        });
      });
    }

    // Write final metadata.json
    fs.writeFileSync(path.join(folderPath, 'metadata.json'), JSON.stringify(metadata, null, 2));

    res.json({ success: true, id: folderName });
  } catch (error) {
    console.error('Error saving to library:', error);
    res.status(500).json({ error: 'Failed to save to library' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
