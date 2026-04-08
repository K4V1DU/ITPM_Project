const express = require("express");
const router = express.Router();
const contactController = require("../Controllers/Contact_Controller");

// CREATE
router.post("/", contactController.createRequest);

// GET ALL
router.get("/", contactController.getAllRequests);

// UPDATE
router.put("/:id", contactController.updateRequest);

// DELETE
router.delete("/:id", contactController.deleteRequest);

module.exports = router;