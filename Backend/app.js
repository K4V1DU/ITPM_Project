const path = require("path");
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer Setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Import Routes — use relative paths from THIS file
const AccommodationRouter = require("./Routes/Accommodation_Route");
const PhotoRouter = require("./Routes/Photo_Route");
const ReviewRouter = require("./Routes/Review_Route");
const UserRouter = require("./Routes/User_Route");
const MenuItemRouter = require("./Routes/MenuItem_Route");
const FoodServiceRouter = require("./Routes/FoodService_Route");
const PaymentRouter = require("./Routes/Payment_Route");
const ContactRouter = require("./Routes/Contact_Route");
const FoodOrderRouter = require("./Routes/FoodOrder_Route");
const NotificationRouter = require("./Routes/Notification_Route");
const favouriteRoute = require("./Routes/Favourite_Route");
const messageRoute = require("./Routes/Message_Route");
const BookingRouter = require("./Routes/Booking_Route");

// Mount Routes
app.use("/Accommodation", AccommodationRouter);
app.use("/Photo", PhotoRouter);
app.use("/Review", ReviewRouter);
app.use("/User", UserRouter);
app.use("/MenuItem", MenuItemRouter);
app.use("/FoodService", FoodServiceRouter);
app.use("/Payment", PaymentRouter);
app.use("/contact", ContactRouter);
app.use("/FoodOrder", FoodOrderRouter);
app.use("/Notification", NotificationRouter);
app.use("/favourite", favouriteRoute);
app.use("/message", messageRoute);
app.use("/Booking", BookingRouter);

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 30000,
  family: 4
})
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection failed:", err.message));

// For local development only
if (process.env.NODE_ENV !== "production") {
  app.listen(8000, () => console.log("🚀 Server running on port 8000"));
}

// ✅ Export for Vercel
module.exports = app;