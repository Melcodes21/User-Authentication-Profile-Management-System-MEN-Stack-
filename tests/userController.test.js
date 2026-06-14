const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

jest.mock("bcryptjs");
jest.mock("jsonwebtoken");
jest.mock("../user");
jest.mock("../validation");

const User = require("../user");
const {
  registerValidation,
  loginValidation,
  updateValidation,
} = require("../validation");

// We need to require userController after mocks are set up
// but the controller requires from relative paths like "../model/user"
// Since all files are at root level, we need to handle this carefully.
// Let's use jest.mock with moduleNameMapper or manual require resolution.

// Actually the userController.js uses require("../model/user") etc. which won't resolve
// from root. Let me create a version that requires correctly for testing.

// Instead, let's mock the module resolution by using jest moduleNameMapper
// or better yet, test the controller functions by re-implementing the require paths.

// The simplest approach: since the userController.js has require paths that reference
// subdirectories (../model/user, ../utils/validation), but files are at root,
// we need to set up module aliases. Let's use jest.config.js for this.

describe("userController", () => {
  let postUser, Userlogin, profile, getUsers, getUser, getUserByName;
  let putUser, putUserByName, deleteUser, deleteUserByName;
  let req, res;

  beforeAll(() => {
    // Mock the module resolution for the controller's internal requires
    jest.doMock("../model/user", () => User, { virtual: true });
    jest.doMock("../utils/validation", () => ({
      registerValidation,
      loginValidation,
      updateValidation,
    }), { virtual: true });
    jest.doMock("../utils/verifyToken", () => jest.fn(), { virtual: true });

    const controller = require("../userController");
    postUser = controller.postUser;
    Userlogin = controller.Userlogin;
    profile = controller.profile;
    getUsers = controller.getUsers;
    getUser = controller.getUser;
    getUserByName = controller.getUserByName;
    putUser = controller.putUser;
    putUserByName = controller.putUserByName;
    deleteUser = controller.deleteUser;
    deleteUserByName = controller.deleteUserByName;
  });

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      user: { _id: "user123" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    process.env.TOKEN_SECRET = "testsecret";
    jest.clearAllMocks();
  });

  describe("postUser (register)", () => {
    it("should return 400 if validation fails", async () => {
      registerValidation.mockReturnValue({
        error: { details: [{ message: "validation error" }] },
      });

      req.body = { username: "ab", email: "bad", password: "123" };
      await postUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("validation error");
    });

    it("should return 400 if username already exists", async () => {
      registerValidation.mockReturnValue({ error: null });
      req.body = {
        username: "existinguser",
        email: "test@example.com",
        password: "password123",
      };
      User.findOne.mockResolvedValueOnce({ username: "existinguser" });

      await postUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("Username already exist");
    });

    it("should return 400 if email already exists", async () => {
      registerValidation.mockReturnValue({ error: null });
      req.body = {
        username: "newuser",
        email: "existing@example.com",
        password: "password123",
      };
      User.findOne
        .mockResolvedValueOnce(null) // username check
        .mockResolvedValueOnce({ email: "existing@example.com" }); // email check

      await postUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("Email already exist");
    });

    it("should return 400 if password is too short", async () => {
      registerValidation.mockReturnValue({ error: null });
      req.body = {
        username: "newuser",
        email: "new@example.com",
        password: "12345",
      };
      User.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await postUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should create user successfully with valid data", async () => {
      registerValidation.mockReturnValue({ error: null });
      req.body = {
        username: "newuser",
        email: "new@example.com",
        password: "password123",
        age: 25,
        bio: "Hello",
      };
      User.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("hashedpassword");

      const mockSave = jest.fn().mockResolvedValue({
        _id: "newid",
        username: "newuser",
        email: "new@example.com",
        password: "hashedpassword",
        age: 25,
        bio: "Hello",
      });
      User.mockImplementation(() => ({ save: mockSave }));

      await postUser(req, res);

      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", "salt");
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "user created successfully" })
      );
    });

    it("should return 400 if required fields are missing", async () => {
      registerValidation.mockReturnValue({ error: null });
      req.body = { username: "user", email: "e@e.com" }; // no password

      await postUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        "username,email , password are required"
      );
    });

    it("should return 500 on server error during save", async () => {
      registerValidation.mockReturnValue({ error: null });
      req.body = {
        username: "newuser",
        email: "new@example.com",
        password: "password123",
      };
      User.findOne
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error("DB error"));

      await postUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("Userlogin", () => {
    it("should return 400 if login validation fails", async () => {
      loginValidation.mockReturnValue({
        error: { details: [{ message: "email is required" }] },
      });

      req.body = { password: "password123" };
      await Userlogin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "email is required" });
    });

    it("should return 404 if user not found", async () => {
      loginValidation.mockReturnValue({ error: null });
      req.body = { email: "notfound@example.com", password: "password123" };
      User.findOne.mockResolvedValue(null);

      await Userlogin(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("should return 400 if password is invalid", async () => {
      loginValidation.mockReturnValue({ error: null });
      req.body = { email: "test@example.com", password: "wrongpassword" };
      User.findOne.mockResolvedValue({
        _id: "user1",
        email: "test@example.com",
        password: "hashedpassword",
      });
      bcrypt.compare.mockResolvedValue(false);

      await Userlogin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid password" });
    });

    it("should return token and user data on successful login", async () => {
      loginValidation.mockReturnValue({ error: null });
      req.body = { email: "test@example.com", password: "password123" };
      User.findOne.mockResolvedValue({
        _id: "user1",
        username: "testuser",
        email: "test@example.com",
        password: "hashedpassword",
        age: 25,
        bio: "Hello",
      });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue("mocked-jwt-token");

      await Userlogin(req, res);

      expect(jwt.sign).toHaveBeenCalledWith(
        { _id: "user1", email: "test@example.com" },
        "testsecret",
        { expiresIn: "1h" }
      );
      expect(res.json).toHaveBeenCalledWith({
        token: "mocked-jwt-token",
        user: {
          _id: "user1",
          username: "testuser",
          email: "test@example.com",
          age: 25,
          bio: "Hello",
        },
      });
    });

    it("should return 400 if email and password are missing", async () => {
      loginValidation.mockReturnValue({ error: null });
      req.body = {};

      await Userlogin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email and password required",
      });
    });

    it("should return 500 on server error", async () => {
      loginValidation.mockReturnValue({ error: null });
      req.body = { email: "test@example.com", password: "password123" };
      User.findOne.mockRejectedValue(new Error("DB error"));

      await Userlogin(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "something went wrong on the Server",
        })
      );
    });
  });

  describe("profile", () => {
    it("should return user profile data", async () => {
      const mockUser = {
        _id: "user123",
        username: "testuser",
        email: "test@example.com",
      };
      User.findById.mockResolvedValue(mockUser);

      await profile(req, res);

      expect(User.findById).toHaveBeenCalledWith("user123");
      expect(res.json).toHaveBeenCalledWith({ user: mockUser });
    });

    it("should return 404 if user not found", async () => {
      User.findById.mockResolvedValue(null);

      await profile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("should return 500 on server error", async () => {
      User.findById.mockRejectedValue(new Error("DB error"));

      await profile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "DB error" });
    });
  });

  describe("getUsers", () => {
    it("should return all users", async () => {
      const mockUsers = [
        { _id: "1", username: "user1" },
        { _id: "2", username: "user2" },
      ];
      User.find.mockResolvedValue(mockUsers);

      await getUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockUsers);
    });

    it("should return 404 if no users found", async () => {
      User.find.mockResolvedValue(null);

      await getUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith("user not found");
    });
  });

  describe("getUser (by ID)", () => {
    it("should return user by ID", async () => {
      const mockUser = { _id: "abc123", username: "testuser" };
      req.params = { id: "abc123" };
      User.findById.mockResolvedValue(mockUser);

      await getUser(req, res);

      expect(User.findById).toHaveBeenCalledWith("abc123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockUser);
    });

    it("should return 404 if user not found by ID", async () => {
      req.params = { id: "nonexistent" };
      User.findById.mockResolvedValue(null);

      await getUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith("user not found or wrong id");
    });

    it("should return 400 if no id provided", async () => {
      req.params = {};

      await getUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("user id required");
    });
  });

  describe("getUserByName", () => {
    it("should return user by username", async () => {
      const mockUser = { _id: "1", username: "testuser" };
      req.params = { username: "testuser" };
      User.findOne.mockResolvedValue(mockUser);

      await getUserByName(req, res);

      expect(User.findOne).toHaveBeenCalledWith({
        username: { $regex: "testuser", $options: "i" },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockUser);
    });

    it("should return 404 if user not found by username", async () => {
      req.params = { username: "nonexistent" };
      User.findOne.mockResolvedValue(null);

      await getUserByName(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith("user not found or wrong username");
    });

    it("should return 400 if username not provided", async () => {
      req.params = {};

      await getUserByName(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("username is required");
    });
  });

  describe("putUser (update by ID)", () => {
    it("should update user successfully", async () => {
      req.params = { id: "user123" };
      req.body = { username: "updateduser", email: "updated@example.com" };
      updateValidation.mockReturnValue({ error: null });
      User.findByIdAndUpdate.mockResolvedValue({
        _id: "user123",
        username: "updateduser",
        email: "updated@example.com",
      });

      await putUser(req, res);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        { username: "updateduser", email: "updated@example.com" },
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should hash password when updating", async () => {
      req.params = { id: "user123" };
      req.body = { password: "newpassword" };
      updateValidation.mockReturnValue({ error: null });
      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("newhashedpassword");
      User.findByIdAndUpdate.mockResolvedValue({
        _id: "user123",
        password: "newhashedpassword",
      });

      await putUser(req, res);

      expect(bcrypt.hash).toHaveBeenCalledWith("newpassword", "salt");
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        { password: "newhashedpassword" },
        { new: true }
      );
    });

    it("should return 400 if update validation fails", async () => {
      req.params = { id: "user123" };
      req.body = { username: "ab" };
      updateValidation.mockReturnValue({
        error: { details: [{ message: "username too short" }] },
      });

      await putUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("username too short");
    });

    it("should return 404 if user not found for update", async () => {
      req.params = { id: "nonexistent" };
      req.body = { username: "newname" };
      updateValidation.mockReturnValue({ error: null });
      User.findByIdAndUpdate.mockResolvedValue(null);

      await putUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith("user not found");
    });
  });

  describe("deleteUser (by ID)", () => {
    it("should delete user successfully", async () => {
      req.params = { id: "user123" };
      User.findByIdAndDelete.mockResolvedValue({ _id: "user123" });

      await deleteUser(req, res);

      expect(User.findByIdAndDelete).toHaveBeenCalledWith("user123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith("user deleted successfully");
    });

    it("should return 404 if user not found for deletion", async () => {
      req.params = { id: "nonexistent" };
      User.findByIdAndDelete.mockResolvedValue(null);

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith("user not found");
    });

    it("should return 400 if no id provided", async () => {
      req.params = {};

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("userId is required");
    });
  });

  describe("deleteUserByName", () => {
    it("should delete user by username successfully", async () => {
      req.params = { username: "testuser" };
      User.findOneAndDelete.mockResolvedValue({ username: "testuser" });

      await deleteUserByName(req, res);

      expect(User.findOneAndDelete).toHaveBeenCalledWith({
        username: "testuser",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith("user deleted");
    });

    it("should return 404 if user not found for deletion by name", async () => {
      req.params = { username: "nonexistent" };
      User.findOneAndDelete.mockResolvedValue(null);

      await deleteUserByName(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith("user not found");
    });

    it("should return 400 if username not provided", async () => {
      req.params = {};

      await deleteUserByName(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("username required");
    });
  });

  describe("putUserByName (update by username)", () => {
    it("should update user by username successfully", async () => {
      req.params = { username: "testuser" };
      req.body = { newUsername: "updateduser", email: "new@example.com" };
      const updatedUser = {
        _id: "user1",
        username: "updateduser",
        email: "new@example.com",
        age: 25,
        bio: "bio",
      };
      User.findOneAndUpdate.mockResolvedValue(updatedUser);
      jwt.sign.mockReturnValue("new-token");

      await putUserByName(req, res);

      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        { username: "testuser" },
        { username: "updateduser", email: "new@example.com" },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith({
        token: "new-token",
        user: {
          _id: "user1",
          username: "updateduser",
          email: "new@example.com",
          age: 25,
          bio: "bio",
        },
      });
    });

    it("should return 404 if user not found for update by name", async () => {
      req.params = { username: "nonexistent" };
      req.body = { newUsername: "newname" };
      User.findOneAndUpdate.mockResolvedValue(null);

      await putUserByName(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith("user not found");
    });

    it("should return 400 if username param is missing", async () => {
      req.params = {};
      req.body = { newUsername: "newname" };

      await putUserByName(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("username required");
    });

    it("should hash password when updating by username", async () => {
      req.params = { username: "testuser" };
      req.body = { password: "newpass123" };
      bcrypt.genSalt.mockResolvedValue("salt");
      bcrypt.hash.mockResolvedValue("hashedpass");
      const updatedUser = {
        _id: "user1",
        username: "testuser",
        email: "test@example.com",
        age: null,
        bio: null,
      };
      User.findOneAndUpdate.mockResolvedValue(updatedUser);
      jwt.sign.mockReturnValue("token");

      await putUserByName(req, res);

      expect(bcrypt.hash).toHaveBeenCalledWith("newpass123", "salt");
    });
  });
});
