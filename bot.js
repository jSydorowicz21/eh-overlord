const { Client, IntentsBitField, Partials, REST, Routes } = require('discord.js');
require('dotenv').config();
const db = require('./src/handlers/mongoHandler');
const handleInteraction = require('./src/handlers/interactionHandler');
const generalCommands = require('./src/commands/generalCommands');
const staffCommands = require('./src/commands/staffCommands');
const logger = require('./src/utils/logger');

const botToken = process.env.DISCORD_BOT_TOKEN;

db.connect(process.env.MONGODB_URI).then(() => logger.info('Connected to MongoDB'));

const client = new Client({
    intents: new IntentsBitField([
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.DirectMessages,
    ]),
    partials: [Partials.Message, Partials.Channel]
});

const commands = [...generalCommands, ...staffCommands];
const rest = new REST({ version: '10' }).setToken(botToken);

(async () => {
    try {
        logger.info('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.APPLICATION_ID),
            { body: commands },
        );

        logger.info('Successfully reloaded application (/) commands.');
    } catch (error) {
        logger.error(error);
    }
})();

client.on('interactionCreate', async (interaction) => {
    await handleInteraction(interaction, client);
});

client.on('ready', () => {
    logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
});

client.on('error', (error) => {
    logger.error('Discord client error:', error);
});

client.login(botToken).catch(error => {
    logger.error('Failed to login:', error);
});


// const michaelId = '422163140956913664';
// try{
//     client.on('messageCreate', async (message) => {
//         if (message.author.id === michaelId) {
//             // If michael react with 📉 emoji
//             await message.react('📉');
//         }
//     });
// } catch (error) {
//     console.error(error);
// }
