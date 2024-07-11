const mongoose = require('mongoose');
const Player = require('../models/Player');
const Team = require('../models/Team');

const db = {
    getTeams: async () => await Team.find().populate('players'),

    getTeamPlayers: async (teamId) => {
        const team = await Team.findById(teamId).populate('players');
        return team.players;
    },

    createTeam: async (teamName, captainDiscordId, captainName, teamChannelId, teamRoleId) => {
        const team = new Team({
            name: teamName,
            captain: captainName,
            captainDiscordId: captainDiscordId,
            teamChannelId: teamChannelId,
            teamRoleId: teamRoleId,
            players: [],
        });
        await team.save();
        return team;
    },

    setTeamChannel: async (teamName, channelId) => {
        const team = await Team.findOne({ name: teamName });
        team.teamChannelId = channelId;
        await team.save();
    },

    setTeamRole: async (teamName, roleId) => {
        const team = await Team.findOne({ name: teamName });
        team.teamRoleId = roleId;
        await team.save();
    },

    addPlayerToTeam: async (riotId, discordId, playerName, captainDiscordId) => {
        const team = await Team.findOne({ captainDiscordId: captainDiscordId });
        if (!team) {
            throw new Error('Team not found');
        }

        const player = await Player.findOne({ discordId: discordId }).populate('team');
        if (player) {
            if (player.team) {
                throw new Error('Player already in a team');
            }
            team.players.push(player.id);
            await team.save();
            player.team = team.id;
            await player.save();
            await player.populate('team');
            return player;
        } else {
            const newPlayer = new Player({
                name: playerName,
                discordId: discordId,
                riotId: riotId,
                team: team.id
            });
            await newPlayer.save();
            team.players.push(newPlayer.id);
            await team.save();
            await newPlayer.populate('team');
            return newPlayer;
        }
    },

    getTeamByCaptain: async (captainId) => {
        return Team.findOne({ captainDiscordId: captainId }).populate('players');
    },

    getTeamByPlayer: async (discordId) => {
        const player = await Player.findOne({ discordId: discordId }).populate('team');
        return player.team.populate('players');
    },

    getTeamByName: async (teamName) => {
        return Team.findOne({ name: teamName }).populate('players');
    },

    setCaptain: async (captainId, captainName, teamName) => {
        const team = await Team.findOne({ name: teamName });
        team.captainId = captainId;
        team.captain = captainName;
        await team.save();
    },

    setManager: async (managerId, managerName, teamName) => {
        const team = await Team.findOne({ name: teamName });
        team.managerDiscordId = managerId;
        team.manager = managerName;
        await team.save();
    },

    removePlayerFromTeam: async (playerDiscordId) => {
        const player = await Player.findOne({ discordId: playerDiscordId });
        if (!player) {
            throw new Error('Player not found');
        }
        const team = await Team.findById(player.team._id);
        if (!team) {
            throw new Error('Team not found');
        }
        team.players = team.players.filter(p => p.discordId !== playerDiscordId);
        await team.save();
        player.team = null;
        await player.save();
        return {
            team: team,
            player: player
        };
    },

    getAllTeamRoleIds: async () => {
        const teams = await Team.find();
        return teams.map(team => team.teamRoleId);
    },

    updateRiotId: async (discordId, riotId) => {
        const player = await Player.findOne({ discordId: discordId });
        player.riotId = riotId;
        await player.save();
    },

    deleteTeam: async (captainId) => {
        const team = await Team.findOneAndDelete({ captainDiscordId: captainId });
        if (!team) {
            throw new Error('Team not found');
        }
        await Player.deleteMany({ team: team._id });
        return team;
    },

    getPlayerByDiscordId: async (discordId) => {
        return Player.findOne({ discordId }).populate('team');
    },

    updateTeamInfo: async (teamName, newTeamName, newCaptainDiscordId) => {
        const team = await Team.findOne({ name: teamName });
        if (team) {
            team.name = newTeamName;
            team.captainDiscordId = newCaptainDiscordId;
            await team.save();
        }
    },

    assignTeamRole: async (teamName, roleId) => {
        const team = await Team.findOne({ name: teamName });
        if (team) {
            team.teamRoleId = roleId;
            await team.save();
        }
    },

    connect: async (dbUrl) => {
        await mongoose.connect(dbUrl);
        console.log('Connected to MongoDB');
    }
};

module.exports = db;
