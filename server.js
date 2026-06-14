const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const path = require("path");
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet());

// CORS - restrict to allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5000"];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
});
app.use("/api/", limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // limit login/register attempts
  message: "Too many authentication attempts, please try again later",
});
app.use("/api/users/login", authLimiter);
app.use("/api/users/register", authLimiter);

// Body parsing with size limit
app.use(express.json({ limit: "10kb" }));

// Sanitize MongoDB queries to prevent NoSQL injection
app.use(mongoSanitize());

app.use(express.static("public"));

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
