const express = require("express");
const router = express.Router();
const controller = require("../controller/userController");
const verifyToken = require("../utils/verifyToken");

// Public routes (no auth required)
router.post("/register", controller.postUser);
router.post("/login", controller.Userlogin);

// Protected routes (auth required)
router.get("/profile", verifyToken, controller.profile);
router.get("/", verifyToken, controller.getUsers);
router.get("/name/:username", verifyToken, controller.getUserByName);
router.get("/id/:id", verifyToken, controller.getUser);

router.put("/update/:username", verifyToken, controller.putUserByName);
router.put("/update/:id", verifyToken, controller.putUser);

router.delete("/delete/:username", verifyToken, controller.deleteUserByName);
router.delete("/delete/:id", verifyToken, controller.deleteUser);

module.exports = router;
