const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
const multer = require("multer");


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Multer Setup for Photo Uploads
const storage = multer.memoryStorage(); // store image in memory as Buffer
const upload = multer({ storage });



// Import Routes
const AccommodationRouter = require("../Backend/Routes/Accommodation_Route");
const PhotoRouter = require("../Backend/Routes/Photo_Route"); 
const ReviewRouter = require("../Backend/Routes/Review_Route"); 
const UserRouter = require("../Backend/Routes/User_Route"); 















// Mount Routes
app.use("/Accommodation", AccommodationRouter);
app.use("/Photo", PhotoRouter); 
app.use("/Review", ReviewRouter);
app.use("/User", UserRouter);























// MongoDB Connection
mongoose.connect(
  "mongodb+srv://K4V1DU:ekwpjA9nDZid3iqR@cluster0.23nczaf.mongodb.net/testing2?retryWrites=true&w=majority"
)
  .then(() => console.log("Connected to MongoDB"))
  .then(() => {
    app.listen(5000, () => console.log("Server running on port 5000"));
  })
  .catch((err) => console.log(err));
