const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
    name: String,
    captain: String,
    captainDiscordId: String,
    teamChannelId: String,
    teamRoleId: String,
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }]
});

const Team = mongoose.model('Team', TeamSchema);
module.exports = Team;
