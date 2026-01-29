import User from "../models/User.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

export const register = async (req, res) => {
  const { email, firstName, lastName, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);
  const token = crypto.randomBytes(32).toString("hex");

  const user = await User.create({
    email,
    firstName,
    lastName,
    password: hashed,
    activationToken: token,
  });

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const link = `${process.env.CLIENT_URL}/activate/${token}`;

  await transporter.sendMail({
    to: email,
    subject: "Activate your Google Drive account",
    html: `<a href="${link}">Activate Account</a>`,
  });

  res.json({ message: "Activation email sent" });
};
