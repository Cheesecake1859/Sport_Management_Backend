const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  Staff_Name: { type: String, required: true },
  Staff_Email: { type: String, required: true, unique: true },
  Staff_Password: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);