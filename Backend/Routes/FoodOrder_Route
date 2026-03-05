const express = require("express");
const router = express.Router();

const {
  createOrder,
  getAllOrders,
  getOrderById,
  getOrdersByStudent,
  getOrdersByFoodService,
  getOrdersByOwner,
  updateOrderStatus,
  deleteOrder,
} = require("../Controllers/FoodOrder_Controller");

router.post("/",                              createOrder);
router.get("/",                               getAllOrders);
router.get("/student/:studentId",             getOrdersByStudent);
router.get("/foodservice/:foodServiceId",     getOrdersByFoodService);
router.get("/owner/:ownerId",                 getOrdersByOwner);
router.get("/:id",                            getOrderById);
router.put("/:id/status",                     updateOrderStatus);
router.delete("/:id",                         deleteOrder);

module.exports = router;