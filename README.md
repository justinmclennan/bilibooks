# LinguStory

LinguStory is a React SPA that uses AI to generate custom language learning stories.

## Features

- Custom story generation based on target language, level, and personal ideas.
- Structured learning materials: interlinear scripts, shadow scripts, and vocabulary lists.
- Interactive UI with loading and error states.
- Secure backend for OpenAI API integration.

## Setup

### Prerequisites

- Node.js (v20 or higher recommended)
- npm or yarn
- OpenAI API Key

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
4.  Add your OpenAI API key to the `.env` file:
    ```
    OPENAI_API_KEY=your_actual_api_key_here
    ```

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
- **Backend:** Node.js, Express, OpenAI SDK
- **AI:** OpenAI GPT-4o
