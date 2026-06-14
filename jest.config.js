module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: [
    "userController.js",
    "validation.js",
    "verifyToken.js",
    "user.js",
    "auth.js",
    "server.js",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "login.js",
    "profile.js",
    "register.js",
    "updateinfo.js",
  ],
  moduleNameMapper: {
    "^../model/user$": "<rootDir>/user.js",
    "^../utils/validation$": "<rootDir>/validation.js",
    "^../utils/verifyToken$": "<rootDir>/verifyToken.js",
    "^../controller/userController$": "<rootDir>/userController.js",
  },
};
