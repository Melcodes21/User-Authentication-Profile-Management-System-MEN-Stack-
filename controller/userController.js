const User = require("../model/user");
const bcrypt = require("bcryptjs");
const hashPassword = require("../utils/hashPassword");
const generateToken = require("../utils/generateToken");
const buildUpdateData = require("../utils/buildUpdateData");
const asyncHandler = require("../utils/asyncHandler");
const formatUserResponse = require("../utils/formatUserResponse");
const {
  registerValidation,
  updateValidation,
  loginValidation,
} = require("../utils/validation");

//post user
const postUser = asyncHandler(async (req, res) => {
  const { error } = registerValidation(req.body);
  if (error) {
    console.log("Validation Error:", error.details);
    return res.status(400).send(error.details[0].message);
  }
  const { username, email, password, age, bio } = req.body;
  if (!username || !email || !password)
    return res.status(400).send("username,email , password are required");

  const userExist = await User.findOne({ username });
  if (userExist) return res.status(400).send("Username already exist");

  const emailExist = await User.findOne({ email });
  if (emailExist) return res.status(400).send("Email already exist");

  if (password.length < 6)
    return res
      .status(400)
      .json({ message: "password must be at least 7 charaters" });

  const hashedPassword = await hashPassword(password);

  const newUser = new User({
    username,
    email,
    password: hashedPassword,
    age,
    bio,
  });
  const saveUser = await newUser.save();
  res.status(201).json({ message: "user created successfully", saveUser });
});

//login user
const Userlogin = asyncHandler(async (req, res) => {
  const { error } = loginValidation(req.body);
  if (error)
    return res.status(400).json({ message: error.details[0].message });

  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword)
    return res.status(400).json({ message: "Invalid password" });

  const token = generateToken({ _id: user._id, email: user.email });

  res.json({
    token,
    user: formatUserResponse(user),
  });
});

const profile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  res.json({ user });
});

//get all user
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find();
  if (!users) return res.status(404).send("user not found");
  res.status(200).send(users);
});

//get user byID
const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send("user id required");
  const userId = await User.findById(id);
  if (!userId) return res.status(404).send("user not found or wrong id");
  res.status(200).send(userId);
});

//get user by user name
const getUserByName = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username) return res.status(400).send("username is required");

  const user = await User.findOne({
    username: { $regex: req.params.username, $options: "i" },
  });

  if (!user) return res.status(404).send("user not found or wrong username");
  res.status(200).send(user);
});

//update user info
const putUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send("user id required");

  const { error } = updateValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const updateData = await buildUpdateData(req.body);
  const updatedUser = await User.findByIdAndUpdate(id, updateData, {
    new: true,
  });
  if (!updatedUser) return res.status(404).send("user not found");
  res.status(200).send(updatedUser);
});

//update by username
const putUserByName = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username) return res.status(400).send("username required");

  const { newUsername, email, password, age, bio } = req.body;
  const updateData = await buildUpdateData({
    username: newUsername,
    email,
    password,
    age,
    bio,
  });

  const updatedUser = await User.findOneAndUpdate({ username }, updateData, {
    new: true,
  });
  if (!updatedUser) return res.status(404).send("user not found");

  const token = generateToken({
    _id: updatedUser._id,
    email: updatedUser.email,
    age: updatedUser.age,
    bio: updatedUser.bio,
  });

  res.json({
    token,
    user: formatUserResponse(updatedUser),
  });
});

//delete user info
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send("userId is required");

  const deletedUser = await User.findByIdAndDelete(id);
  if (!deletedUser) return res.status(404).send("user not found");
  res.status(200).send("user deleted successfully");
});

//delete user by name
const deleteUserByName = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username) return res.status(400).send("username required");

  const deletedUser = await User.findOneAndDelete({ username });
  if (!deletedUser) return res.status(404).send("user not found");
  res.status(200).send("user deleted");
});

module.exports = {
  postUser,
  getUsers,
  getUser,
  getUserByName,
  putUser,
  putUserByName,
  deleteUser,
  deleteUserByName,
  Userlogin,
  profile,
};
