const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
    predictionId: String,
    description: String,
    options: Map,
    status: String
});

module.exports = mongoose.model('Prediction', predictionSchema);
