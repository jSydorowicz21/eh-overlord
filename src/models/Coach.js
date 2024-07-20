const mongoose = require('mongoose');

const CoachSchema = new mongoose.Schema({
    name: String,
    discordId: String,
    riotId: String,
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
});

const Coach = mongoose.model('Coach', CoachSchema);
module.exports = Coach;
