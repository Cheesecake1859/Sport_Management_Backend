const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  User_ID: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  Court_ID: { type: mongoose.Schema.Types.ObjectId, ref: 'Court', required: true },
  Date: { type: String, required: true }, 
  Start_Time: { type: String, required: true },
  Duration: { type: Number, required: true }, // in hours
  
  // NEW: Added to store the actual amount paid based on the Admin's rate
  Total_Price: { type: Number, required: true }, 

  Booking_Status: { 
    type: String, 
    enum: ['Pending', 'Confirmed', 'Cancelled'], 
    default: 'Pending' 
  },
  
  // Only Payment_Slip is needed for your bank transfer workflow
  Payment_Slip: { type: String } 
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);