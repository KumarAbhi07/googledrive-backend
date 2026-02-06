import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  resetToken: String,
  resetTokenExpiry: Date,
}, { timestamps: true });

export default mongoose.model("User", userSchema);
