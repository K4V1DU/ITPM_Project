const ContactRequest = require("../Models/ContactRequest");
const Accommodation = require("../Models/Accommodation");
const mongoose = require("mongoose");


// ✅ CREATE
exports.createRequest = async (req, res) => {
  try {
    const { accommodationId, studentId, visitDate, visitTime, message } =
      req.body;

    // 🔎 Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(accommodationId)) {
      return res.status(400).json({ message: "Invalid accommodationId" });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: "Invalid studentId" });
    }

    // 🔎 Find accommodation
    const accommodation = await Accommodation.findById(accommodationId);

    if (!accommodation) {
      return res.status(404).json({ message: "Accommodation not found" });
    }

    // ✅ Get host from owner field
    const hostId = accommodation.owner;

    const newRequest = await ContactRequest.create({
      accommodationId,
      studentId,
      hostId,
      visitDate,
      visitTime,
      message,
    });

    res.status(201).json({
      success: true,
      message: "Contact request created successfully",
      data: newRequest,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ✅ GET ALL
exports.getAllRequests = async (req, res) => {
  try {
    const requests = await ContactRequest.find()
      .populate("studentId", "name email")
      .populate("hostId", "name email")
      .populate("accommodationId", "title");

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ✅ UPDATE
exports.updateRequest = async (req, res) => {
  try {
    const updated = await ContactRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.json({
      success: true,
      message: "Request updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ✅ DELETE
exports.deleteRequest = async (req, res) => {
  try {
    const deleted = await ContactRequest.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.json({
      success: true,
      message: "Request deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};