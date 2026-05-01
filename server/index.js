import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import textToSpeech from '@google-cloud/text-to-speech';
import { STORY_SYSTEM_PROMPT } from '../src/prompts/storySpec.js';
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

const buildUserPrompt = ({ chapter, genre, level, focusVerbs, theme, storyLength, targetLanguage, baseLanguage }) => {
  return `
Target Language: ${targetLanguage}
Base Language (Native): ${baseLanguage}
Create Chapter ${chapter}.
Genre: ${genre}
Level: ${level}
Focus verbs/Vocabulary: ${focusVerbs}
Theme: ${theme}
Story Length Preference: ${storyLength}
  `.trim();
};

app.post('/api/generate-story', async (req, res) => {
  const {
    baseLanguage,
    targetLanguage,
    level,
    storyLength,
    storyIdea,
    vocabulary,
  } = req.body;

  if (!baseLanguage || !targetLanguage || !level) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const userPrompt = buildUserPrompt({
    chapter: "1",
    genre: "Drama",
    level: level,
    focusVerbs: vocabulary,
    theme: storyIdea,
    storyLength: storyLength,
    targetLanguage: targetLanguage,
    baseLanguage: baseLanguage,
  });

  try {
    const dynamicSystemPrompt = STORY_SYSTEM_PROMPT.replace(/French/g, targetLanguage);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: dynamicSystemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      response_format: { type: "json_object" },
    });

    const content = JSON.parse(response.choices[0].message.content);
    res.json(content);
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
