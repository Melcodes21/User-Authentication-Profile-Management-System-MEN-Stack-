const Joi = require("joi");

const registerValidation = (data) => {
  const schema = Joi.object({
    username: Joi.string().required().min(3).max(255),
    email: Joi.string().required().min(6).email(),
    password: Joi.string().required().min(6).max(1024),
    age: Joi.number().allow(null, "").optional(),
    bio: Joi.string().allow("").optional(),
  });
  return schema.validate(data);
};

const loginValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string().required().min(6).email(),
    password: Joi.string().required().min(6).max(1024),
  });
  return schema.validate(data);
};

//Validation for updating a user
const updateValidation = (data) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(255),
    email: Joi.string().email().optional(),
    password: Joi.string().min(6).max(1024),
    age: Joi.number(),
    bio: Joi.string().max(1024).optional(),
  });
  return schema.validate(data);
};
module.exports = { registerValidation, loginValidation, updateValidation };
