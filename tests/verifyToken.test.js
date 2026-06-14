const jwt = require("jsonwebtoken");
const verifyToken = require("../verifyToken");

jest.mock("jsonwebtoken");

describe("verifyToken middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = { header: jest.fn() };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    process.env.TOKEN_SECRET = "testsecret";
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if no Authorization header is present", () => {
    req.header.mockReturnValue(undefined);

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Access Denied!!!" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if Authorization header has no token after Bearer", () => {
    req.header.mockReturnValue("Bearer ");

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Access Denied!!!" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 400 if token is invalid", () => {
    req.header.mockReturnValue("Bearer invalidtoken");
    jwt.verify.mockImplementation(() => {
      throw new Error("invalid token");
    });

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid Token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next() and set req.user if token is valid", () => {
    const payload = { _id: "user123", email: "test@example.com" };
    req.header.mockReturnValue("Bearer validtoken");
    jwt.verify.mockReturnValue(payload);

    verifyToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith("validtoken", "testsecret");
    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalled();
  });

  it("should extract token correctly from 'Bearer <token>' format", () => {
    const payload = { _id: "user456", email: "user@test.com" };
    req.header.mockReturnValue("Bearer mytoken123");
    jwt.verify.mockReturnValue(payload);

    verifyToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith("mytoken123", "testsecret");
  });

  it("should use TOKEN_SECRET from environment", () => {
    process.env.TOKEN_SECRET = "differentsecret";
    const payload = { _id: "user789" };
    req.header.mockReturnValue("Bearer sometoken");
    jwt.verify.mockReturnValue(payload);

    verifyToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith("sometoken", "differentsecret");
  });
});
