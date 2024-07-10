# Discord Bot for Team Management

This Discord bot is designed to manage teams and players, specifically for Valorant. It includes commands to check if a player is likely a smurf, add/remove players to/from teams, create/delete teams, and more. The bot also uses OpenAI for player analysis.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Commands](#commands)
- [License](#license)

## Features

- Check if a player is likely a smurf.
- Add or remove players from teams.
- Create or delete teams.
- Set team channels and captains.
- Use OpenAI for player analysis.

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/yourusername/discord-team-management-bot.git
    cd discord-team-management-bot
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Create a `.env` file in the root directory and add your environment variables (see [Configuration](#configuration)).

## Configuration

Create a `.env` file in the root directory and add the following environment variables:

```
DISCORD_BOT_TOKEN=your-discord-bot-token
OPENAI_API_KEY=your-openai-api-key
GUILD_ID=your-guild-id
APPLICATION_ID=your-application-id
MONGODB_URI=your-mongodb-uri
PROXY_URL=your-proxy-url
PROXY_USERNAME=your-proxy-username
PROXY_PASSWORD=your-proxy-password
TRACKER_BASE_URL=your-tracker-base-url
OPENAPI_PROMPT=your-openapi-prompt
```

## Usage

Start the bot:
```sh
node bot.js
```

## Commands

### General Commands
- `/check`
  - Description: Check if a player is likely a smurf.
  - Options:
    - `riot_id` (STRING): The Riot ID of the player (e.g., username#tagline).

- `/add_player`
  - Description: Add a player to the team.
  - Options:
    - `riot_id` (STRING): The Riot ID of the player (e.g., username#tagline).
    - `discord_id` (USER): The Discord ID of the player.

- `/remove_player`
  - Description: Remove a player from the team.
  - Options:
    - `riot_id` (STRING): The Riot ID of the player (e.g., username#tagline).

- `/send_voting_message`
  - Description: Send a voting message to a specific channel.

- `/team`
  - Description: Display team information.
  - Options:
    - `player_discord_id` (USER): The Discord ID of the player.

- `/list_teams`
  - Description: List all teams and their players.

- `/get_player_info`
  - Description: Get information about a player.
  - Options:
    - `discord_id` (USER): The Discord ID of the player.

### Staff Commands

- `/staff create_team`
  - Description: Create a new team.
  - Options:
    - `team_name` (STRING): The name of the team.
    - `captain_name` (STRING): The name of the team captain.
    - `captain_discord_id` (USER): The Discord ID of the team captain.
    - `team_channel` (CHANNEL): The channel to set for the team.
    - `team_role` (ROLE): The role to set for the team.

- `/staff delete_team`
  - Description: Delete a team.
  - Options:
    - `captain_discord_id` (USER): The Discord ID of the team captain.

- `/staff set_team_channel`
  - Description: Set the channel for the team.
  - Options:
    - `team_name` (STRING): The name of the team.
    - `channel_id` (CHANNEL): The channel to set for the team.

- `/staff set_captain`
  - Description: Set a new captain for the team.
  - Options:
    - `captain_discord_id` (USER): The Discord ID of the new team captain.
    - `team_name` (STRING): The name of the team.

- `/staff override_add`
  - Description: Add a player to the team.
  - Options:
    - `riot_id` (STRING): The Riot ID of the player.
    - `discord_id` (USER): The Discord ID of the player.
    - `captain_discord_id` (USER): The Discord ID of the team captain.

- `/staff override_remove`
  - Description: Remove a player from the team.
  - Options:
    - `player_discord_id` (USER): The Discord ID of the player.
    - `captain_discord_id` (USER): The Discord ID of the team captain.

- `/staff update_team_info`
  - Description: Update team information.
  - Options:
    - `team_name` (STRING): The current name of the team.
    - `new_team_name` (STRING): The new name for the team.
    - `new_captain_discord_id` (USER): The Discord ID of the new team captain.

- `/staff set_team_role`
  - Description: Assign a role to the team.
  - Options:
    - `team_name` (STRING): The name of the team.
    - `role_id` (ROLE): The role to assign to the team.

- `/staff set_riot_id`
  - Description: Set the Riot ID for a player.
  - Options:
    - `discord_id` (USER): The Discord ID of the player.
    - `new_riot_id` (STRING): The new Riot ID of the player.

## License

This project is licensed under the in-house license. See the [LICENSE](LICENSE) file for more information.

### File Descriptions

### bot.js

Main bot file that handles the bot's commands and interactions with Discord and OpenAI.

- **Imports and Setup**: Imports required libraries and modules, including Discord.js, OpenAI, Puppeteer, and Mongoose.
- **Environment Variables**: Loads environment variables for configuration.
- **MongoDB Connection**: Connects to the MongoDB database.
- **Schemas and Models**: Defines MongoDB schemas and models for Points and Predictions.
- **Discord Client**: Creates a new Discord client with specific intents and partials.
- **Logger**: Sets up logging using Winston.
- **Commands**: Defines the bot's commands and registers them with Discord.
- **Functions**: Includes functions for analyzing stats using OpenAI, fetching player stats, and handling various commands.
- **Command Handling**: Handles interaction events from Discord and executes appropriate command functions.

### src/commands/generalCommands.js

Contains general commands for the bot, such as checking if a player is a smurf, adding/removing players, and displaying team information.

### src/commands/predictionCommands.js

Handles commands related to predictions and point management.

### src/commands/staffCommands.js

Contains staff-level commands for managing teams and players, such as creating/deleting teams, setting team channels, and assigning roles.

### src/handlers/interactionHandler.js

Handles interactions with the bot, including executing commands and subcommands based on user interactions.

### src/handlers/mongoHandler.js

Handles MongoDB operations, including connecting to the database, managing teams and players, and defining schemas and models.

- **Schemas**: Defines Mongoose schemas for `Player` and `Team`.
- **Models**: Creates Mongoose models for `Player` and `Team`.
- **Database Operations**:
  - `getTeams`: Retrieves all teams with their players.
  - `getTeamPlayers`: Retrieves players of a specific team.
  - `createTeam`: Creates a new team.
  - `setTeamChannel`: Sets the channel ID for a team.
  - `setTeamRole`: Sets the role ID for a team.
  - `addPlayerToTeam`: Adds a player to a team.
  - `getTeamByCaptain`: Retrieves a team by the captain's Discord ID.
  - `getTeamByPlayer`: Retrieves a team by a player's Discord ID.
  - `setCaptain`: Sets the captain for a team.
  - `removePlayerFromTeam`: Removes a player from a team.
  - `deleteTeam`: Deletes a team.
  - `connect`: Connects to MongoDB using the provided URI.

### src/handlers/playerHandler.js

Handles player-related operations such as fetching player stats, sending voting messages, and adding/removing players to/from teams.

- **Environment Variables**: Loads environment variables for configuration.
- **Functions**:
  - `sendVotingMessage`: Sends a voting message to a specific channel.
  - `fetchPlayerStats`: Fetches player stats using Puppeteer.
  - `extractStats`: Extracts relevant stats from the fetched data.
  - `addPlayerToTeam`: Adds a player to a team.
  - `removePlayerFromTeam`: Removes a player from a team.
  - `handleTeamOperation`: Handles dynamic team operations like adding or removing players.
  - `setCaptain`: Sets a new team captain.
  - `deleteTeam`: Deletes a team.
  - `sendTestMessage`: Sends a test message for development purposes.

### src/models/Player.js

Defines the Mongoose schema and model for a Player.

### src/models/Point.js

Defines the Mongoose schema and model for a Point.

### src/models/Prediction.js

Defines the Mongoose schema and model for a Prediction.

### src/models/Team.js

Defines the Mongoose schema and model for a Team.

### src/utils/errorNoticeHelper.js

Helper function for sending error notices to the bot owner.

### src/utils/helperFunctions.js

Contains various helper functions to handle subcommands and check access.

- **checkAccess**: Checks if a user has the required permissions to execute a command.
- **handleSubcommand**: Handles the execution of subcommands.
- **handleTeamCreation**: Handles the creation of a new team.
- **handleTeamDeletion**: Handles the deletion of a team.
- **handleSetTeamChannel**: Sets the channel for a team.
- **handleSetCaptain**: Sets a new captain for a team.
- **handleOverrideAdd**: Adds a player to a team.
- **handleOverrideRemove**: Removes a player from a team.
- **handleUpdateTeamInfo**: Updates the information of a team.
- **handleSetTeamRole**: Sets the role for a team.
- **handleSetRiotId**: Sets the Riot ID for a player.

### src/utils/logger.js

Sets up logging using Winston.

### src/utils/openAiHelper.js

Contains helper functions for interacting with OpenAI's API.

- **analyzeStats**: Analyzes player stats using OpenAI's API.

## Contributing

Feel free to open issues or submit pull requests if you have any suggestions or improvements.

## Contact

For any questions or inquiries, please contact Devil920 on discord.
