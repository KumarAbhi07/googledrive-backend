import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  firstName: String,
  lastName: String,
  password: String,
  isActive: { type: Boolean, default: false },
  activationToken: String,
  resetToken: String,
  resetTokenExpiry: Date,
}, { timestamps: true });

export default mongoose.model("User", userSchema);
