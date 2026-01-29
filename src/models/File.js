import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fileName: String,
  s3Key: String,
  size: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("File", fileSchema);
