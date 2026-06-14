const hashPassword = require("./hashPassword");

const buildUpdateData = async ({ username, email, password, age, bio }) => {
  const updateData = {};
  if (username) updateData.username = username;
  if (email) updateData.email = email;
  if (age) updateData.age = age;
  if (bio) updateData.bio = bio;
  if (password) {
    updateData.password = await hashPassword(password);
  }
  return updateData;
};

module.exports = buildUpdateData;
