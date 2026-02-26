const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  User_Name: { type: String, required: true },
  User_Email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Note: In a production app, we will encrypt this!
  Gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
  Phone_Number: { type: String },
  Interests: [{ type: String }], // Array of strings to handle multiple sports
  Profile_Picture: { type: String, default: null } // We will store the image URL/path here later
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('User', userSchema);