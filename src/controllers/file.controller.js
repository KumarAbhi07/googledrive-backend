import s3 from "../config/s3.js";
import File from "../models/File.js";

export const uploadFile = async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user.id;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const s3Key = `uploads/${userId}/${Date.now()}-${file.originalname}`;

    await s3
      .upload({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,
      })
      .promise();

    const savedFile = await File.create({
      userId,
      fileName: file.originalname,
      s3Key,
      size: file.size,
    });

    res.status(201).json({
      message: "File uploaded successfully",
      file: savedFile,
    });
  } catch (error) {
    res.status(500).json({ message: "File upload failed" });
  }
};

export const getUserFiles = async (req, res) => {
  try {
    const userId = req.user.id;

    const files = await File.find({ userId }).sort({ createdAt: -1 });

    res.json(files);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch files" });
  }
};

export const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const file = await File.findOne({ _id: fileId, userId });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const url = s3.getSignedUrl("getObject", {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: file.s3Key,
      Expires: 60, // 1 minute
    });

    res.json({ url });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate download link" });
  }
};
