const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
    name: String,
    discordId: String,
    riotId: String,
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
});

const Player = mongoose.model('Player', PlayerSchema);
module.exports = Player;
