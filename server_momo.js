const express = require("express");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const path = require("path");
const PORT = 5000;
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many login attempts, please wait 15 minutes and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/users/login", loginLimiter);
app.use("/api/users/admin-login", loginLimiter);
app.use("/api", apiLimiter);

mongoose
  .connect(process.env.DB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("DB connection error:", err);
    process.exit(1);
  });

app.use("/api/users", require("./routes/userRouter"));
app.use("/api/transactions", require("./routes/transactionRoute"));
app.use("/api/otp", require("./routes/otpRoute"));
app.use("/api/blacklist", require("./routes/blacklistRoute"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
