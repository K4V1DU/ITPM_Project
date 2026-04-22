const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
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





const MONGO_URI = process.env.MONGO_URI;


const connectWithRetry = () => {
  console.log("Attempting to connect to MongoDB...");
  
  mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 4000, 
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
      console.error("MongoDB connection failed");
      console.log("Retrying in 3 seconds...");
      // Wait 5 seconds before retrying
      setTimeout(connectWithRetry, 4000);
    });
};

// Start the connection process
connectWithRetry();