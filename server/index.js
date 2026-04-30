import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { STORY_SYSTEM_PROMPT } from '../src/prompts/storySpec.js';
import { buildPollySSML } from './ssmlBuilder.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AWS Polly Client
const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

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
          content: dynamicSystemPrompt + `

          IMPORTANT: You MUST return the response as a JSON object with the following keys:
          - title: A creative title for the story.
          - storyTargetLanguage: The story in ${targetLanguage}.
          - storyNativeLanguage: The story in ${baseLanguage}.
          - interlinearTargetFirst: The Interlinear practice section (English is ${baseLanguage}, French is ${targetLanguage}).
          - interlinearNativeFirst: An alternative interlinear version (${baseLanguage} first).
          - shadowTargetOnly: The ${targetLanguage}-only shadow version.
          - vocabularyList: An array of objects { "term": "word/verb", "translation": "meaning in ${baseLanguage}", "explanation": "usage note" } based on the Focus verbs.
          - audioDrillLines: The array of objects for the Audio drill source lines section as specified.
          `
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
  const { lines, voiceId = "Lea", engine = "neural", outputFormat = "mp3" } = req.body;

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return res.status(500).json({ error: 'AWS credentials are not configured on the server.' });
  }

  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty lines' });
  }

  try {
    const ssml = buildPollySSML(lines);

    const command = new SynthesizeSpeechCommand({
      Text: ssml,
      TextType: "ssml",
      OutputFormat: outputFormat,
      VoiceId: voiceId,
      Engine: engine,
    });

    const response = await pollyClient.send(command);

    if (response.AudioStream) {
      res.setHeader('Content-Type', 'audio/mpeg');
      response.AudioStream.pipe(res);
    } else {
      throw new Error('Polly did not return an audio stream.');
    }
  } catch (error) {
    console.error('Error generating audio:', error);
    const errorResponse = { error: 'Failed to generate audio' };

    // In development, provide more details
    if (process.env.NODE_ENV !== 'production') {
      try {
        errorResponse.details = error.message;
        errorResponse.ssml = buildPollySSML(lines);
      } catch (ssmlError) {
        errorResponse.ssmlError = ssmlError.message;
      }
    }

    res.status(500).json(errorResponse);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
