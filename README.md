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

- `/check riot_id`: Check if a player is likely a smurf.
- `/add_player riot_id discord_id`: Add a player to the team.
- `/remove_player riot_id`: Remove a player from the team.
- `/send_voting_message`: Send a voting message to a specific channel.
- `/team player_discord_id`: Display team information.
- `/request_sub riot_id discord_id riot_id_being_replaced day time`: Request a substitute player.

### Staff Commands

- `/staff create_team team_name captain_name captain_discord_id team_channel`: Create a new team.
- `/staff delete_team captain_discord_id`: Delete a team.
- `/staff set_team_channel team_name channel_id`: Set the channel for the team.
- `/staff set_captain captain_discord_id team_name`: Set a new captain for the team.
- `/staff override_add riot_id discord_id captain_discord_id`: Add a player to the team.
- `/staff override_remove player_id captain_discord_id`: Remove a player from the team.

## License

This project is licensed under the in-house license. See the [LICENSE](LICENSE) file for more information.

## File Descriptions

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

### playerHandler.js

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

### mongoHandler.js

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

## Contributing

Feel free to open issues or submit pull requests if you have any suggestions or improvements.

## Contact

For any questions or inquiries, please contact Devil920 on discord.
