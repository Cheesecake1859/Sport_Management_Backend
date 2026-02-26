const mongoose = require('mongoose'); // Add this line!
const sportsTypeSchema = new mongoose.Schema({
  Sports_type_name: { type: String, required: true }
});
module.exports = mongoose.model('SportsType', sportsTypeSchema);