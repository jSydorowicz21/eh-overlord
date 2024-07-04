const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
    name: String,
    discordId: String,
    riotId: String,
    team: {type: mongoose.Schema.Types.ObjectId, ref: 'Team'}
});
const TeamSchema = new mongoose.Schema({
    name: String,
    captain: String,
    captainDiscordId: String,
    teamChannelId: String,
    teamRoleId: String,
    players: [{type: mongoose.Schema.Types.ObjectId, ref: 'Player'}]
});

const Player = mongoose.model('Player', PlayerSchema);
const Team = mongoose.model('Team', TeamSchema);

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
        const team = await Team.findOne({name: teamName});
        team.teamChannelId = channelId;
        await team.save();
    },

    setTeamRole: async (teamName, roleId) => {
        const team = await Team.findOne({name: teamName});
        team.teamRoleId = roleId;
        await team.save();
    },

    addPlayerToTeam: async (riotId, discordId, playerName, captainDiscordId) => {
        const team = await Team.findOne({captainDiscordId: captainDiscordId});
        if (!team) {
            throw new Error('Team not found');
        }

        const player = await Player.findOne({discordId: discordId}).populate('team');
        if (player) {
            if (player.team) {
                throw new Error('Player already in a team');
            }
            team.players.push(player.id);
            await team.save();
            player.team = team.id;
            await player.save();
            return player;
        } else {
            const player = new Player({
                name: playerName,
                discordId: discordId,
                riotId: riotId,
                team: team.id
            });
            await player.save();
            team.players.push(player.id);
            await team.save();

            return player;
        }
    },

    getTeamByCaptain: async (captainId) => {
        return Team.findOne({captainDiscordId: captainId}).populate('players');
    },

    getTeamByPlayer: async (discordId) => {
        const player = await Player.findOne({discordId: discordId}).populate('team');
        return player.team.populate('players');
    },

    setCaptain: async (captainId,captainName, teamName) => {
        const team = await Team.findOne({name: teamName});
        team.captainId = captainId;
        team.captain = captainName;
        await team.save();
    },

    removePlayerFromTeam: async (riotId, captainId) => {
        const team = await Team.findOne({captainDiscordId: captainId}).populate('players');
        team.players = team.players.filter(p => p.riotId !== riotId);
        await team.save();
        const player = await Player.findOne({riotId: riotId});
        player.team = null;
        await player.save();
    },

    deleteTeam: async (captainId) => {
        const team = await Team.findOneAndDelete({captainDiscordId: captainId});
        if (!team) {
            throw new Error('Team not found');
        }
        await Player.deleteMany({team: team._id});
        return team;
    },


    connect: async (dbUrl) => {
        await mongoose.connect(dbUrl);
        console.log('Connected to MongoDB');
    }
};

module.exports = db;
