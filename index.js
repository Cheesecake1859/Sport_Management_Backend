require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer'); // Added missing multer import

// ==========================================
// 1. MODEL IMPORTS
// ==========================================
const User = require('./models/User');
const Facility = require('./models/Facility');
const Staff = require('./models/Staff');
const Admin = require('./models/Admin');
const Booking = require('./models/Booking');
const Court = require('./models/Court');
const Sports = require('./models/Sports');
const SportsType = require('./models/SportsType');
const Payment = require('./models/Payment');
const Issue = require('./models/Issue');

const app = express();

// ==========================================
// 2. MIDDLEWARE & STATIC FILES
// ==========================================
app.use(cors());
app.use(express.json());

// Serve uploaded files (Sports Images and Slips)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 3. DATABASE CONNECTION
// ==========================================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB successfully!'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ==========================================
// 4. MULTER CONFIGURATION (For Uploading Slips)
// ==========================================
const slipDir = path.join(__dirname, 'uploads/slips');
if (!fs.existsSync(slipDir)) {
  fs.mkdirSync(slipDir, { recursive: true });
}

const slipStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/slips/');
  },
  filename: (req, file, cb) => {
    // Adds a timestamp to the filename to prevent duplicates
    cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_')); 
  }
});

const uploadSlip = multer({ storage: slipStorage });

// ==========================================
// 5. HELPER FUNCTIONS
// ==========================================
// Converts "10:00 AM" into minutes for easy math
const timeToMinutes = (timeStr) => {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');
  hours = parseInt(hours, 10);
  minutes = parseInt(minutes, 10);
  
  if (hours === 12) hours = 0;
  if (modifier === 'PM') hours += 12;
  
  return (hours * 60) + minutes;
};

// ==========================================
// 6. API ROUTES
// ==========================================
app.post('/api/login', async (req, res) => {
  try {
    const { User_Email, password } = req.body;

    // 1. Check Admin Collection FIRST
    const admin = await Admin.findOne({ Admin_Email: User_Email });
    if (admin && admin.Admin_Password === password) {
      return res.status(200).json({ 
        message: "Admin Login successful!", 
        user: { 
          User_Name: admin.Admin_Name, 
          User_Email: admin.Admin_Email, 
          id: admin._id, 
          role: 'admin' 
        } 
      });
    }

    // 2. Check User Collection (Keep your existing code)
    const user = await User.findOne({ User_Email });
    if (user && user.password === password) {
      return res.status(200).json({ 
        message: "Login successful!", 
        user: { 
          User_Name: user.User_Name, 
          User_Email: user.User_Email, 
          id: user._id, 
          role: 'user',
          Profile_Image: user.Profile_Picture || user.Profile_Image 
        } 
      });
    }

    // 3. Check Staff Collection (Keep your existing code)
    const staff = await Staff.findOne({ Staff_Email: User_Email });
    if (staff && staff.Staff_Password === password) {
      return res.status(200).json({ 
        message: "Staff Login successful!", 
        user: { 
          User_Name: staff.Staff_Name, 
          User_Email: staff.Staff_Email, 
          id: staff._id, 
          role: 'staff',
          Profile_Image: null 
        } 
      });
    }

    res.status(400).json({ message: "Invalid credentials" });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
// --- SPORTS & SPORTS TYPES ROUTES ---
app.post('/api/sportstypes', async (req, res) => {
  try {
    const newType = new SportsType(req.body);
    await newType.save();
    res.status(201).json(newType);
  } catch (error) {
    res.status(400).json({ message: "Error creating sports type" });
  }
});

app.get('/api/sportstypes', async (req, res) => {
  try {
    const types = await SportsType.find();
    res.status(200).json(types);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sports types" });
  }
});

app.get('/api/sports', async (req, res) => {
  try {
    // Merged your two routes: Populates the type AND safely handles empty arrays
    const sports = await Sports.find().populate('Sports_type_ID');
    res.status(200).json(Array.isArray(sports) ? sports : []); 
  } catch (error) {
    console.error("Backend Error fetching sports:", error);
    res.status(500).json([]); // Send empty array so .map() doesn't break
  }
});

// --- COURT ROUTES ---
app.post('/api/courts', async (req, res) => {
  try {
    const newCourt = new Court(req.body);
    await newCourt.save();
    res.status(201).json(newCourt);
  } catch (error) {
    console.error("Error adding court:", error);
    res.status(400).json({ message: "Error adding court. Ensure Sports_ID is valid." });
  }
});

app.get('/api/courts', async (req, res) => {
  try {
    const courts = await Court.find().populate('Sports_ID');
    res.status(200).json(courts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching courts" });
  }
});

app.patch('/api/courts/:id/maintenance', async (req, res) => {
  try {
    const court = await Court.findByIdAndUpdate(req.params.id, { Status: 'Maintenance' }, { new: true });
    res.json(court);
  } catch (error) {
    res.status(400).json({ message: "Error toggling maintenance" });
  }
});

// --- BOOKING ROUTES ---
app.get('/api/bookings/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const userBookings = await Booking.find({ User_ID: userId })
      .populate({
        path: 'Court_ID',
        populate: { path: 'Sports_ID' }
      })
      .sort({ createdAt: -1 }); 
    res.status(200).json(userBookings);
  } catch (error) {
    console.error("Backend History Error:", error);
    res.status(500).json({ message: "Error fetching user history" });
  }
});

app.get('/api/bookings/court/:courtId/date/:date', async (req, res) => {
  try {
    const existingBookings = await Booking.find({
      Court_ID: req.params.courtId,
      Date: req.params.date,
      Booking_Status: { $in: ['Confirmed', 'Pending'] }
    });
    res.status(200).json(existingBookings);
  } catch (error) {
    console.error("Availability Fetch Error:", error);
    res.status(500).json({ message: "Error fetching availability" });
  }
});
app.post('/api/bookings', uploadSlip.single('slipImage'), async (req, res) => {
  try {
    // 1. Remove Payment_Method from destructuring
    const { Court_ID, Date: bookingDate, Start_Time, Duration, Total_Price, User_ID } = req.body;

    const requestedStart = timeToMinutes(Start_Time);
    const requestedEnd = requestedStart + (Number(Duration) * 60);

    const existingBookings = await Booking.find({
      Court_ID,
      Date: bookingDate,
      Booking_Status: { $in: ['Confirmed', 'Pending'] }
    });

    const hasOverlap = existingBookings.some(booking => {
      const bookedStart = timeToMinutes(booking.Start_Time);
      const bookedEnd = bookedStart + (booking.Duration * 60);
      return (requestedStart < bookedEnd) && (requestedEnd > bookedStart);
    });

    if (hasOverlap) {
      return res.status(409).json({ message: "This time slot is already taken." });
    }

    // 2. Create the booking with Total_Price and without Payment_Method
    const newBooking = new Booking({
      User_ID,
      Court_ID,
      Date: bookingDate,
      Start_Time,
      Duration,
      Total_Price, // Saved calculation from frontend
      Payment_Slip: req.file ? req.file.filename : null 
    });

    await newBooking.save();
    res.status(201).json(newBooking);

  } catch (error) {
    console.error("Booking Save Error:", error);
    res.status(400).json({ message: "Invalid booking data." });
  }
});
// --- MISCELLANEOUS ROUTES (Facilities, Issues, Admin, Payments, Staff) ---
app.get('/api/facilities', async (req, res) => {
  try {
    const facilities = await Facility.find();
    res.status(200).json(facilities);
  } catch (error) {
    res.status(500).json({ message: "Error fetching facilities" });
  }
});

app.post('/api/facilities', async (req, res) => {
  try {
    const newFacility = new Facility(req.body);
    await newFacility.save();
    res.status(201).json(newFacility);
  } catch (error) {
    res.status(400).json({ message: "Error creating facility" });
  }
});

app.post('/api/staff', async (req, res) => {
  try {
    const newStaff = new Staff(req.body);
    await newStaff.save();
    res.status(201).json(newStaff);
  } catch (error) {
    res.status(400).json({ message: "Error adding staff" });
  }
});
// Add this temporarily to index.js to create your first admin
app.post('/api/admin', async (req, res) => {
  try {
    const { Admin_Name, Admin_Email, Admin_Password, Hourly_Rate } = req.body;
    
    // Check if an admin already exists to prevent duplicates
    const existingAdmin = await Admin.findOne({ Admin_Email });
    if (existingAdmin) return res.status(400).json({ message: "Admin already exists" });

    const newAdmin = new Admin({
      Admin_Name,
      Admin_Email,
      Admin_Password,
      Hourly_Rate
    });

    await newAdmin.save();
    res.status(201).json({ message: "Admin created successfully!", admin: newAdmin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating admin" });
  }
});
// Get current system configuration (Price)
app.get('/api/admin/config', async (req, res) => {
  try {
    let config = await Admin.findOne();
    // If no config exists yet, create a default one
    if (!config) {
      config = new Admin({ 
        Admin_Name: "Master Admin", 
        Admin_Email: "admin@test.com", 
        Admin_Password: "adminpassword",
        Hourly_Rate: 25 
      });
      await config.save();
    }
    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({ message: "Error fetching price config" });
  }
});

// Update the global Hourly Rate
app.put('/api/admin/config', async (req, res) => {
  try {
    const { Hourly_Rate } = req.body;
    const config = await Admin.findOneAndUpdate({}, { Hourly_Rate }, { new: true });
    res.status(200).json(config);
  } catch (error) {
    res.status(400).json({ message: "Error updating price" });
  }
});

// ==========================================
// 7. START SERVER
// ==========================================
const PORT = process.env.PORT || 5001; 
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});


// --- STAFF DASHBOARD ROUTES ---

// 1. Get all pending bookings (Oldest first, so staff clears the queue in order)
app.get('/api/bookings/pending', async (req, res) => {
  try {
    const pendingBookings = await Booking.find({ Booking_Status: 'Pending' })
      .populate('User_ID', 'User_Name User_Email Phone_Number') // Get the user's details
      .populate({
        path: 'Court_ID',
        populate: { path: 'Sports_ID' } // Get the court and sport details
      })
      .sort({ createdAt: 1 }); // 1 = Oldest first
    res.status(200).json(pendingBookings);
  } catch (error) {
    console.error("Error fetching pending bookings:", error);
    res.status(500).json({ message: "Error fetching pending bookings" });
  }
});
app.patch('/api/bookings/:id/status', async (req, res) => {
  try {
    // Expect staffId to be sent from the frontend StaffDashboard
    const { status, staffId } = req.body; 
    
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id, 
      { 
        Booking_Status: status,
        Verified_By: staffId // Link the staff member to the confirmation
      }, 
      { new: true }
    );
    res.status(200).json(updatedBooking);
  } catch (error) {
    res.status(500).json({ message: "Error updating booking status" });
  }
});
// --- FACILITY HUB ROUTES ---
app.post('/api/issues', async (req, res) => {
  try {
    const { Court_ID, Description, Staff_ID } = req.body;
    
    const newIssue = new Issue({
      Court_ID,
      Description,
      Staff_ID, // This will now show up in MongoDB
      Date_Reported: new Date(),
      Issue_Status: 'Open'
    });
    
    await newIssue.save();
    
    // Automatically toggle the court to Maintenance
    await Court.findByIdAndUpdate(Court_ID, { Status: 'Maintenance' });
    
    res.status(201).json(newIssue);
  } catch (error) {
    res.status(400).json({ message: "Error reporting issue" });
  }
});

// 2. Toggle Court Status (Entity 5)
app.patch('/api/courts/:id/status', async (req, res) => {
  try {
    const { Status } = req.body; // 'Available' or 'Maintenance'
    const updatedCourt = await Court.findByIdAndUpdate(
      req.params.id, 
      { Status }, 
      { new: true }
    );
    res.json(updatedCourt);
  } catch (error) {
    res.status(400).json({ message: "Error updating court status" });
  }
});
// Ensure you have multer configured for profile uploads
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles/'); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const uploadProfile = multer({ storage: profileStorage });

// Update the route to use 'uploadProfile.single'
app.post('/api/register', uploadProfile.single('profileImage'), async (req, res) => {
  try {
    const { User_Name, User_Email, password, Gender, Phone_Number, Interests } = req.body;

    const newUser = new User({
      User_Name,
      User_Email,
      password,
      Gender,
      Phone_Number,
      // We parse the interests back into an array
      Interests: JSON.parse(Interests), 
      // Save the filename generated by multer
      Profile_Picture: req.file ? req.file.filename : null 
    });

    await newUser.save();
    res.status(201).json({ message: "User registered successfully!", user: newUser });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Registration failed. Email might already exist." });
  }
});



// --- ADMIN ANALYTICS ROUTES ---
app.get('/api/admin/analytics', async (req, res) => {
  try {
    // 1. Total Revenue
    const totalRevenue = await Booking.aggregate([
      { $match: { Booking_Status: 'Confirmed' } },
      { $group: { _id: null, total: { $sum: "$Total_Price" } } }
    ]);

    // 2. Sport Popularity
    const sportPopularity = await Booking.aggregate([
      { $match: { Booking_Status: 'Confirmed' } },
      { $lookup: { from: 'courts', localField: 'Court_ID', foreignField: '_id', as: 'court' } },
      { $unwind: '$court' },
      { $lookup: { from: 'sports', localField: 'court.Sports_ID', foreignField: '_id', as: 'sport' } },
      { $unwind: '$sport' },
      { $group: { _id: '$sport.Sports_Name', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // 3. NEW: Monthly Revenue Trend
    const revenueTrend = await Booking.aggregate([
      { $match: { Booking_Status: 'Confirmed' } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          monthlyTotal: { $sum: "$Total_Price" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Send everything back in one object
    res.json({
      revenue: totalRevenue[0]?.total || 0,
      popularity: sportPopularity,
      trends: revenueTrend // Now the frontend can see this!
    });
  } catch (error) {
    res.status(500).json({ message: "Error calculating analytics" });
  }
});


// --- ADMIN STAFF MANAGEMENT ROUTES ---

// 1. Get all staff members for the management table
app.get('/api/admin/staff', async (req, res) => {
  try {
    const staffs = await Staff.find().select('-Staff_Password'); // Hide passwords for security
    res.json(staffs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching staff list" });
  }
});

// 2. Remove a staff member
app.delete('/api/admin/staff/:id', async (req, res) => {
  try {
    await Staff.findByIdAndDelete(req.params.id);
    res.json({ message: "Staff member removed successfully" });
  } catch (error) {
    res.status(400).json({ message: "Error deleting staff" });
  }
});
app.get('/api/admin/audit-log', async (req, res) => {
  try {
    const logs = await Issue.find()
      .populate('Staff_ID', 'Staff_Name') // Get the staff name
      .populate('Court_ID', 'Court_Number') // Get the court number
      .sort({ createdAt: -1 }); // Newest logs first
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching audit logs" });
  }
});
// --- SPORTS BUDDIES ROUTE ---
app.get('/api/users/:id/buddies', async (req, res) => {
  try {
    // 1. Find the current logged-in user to get their interests
    const currentUser = await User.findById(req.params.id);
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    // 2. Find other users who have at least one matching interest
    // $ne means "Not Equal" (don't match the current user with themselves)
    // $in means "In array" (find users where their Interests overlap with currentUser.Interests)
    const matches = await User.find({
      _id: { $ne: currentUser._id },
      Interests: { $in: currentUser.Interests }
    }).select('-password'); // Hide passwords for security

    res.status(200).json(matches);
  } catch (error) {
    console.error("Error fetching buddies:", error);
    res.status(500).json({ message: "Server error" });
  }
});
// --- UPDATE USER PROFILE ROUTE ---
app.put('/api/users/:id', uploadProfile.single('profileImage'), async (req, res) => {
  try {
    const { User_Name, User_Email, password, Gender, Phone_Number, Interests } = req.body;
    
    // 1. Find the existing user
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Update their fields (keep old data if new data isn't provided)
    if (User_Name) user.User_Name = User_Name;
    if (User_Email) user.User_Email = User_Email;
    if (password) user.password = password; // Only update if they typed a new one
    if (Gender) user.Gender = Gender;
    if (Phone_Number) user.Phone_Number = Phone_Number;
    if (Interests) user.Interests = JSON.parse(Interests);
    
    // 3. Update the picture ONLY if they uploaded a new one
    if (req.file) {
      user.Profile_Picture = req.file.filename;
    }

    await user.save();

    // 4. Send back the updated user info so the frontend can update LocalStorage
    res.status(200).json({ 
      message: "Profile updated successfully!", 
      user: {
        User_Name: user.User_Name, 
        User_Email: user.User_Email, 
        id: user._id, 
        role: 'user',
        Profile_Image: user.Profile_Picture // Match the login format
      }
    });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ message: "Error updating profile." });
  }
});

// --- GET SINGLE USER DATA ---
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user data" });
  }
});
// --- UPDATE STAFF PROFILE ---
app.put('/api/staff/:id', async (req, res) => {
  try {
    const { User_Name, User_Email, password } = req.body;
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    // Map the incoming generic names to the Staff schema names
    if (User_Name) staff.Staff_Name = User_Name;
    if (User_Email) staff.Staff_Email = User_Email;
    if (password) staff.Staff_Password = password;

    await staff.save();
    res.json({ message: "Staff profile updated", user: { User_Name: staff.Staff_Name, User_Email: staff.Staff_Email, id: staff._id, role: 'staff' }});
  } catch (error) {
    res.status(500).json({ message: "Error updating staff profile" });
  }
});

// --- UPDATE ADMIN PROFILE ---
app.put('/api/admin/:id', async (req, res) => {
  try {
    const { User_Name, User_Email, password } = req.body;
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    if (User_Name) admin.Admin_Name = User_Name;
    if (User_Email) admin.Admin_Email = User_Email;
    if (password) admin.Admin_Password = password;

    await admin.save();
    res.json({ message: "Admin profile updated", user: { User_Name: admin.Admin_Name, User_Email: admin.Admin_Email, id: admin._id, role: 'admin' }});
  } catch (error) {
    res.status(500).json({ message: "Error updating admin profile" });
  }
});