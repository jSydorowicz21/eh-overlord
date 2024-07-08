const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
    userId: String,
    balance: Number
});

module.exports = mongoose.model('Point', pointSchema);
