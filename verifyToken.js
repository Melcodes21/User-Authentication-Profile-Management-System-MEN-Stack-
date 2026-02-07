const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) return res.status(401).json({ message: "Access Denied!!!" });

  const token = authHeader.split(" ")[1]; // remove 'Bearer'
  if (!token) return res.status(401).json({ message: "Access Denied!!!" });

  try {
    const verified = jwt.verify(token, process.env.TOKEN_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: "Invalid Token" });
  }
};
module.exports = verifyToken;
