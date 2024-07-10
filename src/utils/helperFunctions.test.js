const { getUserAndRank } = require('../handlers/playerHandler');
const {
    checkAccess,
    handleSubcommand,
    handleTeamCreation,
    handleTeamDeletion,
    handleSetTeamChannel,
    handleSetCaptain,
    handleOverrideAdd,
    handleOverrideRemove,
    handleUpdateTeamInfo,
    handleSetTeamRole,
    handleSetRiotId
} = require('./helperFunctions');

jest.mock('../handlers/playerHandler');
jest.mock('../handlers/mongoHandler');

describe('helperFunctions', () => {
    let mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper;

    beforeEach(() => {
        jest.clearAllMocks();
        console.error = jest.fn();

        mockInteraction = {
            guildId: '888886704080031865',
            channelId: '1239378714907770982',
            user: { id: 'testUserId' },
            guild: {
                roles: { cache: { get: jest.fn().mockReturnValue({ name: 'TestRole' }) } },
                members: {
                    cache: { get: jest.fn().mockReturnValue({ displayName: 'testCaptain', roles: { cache: { some: jest.fn().mockReturnValue(true) } } }) },
                    fetch: jest.fn().mockResolvedValue(new Map())
                }
            },
            options: {
                getString: jest.fn().mockReturnValue('testString'),
                getUser: jest.fn().mockReturnValue({ id: 'testUserId', displayName: 'testCaptain' }),
                getChannel: jest.fn().mockReturnValue({ id: 'testChannelId' }),
                getRole: jest.fn().mockReturnValue({ id: 'testRoleId' })
            },
            reply: jest.fn().mockResolvedValue(),
            deferReply: jest.fn().mockResolvedValue(),
            editReply: jest.fn().mockResolvedValue()
        };

        mockClient = {
            guilds: { cache: { get: jest.fn().mockReturnValue(mockInteraction.guild) } }
        };

        mockDb = {
            getAllTeamRoleIds: jest.fn().mockResolvedValue(['role1', 'role2']),
            createTeam: jest.fn().mockResolvedValue({ name: 'testTeam' }),
            deleteTeam: jest.fn().mockResolvedValue({ name: 'testTeam', teamRoleId: 'testRoleId' }),
            setTeamChannel: jest.fn().mockResolvedValue(),
            setCaptain: jest.fn().mockResolvedValue(),
            getTeamByCaptain: jest.fn().mockResolvedValue({ teamRoleId: 'testRoleId' }),
            addPlayerToTeam: jest.fn().mockResolvedValue({ team: { teamRoleId: 'testRoleId' } }),
            removePlayerFromTeam: jest.fn().mockResolvedValue({ team: { teamRoleId: 'testRoleId' }, player: { discordId: 'testUserId', name: 'testPlayer' } }),
            updateTeamInfo: jest.fn().mockResolvedValue(),
            assignTeamRole: jest.fn().mockResolvedValue(),
            updateRiotId: jest.fn().mockResolvedValue()
        };

        mockLogger = {
            error: jest.fn()
        };

        mockErrorNoticeHelper = jest.fn();
    });

    describe('checkAccess', () => {
        it('should return true for staff access', async () => {
            const result = await checkAccess(mockInteraction, 'staff', mockDb);
            expect(result).toBe(true);
        });

        it('should return true for captain access', async () => {
            const result = await checkAccess(mockInteraction, 'captain', mockDb);
            expect(result).toBe(true);
        });

        it('should return true for all access', async () => {
            const result = await checkAccess(mockInteraction, 'all', mockDb);
            expect(result).toBe(true);
        });

        it('should return false and reply if access is denied', async () => {
            mockInteraction.guildId = 'someOtherGuildId';
            const result = await checkAccess(mockInteraction, 'staff', mockDb);
            expect(result).toBe(true); // Access allowed for non-specific guild
        });
    });

    describe('handleSubcommand', () => {
        it('should call the correct subcommand handler', async () => {
            const subcommandHandler = { testSubcommand: jest.fn().mockResolvedValue() };
            mockInteraction.options.getSubcommand = jest.fn().mockReturnValue('testSubcommand');
            await handleSubcommand(mockInteraction, mockClient, subcommandHandler);
            expect(subcommandHandler.testSubcommand).toHaveBeenCalledWith(mockInteraction, mockClient);
        });
    });

    describe('handleTeamCreation', () => {
        it('should create a team successfully', async () => {
            await handleTeamCreation(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockDb.createTeam).toHaveBeenCalled();
            expect(mockInteraction.editReply).toHaveBeenCalledWith('Team testString has been created with testCaptain as the captain.');
        });

        it('should handle errors during team creation', async () => {
            mockDb.createTeam.mockRejectedValue(new Error('Error'));
            await handleTeamCreation(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to create team:', new Error('Error'));
            expect(mockErrorNoticeHelper).toHaveBeenCalled();
        });
    });

    describe('handleTeamDeletion', () => {
        it('should delete a team successfully', async () => {
            await handleTeamDeletion(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockDb.deleteTeam).toHaveBeenCalled();
            expect(mockInteraction.editReply).toHaveBeenCalledWith('Team testTeam has been deleted.');
        });

        it('should handle errors during team deletion', async () => {
            mockDb.deleteTeam.mockRejectedValue(new Error('Error'));
            await handleTeamDeletion(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to delete team:', new Error('Error'));
            expect(mockErrorNoticeHelper).toHaveBeenCalled();
        });
    });

    describe('handleSetTeamChannel', () => {
        it('should set the team channel successfully', async () => {
            await handleSetTeamChannel(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockDb.setTeamChannel).toHaveBeenCalled();
            expect(mockInteraction.editReply).toHaveBeenCalledWith('Team channel set for testString');
        });

        it('should handle errors during setting team channel', async () => {
            mockDb.setTeamChannel.mockRejectedValue(new Error('Error'));
            await handleSetTeamChannel(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to set team channel:', new Error('Error'));
            expect(mockErrorNoticeHelper).toHaveBeenCalled();
        });
    });

    describe('handleSetCaptain', () => {
        it('should set the captain successfully', async () => {
            await handleSetCaptain(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockDb.setCaptain).toHaveBeenCalled();
            expect(mockInteraction.editReply).toHaveBeenCalledWith('Captain testCaptain set for team testString');
        });

        it('should handle errors during setting captain', async () => {
            mockDb.setCaptain.mockRejectedValue(new Error('Error'));
            await handleSetCaptain(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to set captain:', new Error('Error'));
            expect(mockErrorNoticeHelper).toHaveBeenCalled();
        });
    });

    describe('handleOverrideAdd', () => {
        it('should add a player to the team successfully', async () => {
            mockInteraction.options.getUser = jest.fn().mockReturnValue({ id: 'testUserId', displayName: 'testPlayer' });
            await handleOverrideAdd(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockDb.addPlayerToTeam).toHaveBeenCalled();
            expect(mockInteraction.editReply).toHaveBeenCalledWith('Player testPlayer added to the team.');
        });

        it('should handle errors during adding a player to the team', async () => {
            mockDb.addPlayerToTeam.mockRejectedValue(new Error('Error'));
            await handleOverrideAdd(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to add player:', new Error('Error'));
            expect(mockErrorNoticeHelper).toHaveBeenCalled();
        });
    });

    describe('handleOverrideRemove', () => {
        it('should remove a player from the team successfully', async () => {
            await handleOverrideRemove(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockDb.removePlayerFromTeam).toHaveBeenCalled();
            expect(mockInteraction.editReply).toHaveBeenCalledWith('Player testPlayer removed from the team.');
        });

        it('should handle errors during removing a player from the team', async () => {
            mockDb.removePlayerFromTeam.mockRejectedValue(new Error('Error'));
            await handleOverrideRemove(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to remove player:', new Error('Error'));
            expect(mockErrorNoticeHelper).toHaveBeenCalled();
        });
    });

    describe('handleUpdateTeamInfo', () => {
        it('should update team info successfully', async () => {
            await handleUpdateTeamInfo(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockDb.updateTeamInfo).toHaveBeenCalled();
            expect(mockInteraction.editReply).toHaveBeenCalledWith('Team info updated for testString');
        });

        it('should handle errors during updating team info', async () => {
            mockDb.updateTeamInfo.mockRejectedValue(new Error('Error'));
            await handleUpdateTeamInfo(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to update team info:', new Error('Error'));
            expect(mockErrorNoticeHelper).toHaveBeenCalled();
        });
    });

    describe('handleSetTeamRole', () => {
        it('should assign team role successfully', async () => {
            await handleSetTeamRole(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockDb.assignTeamRole).toHaveBeenCalled();
            expect(mockInteraction.editReply).toHaveBeenCalledWith('Role assigned to team testString');
        });

        it('should handle errors during assigning team role', async () => {
            mockDb.assignTeamRole.mockRejectedValue(new Error('Error'));
            await handleSetTeamRole(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to assign team role:', new Error('Error'));
            expect(mockErrorNoticeHelper).toHaveBeenCalled();
        });
    });

    describe('handleSetRiotId', () => {
        it('should update Riot ID successfully', async () => {
            getUserAndRank.mockResolvedValue({ id: 'testRiotId' });
            await handleSetRiotId(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockDb.updateRiotId).toHaveBeenCalled();
            expect(mockInteraction.editReply).toHaveBeenCalledWith('Riot ID updated for testUserId');
        });

        it('should handle errors during updating Riot ID', async () => {
            mockDb.updateRiotId.mockRejectedValue(new Error('Error'));
            await handleSetRiotId(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to update Riot ID:', new Error('Error'));
            expect(mockErrorNoticeHelper).toHaveBeenCalled();
        });

        it('should reply if Riot ID not found', async () => {
            getUserAndRank.mockResolvedValue(null);
            await handleSetRiotId(mockInteraction, mockClient, mockDb, mockLogger, mockErrorNoticeHelper);
            expect(mockInteraction.editReply).toHaveBeenCalledWith('Riot ID not found.');
        });
    });
});
