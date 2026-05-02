# LinguStory Local Prototype

A language-learning story generator that creates structured bilingual stories and audio using OpenAI GPT-4o and Google Cloud Text-to-Speech.

## Features
- **Multi-Chapter Planning:** Automatically divides your vocabulary across multiple chapters with a coherent story arc.
- **Pedagogical Controls:** Customize CEFR levels, chapter word counts, words per line, and sentence formatting (single vs. split).
- **Dual-Voice Audio:** Generates concatenated WAV audio with different voices for target and native languages.
- **Interlinear Scripts:** Multiple script views (Interlinear, Shadow, Story Only) with SSML and readable text exports.

## Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- OpenAI API Key
- Google Cloud Service Account with Text-to-Speech API enabled

## Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment:**
   Create a `.env` file in the root directory:
   ```env
   OPENAI_API_KEY=your_openai_key_here
   GOOGLE_APPLICATION_CREDENTIALS=path/to/your/google-credentials.json
   ```

## Running the App

Start both the Express backend and Vite frontend with a single command:
```bash
npm run dev:all
```
*On Windows:* `npm.cmd run dev:all`

Then open [http://localhost:5173/](http://localhost:5173/) in your browser.

## Development Workflow
- **Frontend:** `npm run dev` (Port 5173)
- **Backend:** `npm run server` (Port 3001)
- **Build:** `npm run build`
- **Lint:** `npm run lint`

## Architecture
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **AI:** OpenAI GPT-4o (Structured Output)
- **Audio:** Google Cloud TTS (Dual-voice concatenation)
- **Utilities:** Custom SSML/Timing engine in `src/utils/ssml.js`
