const mongoose = require('mongoose');
const Player = require('../models/Player');
const Team = require('../models/Team');
const db = require('./mongoHandler');

jest.mock('../models/Player');
jest.mock('../models/Team');

describe('db module', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should get all teams with players', async () => {
        const mockTeams = [{ name: 'Team1', players: [] }];
        Team.find.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTeams) });

        const teams = await db.getTeams();

        expect(Team.find).toHaveBeenCalled();
        expect(teams).toEqual(mockTeams);
    });

    it('should get players of a team', async () => {
        const mockPlayers = [{ name: 'Player1' }];
        Team.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue({ players: mockPlayers }) });

        const players = await db.getTeamPlayers('teamId');

        expect(Team.findById).toHaveBeenCalledWith('teamId');
        expect(players).toEqual(mockPlayers);
    });

    it('should create a new team', async () => {
        const mockTeam = { save: jest.fn().mockResolvedValue(true) };
        Team.mockImplementation(() => mockTeam);

        const team = await db.createTeam('TeamName', 'CaptainDiscordId', 'CaptainName', 'ChannelId', 'RoleId');

        expect(Team).toHaveBeenCalledWith({
            name: 'TeamName',
            captain: 'CaptainName',
            captainDiscordId: 'CaptainDiscordId',
            teamChannelId: 'ChannelId',
            teamRoleId: 'RoleId',
            players: [],
        });
        expect(mockTeam.save).toHaveBeenCalled();
        expect(team).toEqual(mockTeam);
    });

    it('should set team channel', async () => {
        const mockTeam = { teamChannelId: 'OldChannelId', save: jest.fn().mockResolvedValue(true) };
        Team.findOne.mockResolvedValue(mockTeam);

        await db.setTeamChannel('TeamName', 'NewChannelId');

        expect(Team.findOne).toHaveBeenCalledWith({ name: 'TeamName' });
        expect(mockTeam.teamChannelId).toBe('NewChannelId');
        expect(mockTeam.save).toHaveBeenCalled();
    });

    it('should set team role', async () => {
        const mockTeam = { teamRoleId: 'OldRoleId', save: jest.fn().mockResolvedValue(true) };
        Team.findOne.mockResolvedValue(mockTeam);

        await db.setTeamRole('TeamName', 'NewRoleId');

        expect(Team.findOne).toHaveBeenCalledWith({ name: 'TeamName' });
        expect(mockTeam.teamRoleId).toBe('NewRoleId');
        expect(mockTeam.save).toHaveBeenCalled();
    });

    it('should add a player to a team', async () => {
        const mockTeam = { id: 'teamId', players: [], save: jest.fn().mockResolvedValue(true) };
        const mockPlayer = {
            id: 'playerId',
            team: null,
            save: jest.fn().mockResolvedValue(true),
            populate: jest.fn().mockResolvedValue(true)
        };
        Team.findOne.mockResolvedValue(mockTeam);
        Player.findOne.mockImplementation(() => ({
            ...mockPlayer,
            populate: jest.fn().mockResolvedValue(mockPlayer)
        }));
        Player.mockImplementation(() => mockPlayer);

        const player = await db.addPlayerToTeam('riotId', 'discordId', 'playerName', 'captainDiscordId');

        expect(Team.findOne).toHaveBeenCalledWith({ captainDiscordId: 'captainDiscordId' });
        expect(Player.findOne).toHaveBeenCalledWith({ discordId: 'discordId' });
        expect(mockTeam.players).toContain('playerId');
        expect(mockTeam.save).toHaveBeenCalled();
        expect(mockPlayer.save).toHaveBeenCalled();
        expect(player).toEqual(mockPlayer);
    });

    it('should throw error if player already in a team', async () => {
        const mockTeam = { players: [], save: jest.fn().mockResolvedValue(true) };
        const mockPlayer = {
            team: 'someTeamId',
            save: jest.fn().mockResolvedValue(true),
            populate: jest.fn().mockResolvedValue(true)
        };
        Team.findOne.mockResolvedValue(mockTeam);
        Player.findOne.mockImplementation(() => ({
            ...mockPlayer,
            populate: jest.fn().mockResolvedValue(mockPlayer)
        }));

        await expect(db.addPlayerToTeam('riotId', 'discordId', 'playerName', 'captainDiscordId')).rejects.toThrow('Player already in a team');
    });

    it('should get team by captain id', async () => {
        const mockTeam = { name: 'Team1', players: [] };
        Team.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTeam) });

        const team = await db.getTeamByCaptain('captainId');

        expect(Team.findOne).toHaveBeenCalledWith({ captainDiscordId: 'captainId' });
        expect(team).toEqual(mockTeam);
    });

    it('should get team by player id', async () => {
        const mockTeam = { name: 'Team1', players: [] };
        const mockPlayer = {
            team: { populate: jest.fn().mockResolvedValue(mockTeam) },
            populate: jest.fn().mockResolvedValue({ team: mockTeam })
        };
        Player.findOne.mockImplementation(() => ({
            ...mockPlayer,
            populate: jest.fn().mockResolvedValue(mockPlayer)
        }));

        const team = await db.getTeamByPlayer('discordId');

        expect(Player.findOne).toHaveBeenCalledWith({ discordId: 'discordId' });
        expect(team).toEqual(mockTeam);
    });

    it('should set captain', async () => {
        const mockTeam = { captainId: 'oldCaptainId', captain: 'oldCaptainName', save: jest.fn().mockResolvedValue(true) };
        Team.findOne.mockResolvedValue(mockTeam);

        await db.setCaptain('newCaptainId', 'newCaptainName', 'TeamName');

        expect(Team.findOne).toHaveBeenCalledWith({ name: 'TeamName' });
        expect(mockTeam.captainId).toBe('newCaptainId');
        expect(mockTeam.captain).toBe('newCaptainName');
        expect(mockTeam.save).toHaveBeenCalled();
    });

    it('should remove player from team', async () => {
        const mockTeam = { players: [{ discordId: 'playerDiscordId' }], save: jest.fn().mockResolvedValue(true) };
        const mockPlayer = { team: null, save: jest.fn().mockResolvedValue(true) };
        Team.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTeam) });
        Player.findOne.mockResolvedValue(mockPlayer);

        const result = await db.removePlayerFromTeam('playerDiscordId', 'captainId');

        expect(Team.findOne).toHaveBeenCalledWith({ captainDiscordId: 'captainId' });
        expect(Player.findOne).toHaveBeenCalledWith({ discordId: 'playerDiscordId' });
        expect(mockTeam.players).toHaveLength(0);
        expect(mockTeam.save).toHaveBeenCalled();
        expect(mockPlayer.team).toBeNull();
        expect(mockPlayer.save).toHaveBeenCalled();
        expect(result.team).toEqual(mockTeam);
        expect(result.player).toEqual(mockPlayer);
    });

    it('should get all team role ids', async () => {
        const mockTeams = [{ teamRoleId: 'role1' }, { teamRoleId: 'role2' }];
        Team.find.mockResolvedValue(mockTeams);

        const roleIds = await db.getAllTeamRoleIds();

        expect(Team.find).toHaveBeenCalled();
        expect(roleIds).toEqual(['role1', 'role2']);
    });

    it('should update riot id of a player', async () => {
        const mockPlayer = { riotId: 'oldRiotId', save: jest.fn().mockResolvedValue(true) };
        Player.findOne.mockResolvedValue(mockPlayer);

        await db.updateRiotId('discordId', 'newRiotId');

        expect(Player.findOne).toHaveBeenCalledWith({ discordId: 'discordId' });
        expect(mockPlayer.riotId).toBe('newRiotId');
        expect(mockPlayer.save).toHaveBeenCalled();
    });

    it('should delete a team and its players', async () => {
        const mockTeam = { _id: 'teamId' };
        Team.findOneAndDelete.mockResolvedValue(mockTeam);
        Player.deleteMany.mockResolvedValue(true);

        const team = await db.deleteTeam('captainId');

        expect(Team.findOneAndDelete).toHaveBeenCalledWith({ captainDiscordId: 'captainId' });
        expect(Player.deleteMany).toHaveBeenCalledWith({ team: 'teamId' });
        expect(team).toEqual(mockTeam);
    });

    it('should throw error if team not found for deletion', async () => {
        Team.findOneAndDelete.mockResolvedValue(null);

        await expect(db.deleteTeam('captainId')).rejects.toThrow('Team not found');
    });

    it('should get player by discord id', async () => {
        const mockPlayer = { name: 'Player1', team: null };
        Player.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockPlayer) });

        const player = await db.getPlayerByDiscordId('discordId');

        expect(Player.findOne).toHaveBeenCalledWith({ discordId: 'discordId' });
        expect(player).toEqual(mockPlayer);
    });

    it('should update team info', async () => {
        const mockTeam = { name: 'oldTeamName', captainDiscordId: 'oldCaptainDiscordId', save: jest.fn().mockResolvedValue(true) };
        Team.findOne.mockResolvedValue(mockTeam);

        await db.updateTeamInfo('TeamName', 'NewTeamName', 'NewCaptainDiscordId');

        expect(Team.findOne).toHaveBeenCalledWith({ name: 'TeamName' });
        expect(mockTeam.name).toBe('NewTeamName');
        expect(mockTeam.captainDiscordId).toBe('NewCaptainDiscordId');
        expect(mockTeam.save).toHaveBeenCalled();
    });

    it('should assign team role', async () => {
        const mockTeam = { teamRoleId: 'oldRoleId', save: jest.fn().mockResolvedValue(true) };
        Team.findOne.mockResolvedValue(mockTeam);

        await db.assignTeamRole('TeamName', 'NewRoleId');

        expect(Team.findOne).toHaveBeenCalledWith({ name: 'TeamName' });
        expect(mockTeam.teamRoleId).toBe('NewRoleId');
        expect(mockTeam.save).toHaveBeenCalled();
    });

    it('should connect to MongoDB', async () => {
        jest.spyOn(mongoose, 'connect').mockResolvedValue(true);

        await db.connect('mongodb://localhost:27017/test');

        expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/test');
    });
});
