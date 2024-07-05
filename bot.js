const { Client, IntentsBitField, Partials, MessageEmbed, MessageActionRow, MessageButton, ApplicationCommand,
    EmbedBuilder, Colors, ButtonBuilder, ActionRowBuilder
} = require('discord.js');
const OpenAI = require("openai");
const puppeteer = require('puppeteer-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const ProxyRouter = require('@extra/proxy-router');
const mongoose = require('mongoose');
puppeteer.use(stealth());
const winston = require("winston");
const {REST} = require("@discordjs/rest");
const {Routes} = require("discord-api-types/v10");
const {ButtonStyle} = require("discord-api-types/v10");
require('dotenv').config();
const db = require('./src/mongoHandler');
const {sendTestMessage, fetchPlayerStats, handleTeamOperation, deleteTeam, setCaptain} = require("./src/playerHandler");

// Pulls Environment Variables
const botToken = process.env.DISCORD_BOT_TOKEN;
const openAiApiKey = process.env.OPENAI_API_KEY;
const mongoUri = process.env.MONGODB_URI;

// const mongoUri = process.env.MONGO_URI; // MongoDB connection URI

db.connect(mongoUri).then(r => console.log('Connected to MongoDB'));



// MongoDB Connection
// mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

// Define Schemas
const pointSchema = new mongoose.Schema({
    userId: String,
    balance: Number
});

const predictionSchema = new mongoose.Schema({
    predictionId: String,
    description: String,
    options: Map,
    status: String
});

// Define Models
const Point = mongoose.model('Point', pointSchema);
const Prediction = mongoose.model('Prediction', predictionSchema);

// Create a new Discord client
const client = new Client({
    intents: new IntentsBitField([
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.MessageContent
    ]),
    partials: [Partials.Message, Partials.Channel]
});

// Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.File({ filename: 'bot-errors.log', level: 'error' }),
        new winston.transports.File({ filename: 'bot-general.log' }),
    ],
});

const commands = [
    {
        name: 'check',
        description: 'Check if a player is likely a smurf',
        options: [
            {
                type: 3, // Type 3 corresponds to STRING
                name: 'riot_id',
                description: 'The Riot ID of the player (e.g., username#tagline)',
                required: true
            }
        ]
    },
    {
        name: 'add_player',
        description: 'Add a player to the team',
        options: [
            {
                type: 3,
                name: 'riot_id',
                description: 'The Riot ID of the player (e.g., username#tagline)',
                required: true
            },
            {
                type: 6,
                name: 'discord_id',
                description: 'The Discord ID of the player',
                required: true
            }
        ]
    },
    {
        name: 'send_voting_message',
        description: 'Send a voting message to a specific channel',
    },
    {
        name: 'team',
        description: 'Display team information',
        options: [
            {
                type: 6,
                name: 'player_discord_id',
                description: 'The Discord ID of the player',
                required: true
            }
        ]
    },
    {
        name: 'remove_player',
        description: 'Remove a player from the team',
        options: [
            {
                type: 3,
                name: 'riot_id',
                description: 'The Riot ID of the player (e.g., username#tagline)',
                required: true
            }
        ]
    },
    {
        name: 'request_sub',
        description: 'Request a substitute player',
        options: [
            {
                type: 3,
                name: 'riot_id',
                description: 'The Riot ID of the player (e.g., username#tagline)',
                required: true
            },
            {
                type: 6,
                name: 'discord_id',
                description: 'The Discord ID of the player',
                required: true
            },
            {
                type: 3,
                name: 'riot_id_being_replaced',
                description: 'The Riot ID of the player being replaced',
                required: true
            },
            {
                type: 3,
                name: 'day',
                description: 'The day of the sub (e.g., 07-04-2024)',
                required: true
            },
            {
                type: 3,
                name: 'time',
                description: 'The time of the day (e.g., 7:00 PM EST)',
                required: true
            }
        ]
    },
    {
        name: 'list_teams',
        description: 'List all teams with their captains and players',
    },
    {
        name: 'get_player_info',
        description: 'Get detailed information about a specific player',
        options: [
            {
                type: 6,
                name: 'discord_id',
                description: 'The Discord ID of the player',
                required: true
            }
        ]
    },
    {
        name: 'staff',
        description: 'Staff level commands',
        options: [
            {
                type: 1, // Type 1 corresponds to SUB_COMMAND
                name: 'create_team',
                description: 'Create a new team',
                options: [
                    {
                        type: 3,
                        name: 'team_name',
                        description: 'The name of the team',
                        required: true
                    },
                    {
                        type: 3,
                        name: 'captain_name',
                        description: 'The name of the team captain',
                        required: true
                    },
                    {
                        type: 6,
                        name: 'captain_discord_id',
                        description: 'The Discord ID of the team captain',
                        required: true
                    },
                    {
                        type: 7,
                        name: 'team_channel',
                        description: 'The channel to set for the team',
                        required: true
                    },
                    {
                        type: 8,
                        name: 'team_role',
                        description: 'The role to assign to the team',
                        required: true
                    },
                ]
            },
            {
                type: 1,
                name: 'delete_team',
                description: 'Delete a team',
                options: [
                    {
                        type: 6,
                        name: 'captain_discord_id',
                        description: 'The Discord ID of the team captain',
                        required: true
                    }
                ]
            },
            {
                type: 1,
                name: 'set_team_channel',
                description: 'Set the channel for the team',
                options: [
                    {
                        type: 3,
                        name: 'team_name',
                        description: 'The name of the team',
                        required: true
                    },
                    {
                        type: 7,
                        name: 'channel_id',
                        description: 'The channel to set for the team',
                        required: true
                    }
                ]
            },
            {
                type: 1,
                name: 'set_captain',
                description: 'Set a new captain for the team',
                options: [
                    {
                        type: 6,
                        name: 'captain_discord_id',
                        description: 'The Discord ID of the new team captain',
                        required: true
                    },
                    {
                        type: 3,
                        name: 'team_name',
                        description: 'The name of the team',
                        required: true
                    }
                ]
            },
            {
                type: 1,
                name: 'override_add',
                description: 'Add a player to the team',
                options: [
                    {
                        type: 3,
                        name: 'riot_id',
                        description: 'The Riot ID of the player',
                        required: true
                    },
                    {
                        type: 6,
                        name: 'discord_id',
                        description: 'The Discord ID of the player',
                        required: true
                    },
                    {
                        type: 6,
                        name: 'captain_discord_id',
                        description: 'The Discord ID of the team captain',
                        required: true
                    }
                ]
            },
            {
                type: 1,
                name: 'override_remove',
                description: 'Remove a player from the team',
                options: [
                    {
                        type: 6,
                        name: 'player_discord_id',
                        description: 'The Discord ID of the player',
                        required: true
                    },
                    {
                        type: 6,
                        name: 'captain_discord_id',
                        description: 'The Discord ID of the team captain',
                        required: true
                    }
                ]
            },
            {
                type: 1,
                name: 'update_team_info',
                description: 'Update team information',
                options: [
                    {
                        type: 3,
                        name: 'team_name',
                        description: 'The name of the team',
                        required: true
                    },
                    {
                        type: 3,
                        name: 'new_team_name',
                        description: 'The new name of the team',
                        required: false
                    },
                    {
                        type: 6,
                        name: 'new_captain_discord_id',
                        description: 'The Discord ID of the new team captain',
                        required: false
                    }
                ]
            },
            {
                type: 1,
                name: 'set_team_role',
                description: 'Set the role for a team',
                options: [
                    {
                        type: 3,
                        name: 'team_name',
                        description: 'The name of the team',
                        required: true
                    },
                    {
                        type: 8,
                        name: 'role_id',
                        description: 'The role to assign to the team',
                        required: true
                    }
                ]
            }
        ]
    },
// {
    //     name: 'start_prediction',
    //     description: 'Start a new prediction',
    //     options: [
    //         {
    //             type: 3,
    //             name: 'question',
    //             description: 'The question for the prediction',
    //             required: true
    //         },
    //         {
    //             type: 3,
    //             name: 'options',
    //             description: 'Comma-separated list of options',
    //             required: true
    //         }
    //     ]
	// },
    // {
    //     name: 'end_prediction',
    //     description: 'End the current prediction'
    // },
    // {
    //     name: 'predict',
    //     description: 'Predict the outcome of a prediction',
    //     options: [
    //         {
    //             type: 3,
    //             name: 'prediction_id',
    //             description: 'The ID of the prediction',
    //             required: true
    //         },
    //         {
    //             type: 3,
    //             name: 'option',
    //             description: 'The option to predict',
    //             required: true
    //         }
    //     ]
    // },
    // {
    //     name: 'leaderboard',
    //     description: 'Display the leaderboard for predictions'
    // }
];

const rest = new REST({ version: '10' }).setToken(botToken);

// Registering commands
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.APPLICATION_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// rest.put(Routes.applicationGuildCommands(process.env.APPLICATION_ID, '888886704080031865'), { body: commands })
//     .then(() => console.log('Successfully registered application commands.'))
//     .catch(console.error);
const openai = new OpenAI({ apiKey: openAiApiKey });

// Function to analyze stats with OpenAI assistant
const analyzeStats = async (stats) => {
    const prompt = process.env.OPENAPI_PROMPT + `\n ${JSON.stringify(stats)}\nRespond with percentages for smurfing and boosted, followed by brief explanations of the key factors for each.`;


    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: 'You are an assistant specialized in detecting smurfs in Valorant.' },
            { role: 'system', content: 'You will be tasked with deciding whether a player is smurfing or rank sitting (avoiding playing games to be able to play in the league).' },
            { role: 'system', content: 'You must respond briefly as there is a 1000 character limit to your responses. Provide only a few brief reasons for your ratings. Do not give a smurfing and boosted percent for each act, just an overall rating.'  },
            { role: 'user', content: prompt }
        ]
    });

    console.log(response.choices[0].message.content.trim());

    return response.choices[0].message.content.trim();
};

// Bot command handling
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'check') {
        if (!checkAccess(interaction, 'staff')) {
            await interaction.reply('You do not have permission to use this command.');
            return;
        }
        await interaction.deferReply(); // Acknowledge interaction
        const riotId = interaction.options.getString('riot_id');
        try {
            const stats = await fetchPlayerStats(riotId);
            const analysis = await analyzeStats(stats);
            await interaction.editReply(`Analysis of ${riotId}:\n${analysis}`);
        } catch (error) {
            console.error('Failed to fetch or analyze stats:', error);
            await interaction.editReply('There was an error fetching the stats or analyzing them.');
        }
    }

    if (interaction.commandName === 'add_player' || interaction.commandName === 'remove_player') {
        try {
            if (!checkAccess(interaction, 'captain')) {
                await interaction.reply('You do not have permission to use this command.');
                return;
            }
            const type = interaction.commandName === 'add_player' ? 'add' : 'remove';
            await handleTeamOperation(interaction, type, client);
        } catch (error) {
            console.error('Failed to add or remove player:', error);
            await interaction.editReply(`There was an error adding or removing the player. <@138673796675534848>, please check the logs.`);
        }
    }

    if (interaction.commandName === 'send_voting_message') {
        if (!checkAccess(interaction, 'staff')) {
            await interaction.reply('You do not have permission to use this command.');
            return;
        }
        await interaction.deferReply(); // Acknowledge interaction
        await sendTestMessage(client);
        await interaction.editReply('Voting message sent.');
    }

    if (interaction.commandName === 'team') {
        try {
            if (!checkAccess(interaction, 'all')) {
                await interaction.reply('You do not have permission to use this command.');
                return;
            }
            await interaction.deferReply(); // Acknowledge interaction
            const playerDiscordId = interaction.options.getUser('player_discord_id').id;
            const team = await db.getTeamByPlayer(playerDiscordId);
            if (team) {
                await interaction.editReply(`Team ${team.name} with captain ${team.captain} has the following players: ${team.players.map(player => ` [${player.riotId}](https://tracker.gg/valorant/profile/riot/${encodeURIComponent(player.riotId)}/overview?season=all)`).join(', ')}`);
            } else {
                await interaction.editReply('No team found for the given captain.');
            }
        } catch (error) {
            console.error('Failed to get team:', error);
            await interaction.editReply(`There was an error getting the team. <@138673796675534848>, please check the logs.`);
        }
    }

    if (interaction.commandName === 'list_teams') {
        try {
            await interaction.deferReply(); // Acknowledge interaction
            const teams = await db.getTeams();
            const teamInfo = teams.map(team =>
                `**${team.name}** (Captain: ${team.captain})\nPlayers: ${team.players.map(player => player.riotId).join(', ')}`
            ).join('\n\n');
            await interaction.editReply(teamInfo || 'No teams found.');
        } catch (error) {
            console.error('Failed to list teams:', error);
            await interaction.editReply('There was an error listing the teams.');
        }
    }

    if (interaction.commandName === 'get_player_info') {
        try {
            await interaction.deferReply(); // Acknowledge interaction
            const playerDiscordId = interaction.options.getUser('discord_id').id;
            const player = await db.getPlayerByDiscordId(playerDiscordId);
            if (player) {
                await interaction.editReply(`**${player.name}**\nRiot ID: ${player.riotId}\nTeam: ${player.team ? player.team.name : 'None'}`);
            } else {
                await interaction.editReply('Player not found.');
            }
        } catch (error) {
            console.error('Failed to get player info:', error);
            await interaction.editReply('There was an error getting the player info.');
        }
    }

    if (interaction.commandName === 'staff') {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'create_team') {
            try {
                if (!checkAccess(interaction, 'staff')) {
                    await interaction.reply('You do not have permission to use this command.');
                    return;
                }
                await interaction.deferReply(); // Acknowledge interaction
                const teamName = interaction.options.getString('team_name');
                const captainName = interaction.options.getString('captain_name');
                const captainDiscordId = interaction.options.getUser('captain_discord_id').id;
                const teamChannel = interaction.options.getChannel('team_channel');
                const teamRole = interaction.options.getRole('team_role');
                const team = await db.createTeam(teamName, captainDiscordId, captainName, teamChannel.id, teamRole.id);

                // Assign team role to captain
                const guild = interaction.guild;
                const member = guild.members.cache.get(captainDiscordId);
                if (member) {
                    await member.roles.add(guild.roles.cache.get(teamRole.id));
                }

                await interaction.editReply(`Team ${teamName} has been created with ${captainName} as the captain.`);
            } catch (error) {
                console.error('Failed to create team:', error);
                await interaction.editReply(`There was an error creating the team. <@138673796675534848>, please check the logs.`);
            }
        }

        if (subcommand === 'delete_team') {
            try {
                if (!checkAccess(interaction, 'staff')) {
                    await interaction.reply('You do not have permission to use this command.');
                    return;
                }
                await interaction.deferReply(); // Acknowledge interaction
                const captainId = interaction.options.getUser('captain_discord_id').id;
                const team = await deleteTeam(captainId);

                // Remove team role from all team members
                const guild = interaction.guild;
                const teamRoleId = team.teamRoleId;
                const members = await guild.members.fetch();
                members.forEach(async member => {
                    if (member.roles.cache.has(teamRoleId)) {
                        await member.roles.remove(guild.roles.cache.get(teamRoleId));
                    }
                });

                await interaction.editReply(`Team ${team.name} has been deleted.`);
            } catch (error) {
                console.error('Failed to delete team:', error);
                await interaction.editReply(`There was an error deleting the team. <@138673796675534848>, please check the logs.`);
            }
        }

        if (subcommand === 'set_team_channel') {
            try {
                if (!checkAccess(interaction, 'staff')) {
                    await interaction.reply('You do not have permission to use this command.');
                    return;
                }
                await interaction.deferReply(); // Acknowledge interaction
                const teamName = interaction.options.getString('team_name');
                const channelId = interaction.options.getChannel('channel_id').id;
                await db.setTeamChannel(teamName, channelId);
                await interaction.editReply(`Team channel set for ${teamName}`);
            } catch (error) {
                console.error('Failed to set team channel:', error);
                await interaction.editReply(`There was an error setting the team channel. <@138673796675534848>, please check the logs.`);
            }
        }

        if (subcommand === 'set_captain') {
            try {
                if (!checkAccess(interaction, 'staff')) {
                    await interaction.reply('You do not have permission to use this command.');
                    return;
                }
                await interaction.deferReply(); // Acknowledge interaction
                const newCaptainDiscord = interaction.options.getUser('captain_discord_id');
                const teamName = interaction.options.getString('team_name');
                await setCaptain(newCaptainDiscord, teamName);

                // Assign team role to new captain
                const guild = interaction.guild;
                const member = guild.members.cache.get(newCaptainDiscord.id);
                const team = await db.getTeamByCaptain(newCaptainDiscord.id);
                if (member && team) {
                    await member.roles.add(guild.roles.cache.get(team.teamRoleId));
                }

                await interaction.editReply(`Captain ${newCaptainDiscord.displayName} set for team ${teamName}`);
            } catch (error) {
                console.error('Failed to set captain:', error);
                await interaction.editReply(`There was an error setting the captain. <@138673796675534848>, please check the logs.`);
            }
        }

        if (subcommand === 'override_add'){
            try{
                if (!checkAccess(interaction, 'staff')) {
                    await interaction.reply('You do not have permission to use this command.');
                    return;
                }
                await interaction.deferReply(); // Acknowledge interaction
                const riotId = interaction.options.getString('riot_id');
                const discordId = interaction.options.getUser('discord_id').id;
                const playerName = riotId.split('#')[0];
                const captainDiscordId = interaction.options.getUser('captain_discord_id').id;
                const player = await db.addPlayerToTeam(riotId, discordId, playerName, captainDiscordId);

                // Assign team role to the player
                const guild = interaction.guild;
                const member = guild.members.cache.get(discordId);
                if (member) {
                    const role = guild.roles.cache.get(player.team.teamRoleId)
                    await member.roles.add(role);
                }

                const nickName = member ? member.displayName : playerName;
                await interaction.editReply(`Player ${nickName} added to the team.`);
            }
            catch (error) {
                console.error('Failed to add player:', error);
                await interaction.editReply(`There was an error adding the player. <@138673796675534848>, please check the logs.`);
            }
        }

        if (subcommand === 'override_remove'){
            try {
                if (!checkAccess(interaction, 'staff')) {
                    await interaction.reply('You do not have permission to use this command.');
                    return;
                }
                await interaction.deferReply(); // Acknowledge interaction
                const playerDiscordId = interaction.options.getUser('player_discord_id').id;
                const captainDiscordId = interaction.options.getUser('captain_discord_id').id;
                const response = await db.removePlayerFromTeam(playerDiscordId, captainDiscordId);

                // Find the guild member
                const guild = interaction.guild;
                const member = guild.members.cache.get(response.player.discordId);

                if (member) {
                    // Remove the team role from the player
                    const teamRoleId = response.team.teamRoleId;
                    const role = guild.roles.cache.get(teamRoleId);
                    if (role) await member.roles.remove(role);
                }

                const nickName = member ? member.displayName : response.player.name;
                await interaction.editReply(`Player ${nickName} removed from the team.`);
            } catch (error) {
                console.error('Failed to remove player:', error);
                await interaction.editReply(`There was an error removing the player. <@138673796675534848>, please check the logs.`);
            }
        }

        if (subcommand === 'update_team_info') {
            try {
                if (!checkAccess(interaction, 'staff')) {
                    await interaction.reply('You do not have permission to use this command.');
                    return;
                }
                await interaction.deferReply(); // Acknowledge interaction
                const teamName = interaction.options.getString('team_name');
                const newTeamName = interaction.options.getString('new_team_name');
                const newCaptainDiscordId = interaction.options.getUser('new_captain_discord_id').id;
                await db.updateTeamInfo(teamName, newTeamName, newCaptainDiscordId);
                await interaction.editReply(`Team info updated for ${teamName}`);
            } catch (error) {
                console.error('Failed to update team info:', error);
                await interaction.editReply('There was an error updating the team info.');
            }
        }

        if (subcommand === 'set_team_role') {
            try {
                if (!checkAccess(interaction, 'staff')) {
                    await interaction.reply('You do not have permission to use this command.');
                    return;
                }
                await interaction.deferReply(); // Acknowledge interaction
                const teamName = interaction.options.getString('team_name');
                const roleId = interaction.options.getRole('role_id').id;
                await db.assignTeamRole(teamName, roleId);
                await interaction.editReply(`Role assigned to team ${teamName}`);
            } catch (error) {
                console.error('Failed to assign team role:', error);
                await interaction.editReply('There was an error assigning the team role.');
            }
        }
    }
});



function checkAccess(interaction, type) {
    const allowedChannelIds = ['1239378714907770982', '1239378714907770982', '1160694040887578664'];
    const staffRoleNames = ['M2TheMichael', 'Besties (SuperMods)', 'Moderator', 'HEH Admin', 'MEH Admin', 'LEH Admin'];
    const captainRoleNames = ['High Elo Captains', 'Low Elo Captains', 'Mid Elo Captains'];
    const botOwnerId = '138673796675534848';

    let roles;
    if (type === 'staff') {
        roles = staffRoleNames;
    }
    else if (type === 'captain') {
        roles = captainRoleNames;
        roles.push(...staffRoleNames);
    }
    else if (type === 'all') {
        roles = staffRoleNames;
        roles.push(...captainRoleNames);
    }


    if (interaction.guildId === '888886704080031865') {
        // Check if interaction is in allowed channels
        if (allowedChannelIds.includes(interaction.channelId)) {
            return true;
        }

        // Check if user is the bot owner
        if (interaction.user.id === botOwnerId) {
            return true;
        }

        // Check if user has any of the allowed roles
        const member = interaction.guild.members.cache.get(interaction.user.id);
        if (member) {
            const hasRole = roles.some(roleName => member.roles.cache.some(role => role.name === roleName));
            if (hasRole) {
                return true;
            }
        }
    }
    else {
        return true;
    }

    return false;
}

// const [predictionId, winningOption] = args;
// const prediction = predictions[predictionId];
// if (!prediction || prediction.status !== 'open') return message.reply('Invalid prediction ID or already resolved.');
//
// const winners = prediction.options[winningOption];
// const totalPointsBet = Object.values(prediction.options).flat().reduce((sum, bet) => sum + bet.amount, 0);
// const totalPointsWon = winners.reduce((sum, bet) => sum + bet.amount, 0);
//
// winners.forEach(winner => {
//     const winnings = (winner.amount / totalPointsWon) * totalPointsBet;
//     points[winner.user].balance += winnings;
// });
//
// prediction.status = 'closed';
// savePoints();
// savePredictions();
// message.channel.send(`Prediction Resolved! Winning Option: ${winningOption}`);

// Log in to Discord
client.login(botToken);
