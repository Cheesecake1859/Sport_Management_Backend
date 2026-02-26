const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema({
  Facility_Name: { type: String, required: true },
  Sport_Type: { 
    type: String, 
    required: true, 
    enum: ['Football', 'Basketball', 'Tennis', 'Badminton', 'Volleyball', 'Swimming'] 
  },
  Price_Per_Hour: { type: Number, required: true },
  Status: { 
    type: String, 
    enum: ['Available', 'Booked', 'Maintenance'], 
    default: 'Available' 
  },
  Image_URL: { type: String } // Link to a photo of the court/pitch
}, { timestamps: true });

module.exports = mongoose.model('Facility', facilitySchema);