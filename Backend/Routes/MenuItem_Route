const express = require("express");
const router = express.Router();

const {
  addMenuItem,
  getAllMenuItems,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
} = require("../Controllers/MenuItem_Controller");

// ✅ Standard CRUD Routes
router.post("/", addMenuItem);
router.get("/", getAllMenuItems);
router.get("/:id", getMenuItemById);
router.put("/:id", updateMenuItem);
router.delete("/:id", deleteMenuItem);

module.exports = router;