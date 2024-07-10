const { fetchPlayerStats, handleTeamOperation, sendTestMessage, verifyRiotId } = require("./playerHandler");
const db = require('./mongoHandler');
const analyzeStats = require('../utils/openAiHelper');
const logger = require('../utils/logger');
const errorNoticeHelper = require("../utils/errorNoticeHelper");
const { checkAccess, handleSubcommand } = require('../utils/helperFunctions');
const handleInteraction = require('./interactionHandler');

jest.mock('./playerHandler');
jest.mock('./mongoHandler');
jest.mock('../utils/openAiHelper');
jest.mock('../utils/logger');
jest.mock('../utils/errorNoticeHelper');
jest.mock('../utils/helperFunctions');

describe('handleInteraction', () => {
    let interaction, client;

    beforeEach(() => {
        interaction = {
            isCommand: jest.fn(),
            commandName: '',
            options: {
                getString: jest.fn(),
                getUser: jest.fn()
            },
            deferReply: jest.fn(),
            editReply: jest.fn(),
            user: {
                id: 'userId'
            },
            guildId: 'guildId'
        };
        client = {
            guilds: {
                cache: {
                    get: jest.fn(() => ({
                        members: {
                            cache: {
                                get: jest.fn(() => ({
                                    displayName: 'TestUser'
                                }))
                            }
                        }
                    }))
                }
            }
        };
    });

    it('should handle check command', async () => {
        interaction.isCommand.mockReturnValue(true);
        interaction.commandName = 'check';
        interaction.options.getString.mockReturnValue('riotId');
        checkAccess.mockResolvedValue(true);
        fetchPlayerStats.mockResolvedValue('stats');
        analyzeStats.mockResolvedValue('analysis');

        await handleInteraction(interaction, client);

        expect(interaction.deferReply).toHaveBeenCalled();
        expect(fetchPlayerStats).toHaveBeenCalledWith('riotId');
        expect(analyzeStats).toHaveBeenCalledWith('stats');
        expect(interaction.editReply).toHaveBeenCalledWith('Analysis of riotId:\nanalysis');
    });

    it('should handle add_player command', async () => {
        interaction.isCommand.mockReturnValue(true);
        interaction.commandName = 'add_player';
        checkAccess.mockResolvedValue(true);

        await handleInteraction(interaction, client);

        expect(checkAccess).toHaveBeenCalledWith(interaction, 'captain', db);
        expect(handleTeamOperation).toHaveBeenCalledWith(interaction, 'add', client);
    });

    it('should handle send_voting_message command', async () => {
        interaction.isCommand.mockReturnValue(true);
        interaction.commandName = 'send_voting_message';
        checkAccess.mockResolvedValue(true);

        await handleInteraction(interaction, client);

        expect(interaction.deferReply).toHaveBeenCalled();
        expect(sendTestMessage).toHaveBeenCalledWith(client);
        expect(interaction.editReply).toHaveBeenCalledWith('Voting message sent.');
    });

    it('should handle team command', async () => {
        interaction.isCommand.mockReturnValue(true);
        interaction.commandName = 'team';
        interaction.options.getUser.mockReturnValue({ id: 'playerDiscordId' });
        checkAccess.mockResolvedValue(true);
        db.getTeamByPlayer.mockResolvedValue({ name: 'TeamName', captain: 'CaptainName', players: [{ riotId: 'riotId1' }] });

        await handleInteraction(interaction, client);

        expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
        expect(db.getTeamByPlayer).toHaveBeenCalledWith('playerDiscordId');
        expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('Team TeamName with captain CaptainName'));
    });

    it('should handle list_teams command', async () => {
        interaction.isCommand.mockReturnValue(true);
        interaction.commandName = 'list_teams';
        checkAccess.mockResolvedValue(true);
        db.getTeams.mockResolvedValue([{ name: 'TeamName', captain: 'CaptainName', players: [{ riotId: 'riotId1' }] }]);

        await handleInteraction(interaction, client);

        expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
        expect(db.getTeams).toHaveBeenCalled();
        expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('**TeamName** (Captain: CaptainName)'));
    });

    it('should handle get_player_info command', async () => {
        interaction.isCommand.mockReturnValue(true);
        interaction.commandName = 'get_player_info';
        interaction.options.getUser.mockReturnValue({ id: 'playerDiscordId' });
        checkAccess.mockResolvedValue(true);
        db.getPlayerByDiscordId.mockResolvedValue({ name: 'PlayerName', riotId: 'riotId', team: { name: 'TeamName' } });

        await handleInteraction(interaction, client);

        expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
        expect(db.getPlayerByDiscordId).toHaveBeenCalledWith('playerDiscordId');
        expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('**PlayerName**\nRiot ID: riotId\nTeam: TeamName'));
    });

    it('should handle update_riot_id command', async () => {
        interaction.isCommand.mockReturnValue(true);
        interaction.commandName = 'update_riot_id';
        interaction.options.getString.mockReturnValue('newRiotId');
        checkAccess.mockResolvedValue(true);
        verifyRiotId.mockResolvedValue(true);

        await handleInteraction(interaction, client);

        expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
        expect(verifyRiotId).toHaveBeenCalledWith('newRiotId');
        expect(db.updateRiotId).toHaveBeenCalledWith('userId', 'newRiotId');
        expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('Riot ID updated for TestUser'));
    });

    it('should handle staff subcommands', async () => {
        interaction.isCommand.mockReturnValue(true);
        interaction.commandName = 'staff';
        checkAccess.mockResolvedValue(true);

        await handleInteraction(interaction, client);

        expect(handleSubcommand).toHaveBeenCalledWith(interaction, client, expect.any(Object));
    });

    it('should return if not a command', async () => {
        interaction.isCommand.mockReturnValue(false);

        await handleInteraction(interaction, client);

        expect(interaction.deferReply).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
        interaction.isCommand.mockReturnValue(true);
        interaction.commandName = 'check';
        interaction.options.getString.mockReturnValue('riotId');
        checkAccess.mockResolvedValue(true);
        fetchPlayerStats.mockRejectedValue(new Error('Test error'));

        await handleInteraction(interaction, client);

        expect(logger.error).toHaveBeenCalledWith('Failed to fetch or analyze stats:', expect.any(Error));
        expect(errorNoticeHelper).toHaveBeenCalledWith(expect.any(Error), client, interaction);
    });
});
