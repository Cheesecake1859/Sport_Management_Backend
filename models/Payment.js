const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  Booking_ID: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  Payment_Proof: { type: String }, // URL to uploaded receipt
  Bank_Details: { type: String },
  Payment_Status: { 
    type: String, 
    enum: ['Pending', 'Verified', 'Rejected'], 
    default: 'Pending' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);