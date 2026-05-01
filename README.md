# LinguStory

LinguStory is a React SPA that uses AI to generate custom language learning stories and audio.

## Features

- Custom story generation based on target language, level, and personal ideas.
- Structured learning materials: interlinear scripts, shadow scripts, and vocabulary lists.
- **Google Cloud Text-to-Speech Integration**: Generate high-quality MP3 audio from SSML scripts.
- Interactive UI with loading and error states.
- Secure backend for OpenAI and Google Cloud integration.

## Setup

### Prerequisites

- Node.js (v20 or higher recommended)
- npm or yarn
- OpenAI API Key
- Google Cloud Project with Text-to-Speech API enabled
- Google Cloud Service Account credentials (JSON file)

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the root directory based on `.env.example`:
    ```bash
    cp .env.example .env
    ```
4.  Add your API keys and credentials path to the `.env` file:
    ```
    OPENAI_API_KEY=your_actual_api_key_here
    GOOGLE_APPLICATION_CREDENTIALS=./path-to-your-service-account.json
    ```

### Google Cloud Setup

1.  Enable the **Cloud Text-to-Speech API** in your Google Cloud Console.
2.  Create a **Service Account**.
3.  Generate and download a **JSON key** for the service account.
4.  Place the JSON file in your project directory (ensure it's ignored by git) and update `GOOGLE_APPLICATION_CREDENTIALS` in your `.env`.

### Running the Application

To run the application locally, you need to start both the backend server and the frontend development server.

1.  **Start the Backend Server:**
    ```bash
    node server/index.js
    ```
    (The server runs on http://localhost:3001 by default)

2.  **Start the Frontend:**
    In a new terminal window:
    ```bash
    npm run dev
    ```
    (Vite will serve the app, typically on http://localhost:5173, and proxy API requests to the backend)

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Material Symbols
- **Backend:** Node.js, Express, OpenAI SDK, Google Cloud Text-to-Speech SDK
- **AI:** OpenAI GPT-4o
- **TTS:** Google Cloud Text-to-Speech (Neural2 voices)
