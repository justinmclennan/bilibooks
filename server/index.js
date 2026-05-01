import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import textToSpeech from '@google-cloud/text-to-speech';
import { STORY_SYSTEM_PROMPT } from '../src/prompts/storySpec.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Google Cloud Text-to-Speech client
// Note: Google Cloud automatically looks for credentials at the path specified in GOOGLE_APPLICATION_CREDENTIALS environment variable
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
  const { ssml, targetLanguage } = req.body;

  if (!ssml) {
    return res.status(400).json({ error: 'SSML content is required' });
  }

  // Voice mapping based on requirements
  const voiceMap = {
    'French': { languageCode: 'fr-FR', name: 'fr-FR-Neural2-A' },
    'Spanish': { languageCode: 'es-ES', name: 'es-ES-Neural2-A' },
    'English': { languageCode: 'en-US', name: 'en-US-Neural2-D' },
  };

  const selectedVoice = voiceMap[targetLanguage] || voiceMap['English'];

  const request = {
    input: { ssml: ssml },
    voice: selectedVoice,
    audioConfig: { audioEncoding: 'MP3' },
  };

  try {
    const [response] = await ttsClient.synthesizeSpeech(request);
    // Convert audio content to base64
    const audioContent = response.audioContent.toString('base64');
    res.json({ audioContent });
  } catch (error) {
    console.error('Error generating audio:', error);
    res.status(500).json({ error: 'Audio generation failed. Please check Google Cloud credentials and try again.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
