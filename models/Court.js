const mongoose = require('mongoose');

const courtSchema = new mongoose.Schema({
  Court_Number: { 
    type: String, 
    required: true 
  },
  Description: { 
    type: String, 
    default: "No description provided." 
  },
  Sports_ID: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Sports' 
  },
  Status: { 
    type: String, 
    enum: ['Available', 'Maintenance'], 
    default: 'Available' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Court', courtSchema);