const {
  registerValidation,
  loginValidation,
  updateValidation,
} = require("../validation");

describe("registerValidation", () => {
  it("should pass with valid registration data", () => {
    const data = {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
    };
    const { error } = registerValidation(data);
    expect(error).toBeUndefined();
  });

  it("should pass with all optional fields included", () => {
    const data = {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      age: 25,
      bio: "Hello world",
    };
    const { error } = registerValidation(data);
    expect(error).toBeUndefined();
  });

  it("should fail when username is missing", () => {
    const data = {
      email: "test@example.com",
      password: "password123",
    };
    const { error } = registerValidation(data);
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("username");
  });

  it("should fail when email is missing", () => {
    const data = {
      username: "testuser",
      password: "password123",
    };
    const { error } = registerValidation(data);
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("email");
  });

  it("should fail when password is missing", () => {
    const data = {
      username: "testuser",
      email: "test@example.com",
    };
    const { error } = registerValidation(data);
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("password");
  });

  it("should fail when username is too short (less than 3 chars)", () => {
    const data = {
      username: "ab",
      email: "test@example.com",
      password: "password123",
    };
    const { error } = registerValidation(data);
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("username");
  });

  it("should fail when email is invalid", () => {
    const data = {
      username: "testuser",
      email: "notanemail",
      password: "password123",
    };
    const { error } = registerValidation(data);
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("email");
  });

  it("should fail when password is too short (less than 6 chars)", () => {
    const data = {
      username: "testuser",
      email: "test@example.com",
      password: "12345",
    };
    const { error } = registerValidation(data);
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("password");
  });

  it("should allow null or empty age", () => {
    const data = {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      age: null,
    };
    const { error } = registerValidation(data);
    expect(error).toBeUndefined();
  });

  it("should allow empty bio", () => {
    const data = {
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      bio: "",
    };
    const { error } = registerValidation(data);
    expect(error).toBeUndefined();
  });
});

describe("loginValidation", () => {
  it("should pass with valid login data", () => {
    const data = {
      email: "test@example.com",
      password: "password123",
    };
    const { error } = loginValidation(data);
    expect(error).toBeUndefined();
  });

  it("should fail when email is missing", () => {
    const data = {
      password: "password123",
    };
    const { error } = loginValidation(data);
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("email");
  });

  it("should fail when password is missing", () => {
    const data = {
      email: "test@example.com",
    };
    const { error } = loginValidation(data);
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("password");
  });

  it("should fail when email is invalid", () => {
    const data = {
      email: "invalid",
      password: "password123",
    };
    const { error } = loginValidation(data);
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("email");
  });

  it("should fail when password is too short", () => {
    const data = {
      email: "test@example.com",
      password: "12345",
    };
    const { error } = loginValidation(data);
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("password");
  });

  it("should fail with extra fields not in schema", () => {
    const data = {
      email: "test@example.com",
      password: "password123",
      extra: "notallowed",
    };
    const { error } = loginValidation(data);
    expect(error).toBeDefined();
  });
});

describe("updateValidation", () => {
  it("should pass with valid update data (username only)", () => {
    const data = {
      username: "newname",
    };
    const { error } = updateValidation(data);
    expect(error).toBeUndefined();
  });

  it("should pass with valid update data (all fields)", () => {
    const data = {
      username: "newname",
      email: "new@example.com",
      password: "newpassword123",
      age: 30,
      bio: "Updated bio",
    };
    const { error } = updateValidation(data);
    expect(error).toBeUndefined();
  });

  it("should pass with empty body (no fields required)", () => {
    const data = {};
    const { error } = updateValidation(data);
    expect(error).toBeUndefined();
  });

  it("should fail when username is too short", () => {
    const data = {
      username: "ab",
    };
    const { error } = updateValidation(data);
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("username");
  });

  it("should fail when email is invalid", () => {
    const data = {
      email: "notvalid",
    };
    const { error } = updateValidation(data);
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("email");
  });

  it("should fail when password is too short", () => {
    const data = {
      password: "123",
    };
    const { error } = updateValidation(data);
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("password");
  });

  it("should pass with valid age", () => {
    const data = {
      age: 25,
    };
    const { error } = updateValidation(data);
    expect(error).toBeUndefined();
  });

  it("should fail with non-numeric age", () => {
    const data = {
      age: "not-a-number",
    };
    const { error } = updateValidation(data);
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("age");
  });
});
