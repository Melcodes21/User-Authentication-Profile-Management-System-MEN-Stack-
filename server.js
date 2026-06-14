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
    console.error("Database connection failed:", err.message);
    process.exit(1);
  });

//route
const authRoutes = require("./router/auth");
app.use("/api/users", authRoutes);

// Default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ message: "Internal server error" });
});

//start port

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
