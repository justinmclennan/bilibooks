import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  const prompt = `
    Generate a language learning story package with the following details:
    - Base Language (Native): ${baseLanguage}
    - Target Language: ${targetLanguage}
    - CEFR Level: ${level}
    - Story Length: ${storyLength}
    - Story Idea: ${storyIdea}
    - Specific Vocabulary/Grammar: ${vocabulary}

    The response must be a valid JSON object with the following structure:
    {
      "title": "Story Title",
      "storyTargetLanguage": "The full story in the target language.",
      "storyNativeLanguage": "The full story in the native language.",
      "interlinearTargetFirst": "The story with each sentence in the target language followed immediately by its translation in the native language.",
      "interlinearNativeFirst": "The story with each sentence in the native language followed immediately by its translation in the target language.",
      "shadowTargetOnly": "The full story in the target language, formatted for shadowing (e.g., with pauses or clear sentence breaks).",
      "vocabularyList": [
        { "term": "word/phrase", "translation": "translation", "explanation": "brief usage note" }
      ],
      "ssmlScript": "An SSML formatted script for Text-to-Speech, using voices appropriate for ${targetLanguage}. Include breaks and emphasis where natural."
    }

    Ensure the story is engaging and appropriate for the ${level} level in ${targetLanguage}.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful language learning assistant that generates structured story content." },
        { role: "user", content: prompt }
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
