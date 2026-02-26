const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  // Link to the specific court that has a problem
  Court_ID: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Court', 
    required: true 
  },
  // Link to the staff member who created the report
  Staff_ID: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Staff', 
    required: true 
  },
  Description: { type: String, required: true },
  Date_Reported: { type: Date, default: Date.now },
  Issue_Status: { 
    type: String, 
    enum: ['Open', 'In Progress', 'Resolved'], 
    default: 'Open' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Issue', issueSchema);