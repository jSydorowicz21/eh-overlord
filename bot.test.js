const { Client, IntentsBitField, Partials } = require('discord.js');
const db = require('./src/handlers/mongoHandler');
const handleInteraction = require('./src/handlers/interactionHandler');
const generalCommands = require('./src/commands/generalCommands');
const staffCommands = require('./src/commands/staffCommands');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const logger = require('./src/utils/logger');
require('dotenv').config();

jest.mock('discord.js', () => {
    const originalModule = jest.requireActual('discord.js');
    return {
        ...originalModule,
        Client: jest.fn().mockImplementation(() => ({
            on: jest.fn(),
            login: jest.fn(),
        })),
        IntentsBitField: {
            Flags: {
                Guilds: 1,
                GuildMessages: 2,
                GuildMessageReactions: 4,
                MessageContent: 8,
                DirectMessages: 16,
            },
        },
        Partials: {
            Message: 'MESSAGE',
            Channel: 'CHANNEL',
        },
    };
});

jest.mock('./src/handlers/mongoHandler');
jest.mock('./src/handlers/interactionHandler');
jest.mock('./src/commands/generalCommands', () => []);
jest.mock('./src/commands/staffCommands', () => []);
jest.mock('@discordjs/rest');
jest.mock('discord-api-types/v10');
jest.mock('./src/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
}));

describe('bot.js', () => {
    let client;
    let restPutMock;

    beforeAll(() => {
        process.env.DISCORD_BOT_TOKEN = 'testToken';
        process.env.MONGODB_URI = 'mongodb://testUri';
        process.env.APPLICATION_ID = 'testApplicationId';

        client = new Client({
            intents: new IntentsBitField([
                IntentsBitField.Flags.Guilds,
                IntentsBitField.Flags.GuildMessages,
                IntentsBitField.Flags.GuildMessageReactions,
                IntentsBitField.Flags.MessageContent,
                IntentsBitField.Flags.DirectMessages,
            ]),
            partials: [Partials.Message, Partials.Channel]
        });

        restPutMock = jest.fn();
        REST.mockImplementation(() => ({
            setToken: jest.fn().mockReturnThis(),
            put: restPutMock,
        }));
    });

    it('should connect to MongoDB', async () => {
        await import('./bot');
        expect(db.connect).toHaveBeenCalledWith('mongodb://testUri');
        expect(logger.info).toHaveBeenCalledWith('Connected to MongoDB');
    });

    it('should refresh application commands', async () => {
        restPutMock.mockResolvedValue();
        await import('./bot');
        expect(logger.info).toHaveBeenCalledWith('Started refreshing application (/) commands.');
        expect(restPutMock).toHaveBeenCalledWith(
            Routes.applicationCommands('testApplicationId'),
            { body: [] }
        );
        expect(logger.info).toHaveBeenCalledWith('Successfully reloaded application (/) commands.');
    });

    it('should handle errors during command registration', async () => {
        const error = new Error('test error');
        restPutMock.mockRejectedValue(error);
        await import('./bot');
        expect(logger.error).toHaveBeenCalledWith(error);
    });

    it('should set up interaction handler', async () => {
        await import('./bot');
        expect(client.on).toHaveBeenCalledWith('interactionCreate', expect.any(Function));
        const interactionHandler = client.on.mock.calls[0][1];
        const mockInteraction = {};
        await interactionHandler(mockInteraction);
        expect(handleInteraction).toHaveBeenCalledWith(mockInteraction, client);
    });

    it('should log in the client', async () => {
        await import('./bot');
        expect(client.login).toHaveBeenCalledWith('testToken');
    });
});
