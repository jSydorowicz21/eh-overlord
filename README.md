# EH Overlord - Discord Bot for Team Management

A Node.js Discord bot designed to manage teams and players for the Elo Heroes League, supporting 800+ players with persistent MongoDB storage. The bot includes comprehensive team management features, player verification, and automated role management.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Commands](#commands)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [Contact](#contact)
- [License](#license)

## Features

- **Team Management**: Create, delete, and manage teams with captains and managers
- **Player Operations**: Add/remove players and coaches with approval workflows
- **Role Management**: Automated Discord role assignment and removal
- **Player Verification**: Check player stats and rank using Tracker.gg integration
- **Voting System**: Approval-based player addition/removal with Discord buttons
- **MongoDB Integration**: Persistent data storage for teams, players, and coaches
- **Proxy Support**: Web scraping with proxy authentication for player stats
- **OpenAI Integration**: AI-powered player analysis and smurf detection
- **Comprehensive Logging**: Winston-based logging system

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/jSydorowicz21/eh-overlord.git
    cd eh-overlord
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Create a `.env` file in the root directory and add your environment variables (see [Configuration](#configuration)).

4. Start the bot:
    ```sh
    node bot.js
    ```

## Configuration

Create a `.env` file in the root directory with the following environment variables:

```env
# Discord Configuration
DISCORD_BOT_TOKEN=your-discord-bot-token
APPLICATION_ID=your-application-id
GUILD_ID=your-guild-id

# Database
MONGODB_URI=your-mongodb-connection-string

# API Keys
OPENAI_API_KEY=your-openai-api-key
VALORANT_API_KEY=your-valorant-api-key
VALORANT_API_BASE_URL=valorant-api-base-url

# Web Scraping
PROXY_URL=your-proxy-url
PROXY_USERNAME=your-proxy-username
PROXY_PASSWORD=your-proxy-password
TRACKER_BASE_URL=https://tracker.gg/valorant/profile/riot/

# Roles
SEASON_ROLE=your-season-role-id
COACH_ROLE=your-coach-role-id
CAPTAIN_ROLE=your-captain-role-id

# OpenAI Configuration
OPENAPI_PROMPT=your-custom-prompt-for-player-analysis
```

## Usage

The bot automatically connects to MongoDB and registers slash commands on startup. It supports both general user commands and staff-level administrative commands.

## Commands

### General Commands

- **`/check`** - Check if a player is likely a smurf
  - `riot_id` (STRING): The Riot ID of the player (e.g., username#tagline)

- **`/add_player`** - Request to add a player to your team
  - `riot_id` (STRING): The Riot ID of the player
  - `discord_id` (USER): The Discord user to add

- **`/remove_player`** - Request to remove a player from your team
  - `discord_id` (USER): The Discord user to remove

- **`/add_coach`** - Add a coach to your team
  - `riot_id` (STRING): The Riot ID of the coach
  - `discord_id` (USER): The Discord user to add as coach

- **`/remove_coach`** - Remove a coach from your team
  - `discord_id` (USER): The Discord user to remove as coach

- **`/team`** - Display team information
  - `player_discord_id` (USER): The Discord user to check

- **`/request_sub`** - Request a substitute player
  - `riot_id` (STRING): The Riot ID of the substitute
  - `discord_id` (USER): The Discord user to add as substitute

### Staff Commands

- **`/staff create_team`** - Create a new team
  - `team_name` (STRING): The name of the team
  - `captain_discord_id` (USER): The Discord ID of the team captain
  - `team_channel` (CHANNEL): The channel to set for the team
  - `team_role` (ROLE): The role to assign to the team

- **`/staff delete_team`** - Delete a team
  - `captain_discord_id` (USER): The Discord ID of the team captain

- **`/staff set_team_channel`** - Set the channel for the team
  - `team_name` (STRING): The name of the team
  - `channel_id` (CHANNEL): The channel to set for the team

- **`/staff set_captain`** - Set a new captain for the team
  - `captain_discord_id` (USER): The Discord ID of the new team captain
  - `team_name` (STRING): The name of the team

- **`/staff set_manager`** - Set a new manager for the team
  - `manager_discord_id` (USER): The Discord ID of the new manager
  - `team_name` (STRING): The name of the team

- **`/staff override_add`** - Bypass approval to add a player
  - `riot_id` (STRING): The Riot ID of the player
  - `discord_id` (USER): The Discord ID of the player
  - `captain_discord_id` (USER): The Discord ID of the team captain

- **`/staff override_remove`** - Bypass approval to remove a player
  - `player_discord_id` (USER): The Discord ID of the player
  - `captain_discord_id` (USER): The Discord ID of the team captain

- **`/staff update_team_info`** - Update team information
  - `team_name` (STRING): The current name of the team
  - `new_team_name` (STRING): The new name for the team
  - `new_captain_discord_id` (USER): The Discord ID of the new team captain

- **`/staff set_team_role`** - Assign a role to the team
  - `team_name` (STRING): The name of the team
  - `role_id` (ROLE): The role to assign to the team

- **`/staff set_riot_id`** - Set the Riot ID for a player
  - `discord_id` (USER): The Discord ID of the player
  - `new_riot_id` (STRING): The new Riot ID of the player

## Architecture

### Core Components

- **`bot.js`** - Main bot file with Discord client setup and command registration
- **`src/handlers/`** - Core business logic handlers
  - `interactionHandler.js` - Discord interaction processing
  - `mongoHandler.js` - Database operations and models
  - `playerHandler.js` - Player operations and web scraping
- **`src/commands/`** - Slash command definitions
  - `generalCommands.js` - User-level commands
  - `staffCommands.js` - Administrative commands
  - `predictionCommands.js` - Prediction and point management
- **`src/models/`** - MongoDB schemas and models
  - `Player.js` - Player data model
  - `Team.js` - Team data model
  - `Coach.js` - Coach data model
  - `Prediction.js` - Prediction tracking
  - `Point.js` - Point system
- **`src/utils/`** - Utility functions and helpers
  - `logger.js` - Winston logging configuration
  - `errorNoticeHelper.js` - Error handling utilities
  - `openAiHelper.js` - OpenAI API integration
  - `helperFunctions.js` - Common helper functions

### Key Features

- **Voting System**: Player additions/removals require staff approval through Discord buttons
- **Role Automation**: Automatic Discord role management based on team membership
- **Player Verification**: Integration with Tracker.gg and Valorant API for player validation
- **Proxy Support**: Supports proxy authentication for Tracker.gg scraping
- **AI Analysis**: OpenAI integration for player behavior analysis

## Dependencies

- **Discord.js v14** - Modern Discord bot framework
- **MongoDB/Mongoose** - Database and ODM
- **Puppeteer** - Used to scrape player stats from Tracker.gg
- **OpenAI API** - AI-powered player analysis
- **Winston** - Comprehensive logging
- **Jest** - Testing framework

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Contact

For questions or support, contact **Devil920** on Discord.

## License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.

---

**EH Overlord** - Powering the Elo Heroes League with automated team management and player verification.
