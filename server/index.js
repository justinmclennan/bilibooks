import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import { STORY_SYSTEM_PROMPT } from '../src/prompts/storySpec.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const buildUserPrompt = ({ chapter, genre, level, focusVerbs, theme }) => {
  return `
Create Chapter ${chapter}.

Genre: ${genre}
Level: ${level}
Focus verbs: ${focusVerbs}
Theme: ${theme}
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

  // Map frontend fields to buildUserPrompt arguments
  const userPrompt = buildUserPrompt({
    chapter: "1",
    genre: "Drama",
    level: level,
    focusVerbs: vocabulary,
    theme: storyIdea,
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: STORY_SYSTEM_PROMPT + `

          IMPORTANT: You MUST return the response as a JSON object with the following keys:
          - title: A creative title for the story.
          - storyTargetLanguage: The French story paragraph.
          - storyNativeLanguage: The English meaning paragraph.
          - interlinearTargetFirst: The Interlinear practice section.
          - interlinearNativeFirst: An alternative interlinear version (English first as per rules).
          - shadowTargetOnly: The French-only shadow version.
          - vocabularyList: An array of objects { "term": "verb", "translation": "meaning", "explanation": "usage" } based on the Focus verbs.
          - ssmlScript: The SSML drill version.
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
