const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "tuemail@gmail.com",
    pass: "tucontraseña"
  }
});

module.exports = transporter;
