const express = require("express");
const router = express.Router();
const controller = require("../controller/userController");
const { Userlogin } = require("../controller/userController");
const verifyToken = require("../utils/verifyToken");

//creat user
router.post("/register", controller.postUser);

// profile route example
router.get("/profile", verifyToken, controller.profile);

//get user
router.get("/", controller.getUsers);
router.get("/name/:username", controller.getUserByName);
router.get("/id/:id", controller.getUser);

//update user
router.put("/update/:username", verifyToken, controller.putUserByName);
router.put("/update/:id", controller.putUser);

//delet user
router.delete("/delete/:username", controller.deleteUserByName);
router.delete("/delete/:id", controller.deleteUser);

//login
router.post("/login", controller.Userlogin);

module.exports = router;
