const mongoose = require('mongoose');

const sportsSchema = new mongoose.Schema({
  Sports_Name: { type: String, required: true },
  Sports_Image: { type: String, required: true },
  // This is the missing piece!
  Sports_type_ID: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'SportsType' // This must match the name in module.exports of SportsType.js
  }
}, { timestamps: true });

module.exports = mongoose.model('Sports', sportsSchema);