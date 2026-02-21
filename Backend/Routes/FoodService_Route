const express = require("express");
const router = express.Router();

// 🔹 Import exactly as exported in controller
const {
  addFoodService,
  getAllFoodServices,
  getFoodServiceById,
  updateFoodService,
  deleteFoodService,
} = require("../Controllers/FoodService_Controller");

// ✅ Define the routes
router.post("/", addFoodService);
router.get("/", getAllFoodServices);
router.get("/:id", getFoodServiceById);
router.put("/:id", updateFoodService);
router.delete("/:id", deleteFoodService);

module.exports = router;