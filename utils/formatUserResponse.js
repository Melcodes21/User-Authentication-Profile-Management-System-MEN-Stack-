const formatUserResponse = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  age: user.age,
  bio: user.bio,
});

module.exports = formatUserResponse;
