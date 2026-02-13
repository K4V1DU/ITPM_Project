const express = require("express");
const mongoose = require("mongoose");
const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Import Routes
const AccommodationRouter = require("../Backend/Routes/Accommodation_Route");



// Mount Routes
app.use("/Accommodation", AccommodationRouter);




// MongoDB Connection
mongoose.connect("mongodb+srv://K4V1DU:ekwpjA9nDZid3iqR@cluster0.23nczaf.mongodb.net/testing2?retryWrites=true&w=majority")
  .then(() => console.log("Connected to MongoDB"))
  .then(() => {
      app.listen(5000, () => console.log("Server running on port 5000"));
  })
  .catch((err) => console.log(err));
