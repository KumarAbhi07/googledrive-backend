import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";

export const register = async (req, res) => {
  const { email, firstName, lastName, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const activationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      email,
      firstName,
      lastName,
      password: hashedPassword,
      activationToken,
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const activationLink = `${process.env.CLIENT_URL}/activate/${activationToken}`;

    await transporter.sendMail({
      to: email,
      subject: "Activate your Google Drive account",
      html: `<p>Click to activate:</p><a href="${activationLink}">${activationLink}</a>`,
    });

    res.status(201).json({
      message: "Registration successful. Check email to activate account.",
    });
  } catch (err) {
    res.status(500).json({ message: "Registration failed" });
  }
};

export const activateAccount = async (req, res) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({ activationToken: token });

    if (!user) {
      return res.status(400).json({ message: "Invalid activation token" });
    }

    user.isActive = true;
    user.activationToken = null;
    await user.save();

    res.json({ message: "Account activated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Activation failed" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Please activate your account" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: "Login failed" });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    await transporter.sendMail({
      to: email,
      subject: "Reset your password",
      html: `<a href="${resetLink}">Reset Password</a>`,
    });

    res.json({ message: "Password reset link sent" });
  } catch (err) {
    res.status(500).json({ message: "Failed to send reset link" });
  }
};

export const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Password reset failed" });
  }
};

// TEST ENDPOINT - Remove in production
export const testActivate = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.isActive = true;
    user.activationToken = null;
    await user.save();
    res.json({ message: "User activated for testing" });
  } catch (err) {
    res.status(500).json({ message: "Activation failed" });
  }
};
