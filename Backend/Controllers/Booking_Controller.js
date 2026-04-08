const Booking = require("../Models/Booking");

// ==============================
// Create Booking (Student)
// ==============================
const createBooking = async (req, res) => {
  try {
    const { student, accommodation, visitDate, visitTime, message } = req.body;

    if (!student || !accommodation || !visitDate || !visitTime) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const booking = new Booking({
      student,
      accommodation,
      visitDate,
      visitTime,
      message,
    });

    await booking.save();

    res.status(201).json({
      success: true,
      message: "Booking request sent",
      data: booking,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==============================
// Get Bookings for Student
// ==============================
const getStudentBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ student: req.params.studentId })
      .populate("accommodation")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: bookings });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================
// Get Bookings for Host
// ==============================
const getHostBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate({
        path: "accommodation",
        match: { owner: req.params.hostId },
      })
      .populate("student")
      .sort({ createdAt: -1 });

    // filter null accommodations
    const filtered = bookings.filter(b => b.accommodation !== null);

    res.status(200).json({ success: true, data: filtered });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================
// Update Booking Status (Host)
// ==============================
const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.status(200).json({
      success: true,
      message: "Booking updated",
      data: booking,
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==============================
// Delete Booking
// ==============================
const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    res.status(200).json({
      success: true,
      message: "Booking deleted",
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createBooking,
  getStudentBookings,
  getHostBookings,
  updateBookingStatus,
  deleteBooking,
};