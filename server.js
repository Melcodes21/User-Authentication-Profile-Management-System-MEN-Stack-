const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path=require("path")
require("dotenv").config();
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"))

//connect database
mongoose
  .connect(process.env.DB_URI)

  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((err) => {
    console.log(err);
  });

//route
const authRoutes = require("./router/auth");
app.use("/api/users", authRoutes);

// Default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

//start port

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
