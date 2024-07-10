const puppeteer = require('puppeteer-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const { EmbedBuilder, Colors, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const db = require('./mongoHandler');
const playerHandler = require('./playerHandler');
require('dotenv').config();

jest.mock('puppeteer-extra');
jest.mock('puppeteer-extra-plugin-stealth');
jest.mock('discord.js');
jest.mock('./mongoHandler');

describe('playerHandler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.error = jest.fn(); // Mock console.error to silence errors during testing
    });

    describe('fetchPlayerStats', () => {
        it('should fetch player stats successfully', async () => {
            const mockBrowser = {
                newPage: jest.fn().mockResolvedValue({
                    authenticate: jest.fn(),
                    goto: jest.fn(),
                    evaluate: jest.fn().mockResolvedValue({
                        data: [
                            { metadata: { name: 'Act 1' }, stats: { rank: { displayValue: 'Gold' } } }
                        ]
                    }),
                    close: jest.fn()
                }),
                close: jest.fn()
            };
            puppeteer.launch.mockResolvedValue(mockBrowser);

            const stats = await playerHandler.fetchPlayerStats('player#1234');

            expect(puppeteer.launch).toHaveBeenCalled();
            expect(stats).toEqual([{
                actName: 'Act 1',
                currentRank: 'Gold',
                peakRank: 'N/A',
                kdRatio: 'N/A',
                headshotPercentage: 'N/A',
                matchesPlayed: 'N/A',
                wins: 'N/A',
                winPercentage: 'N/A',
                KAST: 'N/A',
                ADR: 'N/A'
            }]);
        });

        it('should handle error while fetching player stats', async () => {
            const mockBrowser = {
                newPage: jest.fn().mockResolvedValue({
                    authenticate: jest.fn(),
                    goto: jest.fn(),
                    evaluate: jest.fn().mockRejectedValue(new Error('Error')),
                    close: jest.fn()
                }),
                close: jest.fn()
            };
            puppeteer.launch.mockResolvedValue(mockBrowser);

            await expect(playerHandler.fetchPlayerStats('player#1234')).rejects.toThrow('Error');
            expect(mockBrowser.close).toHaveBeenCalled();
        });
    });

    describe('sendVotingMessage', () => {
        it('should send a voting message successfully', async () => {
            const mockChannel = {
                send: jest.fn().mockResolvedValue({
                    createMessageComponentCollector: jest.fn().mockReturnValue({
                        on: jest.fn()
                    })
                })
            };
            const mockClient = {
                channels: {
                    cache: {
                        get: jest.fn().mockReturnValue(mockChannel)
                    }
                },
                guilds: {
                    cache: {
                        get: jest.fn().mockReturnValue({
                            members: {
                                cache: {
                                    get: jest.fn().mockReturnValue({
                                        roles: {
                                            add: jest.fn(),
                                            remove: jest.fn()
                                        }
                                    })
                                }
                            },
                            roles: {
                                cache: {
                                    get: jest.fn().mockReturnValue({
                                        id: 'roleId'
                                    })
                                }
                            }
                        })
                    }
                }
            };
            const mockPlayer = {
                riotId: 'player#1234',
                playerDiscordId: 'discordId',
                playerName: 'PlayerName'
            };
            const mockCaptain = { id: 'captainId' };
            const mockTeam = { name: 'TeamName', teamRoleId: 'roleId', teamChannelId: 'channelId' };

            await playerHandler.sendVotingMessage(mockPlayer, mockCaptain, mockTeam, null, 'channelId', 'trackerUrl', mockClient, 'add', 'guildId');

            expect(mockClient.channels.cache.get).toHaveBeenCalledWith('channelId');
            expect(mockChannel.send).toHaveBeenCalled();
        });

        it('should handle missing channel', async () => {
            const mockClient = {
                channels: {
                    cache: {
                        get: jest.fn().mockReturnValue(null)
                    }
                }
            };
            const mockPlayer = { riotId: 'player#1234' };
            const mockCaptain = { id: 'captainId' };
            const mockTeam = { name: 'TeamName' };

            await playerHandler.sendVotingMessage(mockPlayer, mockCaptain, mockTeam, null, 'channelId', 'trackerUrl', mockClient, 'add', 'guildId');

            expect(console.error).toHaveBeenCalledWith('Channel not found');
        });
    });

    describe('handleTeamOperation', () => {
        beforeAll(() => {
            global.verifyRiotId = jest.fn();
        });

        it('should handle team operation for adding a player', async () => {
            const mockInteraction = {
                deferReply: jest.fn(),
                options: {
                    getString: jest.fn().mockReturnValue('riotId'),
                    getUser: jest.fn().mockReturnValue({ id: 'playerDiscordId' })
                },
                user: { id: 'captainId' },
                guildId: 'guildId',
                editReply: jest.fn()
            };
            const mockClient = {
                guilds: {
                    cache: {
                        get: jest.fn().mockReturnValue({
                            members: {
                                cache: {
                                    get: jest.fn().mockReturnValue({
                                        roles: {
                                            add: jest.fn()
                                        }
                                    })
                                }
                            },
                            roles: {
                                cache: {
                                    get: jest.fn().mockReturnValue({
                                        id: 'roleId'
                                    })
                                }
                            }
                        })
                    }
                }
            };
            const mockTeam = { name: 'TeamName', teamRoleId: 'roleId', teamChannelId: 'channelId' };

            db.getTeamByCaptain.mockResolvedValue(mockTeam);
            global.verifyRiotId.mockResolvedValue(true);

            jest.spyOn(playerHandler, 'sendVotingMessage').mockResolvedValue(true);

            await playerHandler.handleTeamOperation(mockInteraction, 'add', mockClient);

            expect(mockInteraction.deferReply).toHaveBeenCalled();
            expect(playerHandler.sendVotingMessage).toHaveBeenCalled();
            expect(mockInteraction.editReply).toHaveBeenCalledWith('Request to add player riotId has been sent for approval.');
        });

        it('should handle invalid Riot ID', async () => {
            const mockInteraction = {
                deferReply: jest.fn(),
                options: {
                    getString: jest.fn().mockReturnValue('invalidRiotId')
                },
                editReply: jest.fn()
            };

            global.verifyRiotId.mockResolvedValue(false);

            await playerHandler.handleTeamOperation(mockInteraction, 'add', {});

            expect(mockInteraction.deferReply).toHaveBeenCalled();
            expect(mockInteraction.editReply).toHaveBeenCalledWith('Invalid Riot ID. Please verify the Riot ID and try again.');
        });
    });

    describe('verifyRiotId', () => {
        beforeAll(() => {
            global.getPlayerUID = jest.fn();
        });

        it('should verify Riot ID successfully', async () => {
            global.getPlayerUID.mockResolvedValue('playerUID');

            const result = await playerHandler.verifyRiotId('player#1234');

            expect(global.getPlayerUID).toHaveBeenCalledWith('player', '1234');
            expect(result).toBe(true);
        });

        it('should return false if Riot ID is invalid', async () => {
            global.getPlayerUID.mockResolvedValue(null);

            const result = await playerHandler.verifyRiotId('player#1234');

            expect(global.getPlayerUID).toHaveBeenCalledWith('player', '1234');
            expect(result).toBe(false);
        });
    });

    describe('getUserAndRank', () => {
        beforeAll(() => {
            global.getPlayerUID = jest.fn();
            global.getUserRank = jest.fn();
        });

        it('should get user and rank successfully', async () => {
            const mockPlayerUID = 'playerUID';
            const mockRank = { currentRank: 'Gold' };

            global.getPlayerUID.mockResolvedValue(mockPlayerUID);
            global.getUserRank.mockResolvedValue(mockRank);

            const result = await playerHandler.getUserAndRank('player#1234');

            expect(global.getPlayerUID).toHaveBeenCalledWith('player', '1234');
            expect(global.getUserRank).toHaveBeenCalledWith(mockPlayerUID);
            expect(result).toEqual(mockRank);
        });

        it('should return null if player UID not found', async () => {
            global.getPlayerUID.mockResolvedValue(null);

            const result = await playerHandler.getUserAndRank('player#1234');

            expect(global.getPlayerUID).toHaveBeenCalledWith('player', '1234');
            expect(result).toBeNull();
        });
    });

    // Add more test cases as needed for the other functions...
});
