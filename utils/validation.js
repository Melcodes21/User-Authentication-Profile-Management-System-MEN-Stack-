const Joi = require("joi");

// 🔹 Transaction Validation
const transactionValidation = (data) => {
  const schema = Joi.object({
    sender: Joi.string()
      .min(3)
      .pattern(/^07[2389][0-9]{7}$/)
      .min(10)
      .max(10)
      .required(),

    receiver: Joi.string()
      .min(3)
      .pattern(/^07[2389][0-9]{7}$/)
      .min(10)
      .max(10)
      .required(),

    amount: Joi.number().positive().required(),

    type: Joi.string().valid("send", "withdraw", "deposit").required(),

    currency: Joi.string().uppercase().length(3).required(),

    location: Joi.string().required(),

    deviceId: Joi.string().optional(),

    pin: Joi.string().length(4).required(), // 🔐 ADD PIN HERE
  });

  return schema.validate(data);
};

// 🔹 User Validation
const userValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().required(),

    phoneNumber: Joi.string()
      .pattern(/^07[2389][0-9]{7}$/)
      .min(10)
      .max(10) // keeps 078...
      .required(),

    pin: Joi.string()
      .length(4)
      .pattern(/^[0-9]{4}$/)
      .required(),
  });

  return schema.validate(data);
};

// ✅ EXPORT BOTH CORRECTLY
module.exports = {
  transactionValidation,
  userValidation,
};
