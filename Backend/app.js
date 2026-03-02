const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer Setup for Photo Uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Import Routes
const AccommodationRouter = require("../Backend/Routes/Accommodation_Route");
const PhotoRouter = require("../Backend/Routes/Photo_Route"); 
const ReviewRouter = require("../Backend/Routes/Review_Route"); 
const UserRouter = require("../Backend/Routes/User_Route"); 
const MenuItemRouter = require("../Backend/Routes/MenuItem_Route"); 
const FoodServiceRouter = require("../Backend/Routes/FoodService_Route"); 
const PaymentRouter = require("../Backend/Routes/Payment_Route");
const ContactRouter = require("../Backend/Routes/Contact_Route")
// Mount Routes
app.use("/Accommodation", AccommodationRouter);
app.use("/Photo", PhotoRouter); 
app.use("/Review", ReviewRouter);
app.use("/User", UserRouter);
app.use("/MenuItem", MenuItemRouter);
app.use("/FoodService", FoodServiceRouter);
app.use("/Payment", PaymentRouter);
app.use("/contact", ContactRouter);

const MONGO_URI = "mongodb+srv://K4V1DU:ekwpjA9nDZid3iqR@cluster0.23nczaf.mongodb.net/testing2?retryWrites=true&w=majority";

const connectWithRetry = () => {
  console.log("Attempting to connect to MongoDB...");
  
  mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 8000, 
    family: 4 
  })
    .then(() => {
      console.log("✅ Connected to MongoDB");
      const PORT = 8000;
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("❌ MongoDB connection failed:", err.message);
      console.log("Retrying in 5 seconds...");
      // Wait 5 seconds before retrying
      setTimeout(connectWithRetry, 8000);
    });
};

// Start the connection process
connectWithRetry();