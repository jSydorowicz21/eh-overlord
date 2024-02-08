# Radiant Troll Discord Bot

## Overview

Radiant Troll is a Discord bot designed to engage with users through witty and humorous responses. Utilizing the power of OpenAI's GPT model, it offers creative burns, compliments, or playful banter based on user interactions. This bot is perfect for communities looking to add a bit of humor and personality to their Discord servers.

## Features

- **User Interaction**: Responds to @mentions with personalized comments.
-  **Creative Burns**: Generates humorous burns or compliments based on the context.
-  **Customizable Prompts**: Tailors responses to individual users for a personalized experience.
-  **Environmentally Aware**: Uses `.env` for secure management of sensitive information like API keys.

## Setup

### Prerequisites

- Node.js installed on your system.
- A Discord bot token. [See Discord's documentation](https://discord.com/developers/docs/intro) for creating a bot.
- An OpenAI API key. [See OpenAI's documentation](https://beta.openai.com/signup/) for obtaining an API key.

### Installation

1. Clone the repository:
   ```git clone <repository-url>```
2. Install dependencies:
   ```npm install ```
3. Create a `.env` file in the root directory and add your Discord bot token and OpenAI API key:
   ```DISCORD_BOT_TOKEN=your_bot_token_here OPENAI_API_KEY=your_openai_api_key_here```

### Running the Bot

Run the bot using Node.js:
```node trollbot.js```

## Usage

After inviting the bot to your Discord server and running it, you can interact with it by mentioning it in a message:
```@RadiantTroll What do you think of @user?```
Radiant Troll will process the mention and respond based on its programming and the context provided.

## Contributing

Contributions to Radiant Troll are welcome! Here's how you can contribute:

1. Fork the repository.
2. Create a new branch for your feature (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -am 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

## License

Distributed under the MIT License. See `LICENSE` for more information.
