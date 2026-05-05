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
import { generateSsml, generateReadable } from './scriptUtils.js';

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

const LIBRARY_DIR = path.join(__dirname, '..', 'saved-library');
if (!fs.existsSync(LIBRARY_DIR)) {
  fs.mkdirSync(LIBRARY_DIR, { recursive: true });
}

function calculateGenerationTargets(wordsPerChapter, sentenceLevelStyle) {
  const styleConfig = {
    'pre-a1': { avg: 4, min: 3, max: 5 },
    'a1': { avg: 6, min: 5, max: 7 },
    'a2': { avg: 10.5, min: 8, max: 13 },
    'b1': { avg: 16, min: 14, max: 20 }
  };
  const config = styleConfig[sentenceLevelStyle.toLowerCase()] || styleConfig['a1'];

  let minChapterWords, maxChapterWords;
  if (wordsPerChapter === 150) { minChapterWords = 125; maxChapterWords = 175; }
  else if (wordsPerChapter === 300) { minChapterWords = 250; maxChapterWords = 350; }
  else if (wordsPerChapter === 450) { minChapterWords = 400; maxChapterWords = 500; }
  else {
    minChapterWords = Math.floor(wordsPerChapter * 0.85);
    maxChapterWords = Math.ceil(wordsPerChapter * 1.15);
  }

  const targetSentenceCount = Math.round(wordsPerChapter / config.avg);
  return {
    minChapterWords,
    maxChapterWords,
    targetAverageSentenceWords: config.avg,
    targetSentenceCount,
    minSentenceCount: Math.max(1, Math.floor(targetSentenceCount * 0.9)),
    maxSentenceCount: Math.ceil(targetSentenceCount * 1.1),
    minSentenceWords: config.min,
    maxSentenceWords: config.max
  };
}

function countTargetWords(chapterData) {
  if (!chapterData.lines) return 0;
  return chapterData.lines.reduce((acc, line) => {
    return acc + (line.target || "").split(/\s+/).filter(w => w.length > 0).length;
  }, 0);
}

function validateChapter(chapterData, targets) {
  const actualWordCount = countTargetWords(chapterData);
  const actualSentenceCount = chapterData.lines ? chapterData.lines.length : 0;
  const lowerTolerance = Math.floor(targets.minChapterWords * 0.98);
  const upperTolerance = Math.ceil(targets.maxChapterWords * 1.02);
  const tooShort = actualWordCount < lowerTolerance;
  const tooLong = actualWordCount > upperTolerance;
  const reasons = [];
  const warnings = [];
  if (tooShort) reasons.push(`Too short: ${actualWordCount} words`);
  else if (actualWordCount < targets.minChapterWords) warnings.push(`Slightly below target word count (${actualWordCount}/${targets.minChapterWords})`);
  if (tooLong) reasons.push(`Too long: ${actualWordCount} words`);
  else if (actualWordCount > targets.maxChapterWords) warnings.push(`Slightly above target word count (${actualWordCount}/${targets.maxChapterWords})`);
  return { valid: reasons.length === 0, reasons, warnings, actualWordCount, actualSentenceCount };
}

app.post('/api/generate-story', async (req, res) => {
  const { baseLanguage, targetLanguage, level, chapterCount, sentenceLevelStyle, wordsPerChapter, storyIdea, vocabulary } = req.body;
  try {
    const planningResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: PLANNING_SYSTEM_PROMPT }, { role: "user", content: `Target: ${targetLanguage}, Base: ${baseLanguage}, Chapters: ${chapterCount}, Idea: ${storyIdea}, Vocabulary: ${vocabulary}` }],
      response_format: { type: "json_object" },
    });
    const plan = JSON.parse(planningResponse.choices[0].message.content);
    const chapters = [];
    const targets = calculateGenerationTargets(wordsPerChapter || 150, sentenceLevelStyle || level);
    for (const chapterPlan of plan.chapters) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: STORY_SYSTEM_PROMPT.replace(/{targetLanguage}/g, targetLanguage).replace(/{baseLanguage}/g, baseLanguage) }, { role: "user", content: `Generate: ${JSON.stringify(chapterPlan)}. Targets: ${JSON.stringify(targets)}` }],
        response_format: { type: "json_object" },
      });
      const chapterData = JSON.parse(response.choices[0].message.content);
      const validation = validateChapter(chapterData, targets);
      chapterData.validationWarnings = validation.warnings;
      chapterData.validationPassed = validation.valid;
      chapters.push(chapterData);
    }

    res.json({
      title: plan.title,
      storyTargetLanguage: generateReadable(chapters, { mode: 'story' }),
      storyNativeLanguage: chapters.map(c => c.lines.map(l => l.native).join(' ')).join('\n\n'),
      interlinearTargetFirst: generateReadable(chapters, { mode: 'interlinear', targetFirst: true }),
      interlinearNativeFirst: generateReadable(chapters, { mode: 'interlinear', targetFirst: false }),
      shadowTargetOnly: generateReadable(chapters, { mode: 'shadow' }),
      vocabularyList: Array.from(new Set(chapters.flatMap(c => c.vocabularyList || []).map(v => v.target))).map(t => chapters.flatMap(c => c.vocabularyList || []).find(v => v.target === t)),
      ssmlScript: generateSsml(chapters, { mode: 'interlinear', targetFirst: true }),
      chapters // for detail view
    });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

const VOICE_MAP = { 'French': { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A' }, 'Spanish': { languageCode: 'es-ES', name: 'es-ES-Neural2-A' }, 'English': { languageCode: 'en-US', name: 'en-US-Neural2-D' }, 'German': { languageCode: 'de-DE', name: 'de-DE-Neural2-F' }, 'Japanese': { languageCode: 'ja-JP', name: 'ja-JP-Neural2-C' } };

app.post('/api/generate-audio', async (req, res) => {
  const { ssml, segments, targetLanguage, baseLanguage, libraryItemId, scriptType } = req.body;
  const getVoice = (lang) => VOICE_MAP[lang] || VOICE_MAP['English'];
  try {
    if (segments) {
      const audioBuffers = [];
      for (const segment of segments) {
        if (segment.type === 'pause') { audioBuffers.push({ buffer: createSilenceBuffer(segment.duration), isSilence: true }); continue; }
        const [response] = await ttsClient.synthesizeSpeech({ input: { text: segment.text }, voice: getVoice(segment.lang === 'target' ? targetLanguage : baseLanguage), audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 } });
        audioBuffers.push({ buffer: Buffer.from(response.audioContent).slice(44), isSilence: false });
      }
      const finalWav = concatenateWavs(audioBuffers);
      if (libraryItemId) fs.writeFileSync(path.join(LIBRARY_DIR, libraryItemId, `${scriptType}.wav`), finalWav);
      res.json({ audioContent: finalWav.toString('base64'), format: 'wav', savedToLibrary: !!libraryItemId });
    } else {
      const [response] = await ttsClient.synthesizeSpeech({ input: { ssml }, voice: getVoice(targetLanguage), audioConfig: { audioEncoding: 'MP3' } });
      if (libraryItemId) fs.writeFileSync(path.join(LIBRARY_DIR, libraryItemId, `${scriptType}.mp3`), response.audioContent);
      res.json({ audioContent: response.audioContent.toString('base64'), format: 'mp3', savedToLibrary: !!libraryItemId });
    }
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/library', (req, res) => {
  const folders = fs.readdirSync(LIBRARY_DIR);
  const library = folders.map(f => {
    const metaPath = path.join(LIBRARY_DIR, f, 'metadata.json');
    return fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : null;
  }).filter(Boolean).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(library);
});

app.get('/api/library/:id', (req, res) => {
  const metaPath = path.join(LIBRARY_DIR, req.params.id, 'metadata.json');
  if (!fs.existsSync(metaPath)) return res.status(404).json({ error: 'Not found' });
  res.json(JSON.parse(fs.readFileSync(metaPath, 'utf8')));
});

app.get('/api/library/:id/file/:filename', (req, res) => {
  const filePath = path.join(LIBRARY_DIR, req.params.id, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  res.sendFile(filePath);
});

app.post('/api/library/save', (req, res) => {
  const { storyData, formData } = req.body;
  const id = `${(storyData.title || 'story').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
  const folderPath = path.join(LIBRARY_DIR, id);
  fs.mkdirSync(folderPath, { recursive: true });
  const metadata = { id, ...storyData, ...formData, createdAt: new Date().toISOString() };
  fs.writeFileSync(path.join(folderPath, 'metadata.json'), JSON.stringify(metadata, null, 2));
  res.json({ success: true, id });
});

app.listen(port, () => console.log(`Server running on port ${port}`));
