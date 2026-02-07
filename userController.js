const User = require("../model/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  registerValidation,
  updateValidation,
  loginValidation,
} = require("../utils/validation");

//post user
const postUser = async (req, res) => {
  const { error } = registerValidation(req.body);
  if (error) {
    console.log("Validation Error:", error.details);
    return res.status(400).send(error.details[0].message);
  }
  const { username, email, password, age, bio } = req.body;
  if (!username || !email || !password)
    return res.status(400).send("username,email , password are required");
  //check if username exist
  const userExist = await User.findOne({ username });
  if (userExist) return res.status(400).send("Username already exist");
  //check if emailexist
  try {
    const emailExist = await User.findOne({ email });
    if (emailExist) return res.status(400).send("Email already exist");
    //check if password is the right length
    if (password.length < 6)
      return res
        .status(400)
        .json({ message: "password must be at least 7 charaters" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    //creat new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      age,
      bio,
    });
    const saveUser = await newUser.save();
    res.status(201).json({ message: "user created successfully", saveUser });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err });
  }
};

//login user
const Userlogin = async (req, res) => {
  try {
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

    const token = jwt.sign(
      { _id: user._id, email: user.email },
      process.env.TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        age: user.age,
        bio: user.bio,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "something went wrong on the Server",
      error: err.message,
    });
  }
};

const profile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user }); // always return user object
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//get all user
const getUsers = async (req, res) => {
  const users = await User.find();
  if (!users) return res.status(404).send("user not found");
  res.status(200).send(users);
};

//get user byID
const getUser = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send("user id required");
  const userId = await User.findById(id);
  if (!userId) return res.status(404).send("user not found or wrong id");
  res.status(200).send(userId);
};

//get user by user name
const getUserByName = async (req, res) => {
  const { username } = req.params;
  if (!username) return res.status(400).send("username is required");

  const user = await User.findOne({
    username: { $regex: req.params.username, $options: "i" },
  });

  if (!user) return res.status(404).send("user not found or wrong username");
  res.status(200).send(user);
};

//update user info

const putUser = async (req, res) => {
  const { id } = req.params;
  const { username, email, password, age, bio } = req.body;
  if (!id) return res.status("user id required");

  const { error } = updateValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);
  const updateData = {};
  if (username) updateData.username = username;
  if (email) updateData.email = email;
  if (age) updateData.age = age;
  if (bio) updateData.bio = bio;
  if (password) {
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(password, salt);
  }
  const updatedUser = await User.findByIdAndUpdate(id, updateData, {
    new: true,
  });
  if (!updatedUser) return res.status(404).send("user not found");
  res.status(200).send(updatedUser);
};

//update by username
const putUserByName = async (req, res) => {
  const { username } = req.params;

  if (!username) return res.status(400).send("username required");

  const { newUsername, email, password, age, bio } = req.body;
  const updateData = {};
  if (newUsername) updateData.username = newUsername;
  if (email) updateData.email = email;
  if (age) updateData.age = age;
  if (bio) updateData.bio = bio;
  if (password) {
    const salt = await bcrypt.genSalt(10);
    updateData.password = await bcrypt.hash(password, salt);
  }

  const updatedUser = await User.findOneAndUpdate({ username }, updateData, {
    new: true,
  });
  if (!updatedUser) return res.status(404).send("user not found");
  const token = jwt.sign(
    {
      _id: updatedUser._id,
      email: updatedUser.email,
      age: updatedUser.age,
      bio: updatedUser.bio,
    },
    process.env.TOKEN_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    token,
    user: {
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      age: updatedUser.age,
      bio: updatedUser.bio,
    },
  });
};

//delete user info

const deleteUser = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).send("userId is required");

  const deletedUser = await User.findByIdAndDelete(id);
  if (!deletedUser) return res.status(404).send("user not found");
  res.status(200).send("user deleted successfully");
};

//delete user by name
const deleteUserByName = async (req, res) => {
  const { username } = req.params;
  if (!username) return res.status(400).send("username required");

  const deletedUser = await User.findOneAndDelete({ username });
  if (!deletedUser) return res.status(404).send("user not found");
  res.status(200).send("user deleted");
};

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
