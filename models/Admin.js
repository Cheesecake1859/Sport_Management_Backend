const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  Admin_Name: { type: String, required: true },
  Admin_Email: { type: String, required: true, unique: true }, // Added for Login
  Admin_Password: { type: String, required: true },            // Added for Login
  Hourly_Rate: { type: Number, default: 25 },                 // Master Price Control
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);