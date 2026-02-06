import s3 from "../config/s3.js";
import File from "../models/File.js";
import fs from "fs/promises";
import path from "path";



export const uploadFile = async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user?.id;
    const useLocalStorage = process.env.USE_LOCAL_STORAGE === "true";

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const storageKey = `${Date.now()}-${file.originalname}`;

    if (useLocalStorage) {
      const uploadsRoot = path.resolve("uploads");
      const targetPath = path.join(uploadsRoot, storageKey.replace(/^uploads[\\/]/, ""));
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, file.buffer);
    } else {
      if (!process.env.AWS_BUCKET_NAME) {
        return res.status(500).json({ message: "AWS bucket not configured" });
      }

      await s3
        .upload({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: storageKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
        .promise();
    }

    const savedFile = await File.create({
      userId,
      fileName: file.originalname,
      s3Key: storageKey,
      size: file.size,
    });

    res.status(201).json({
      message: "File uploaded successfully",
      file: savedFile,
    });
  } catch (error) {
    console.error("File upload error:", error);
    const detailedMessage =
      error?.message ? `File upload failed: ${error.message}` : "File upload failed";
    res.status(500).json({
      message: detailedMessage,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
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
    const useLocalStorage = process.env.USE_LOCAL_STORAGE === "true";

    const file = await File.findOne({ _id: fileId, userId });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    if (useLocalStorage) {
      const uploadsRoot = path.resolve("uploads");
      const targetPath = path.join(uploadsRoot, file.s3Key.replace(/^uploads[\\/]/, ""));
      return res.download(targetPath, file.fileName);
    }

    const url = s3.getSignedUrl("getObject", {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: file.s3Key,
      Expires: 60,
      ResponseContentDisposition: `attachment; filename="${file.fileName}"`,
      ResponseContentType: "application/octet-stream",
    });

    res.json({ url });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate download link" });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;
    const useLocalStorage = process.env.USE_LOCAL_STORAGE === "true";

    const file = await File.findOne({ _id: fileId, userId });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    if (!useLocalStorage && process.env.AWS_BUCKET_NAME) {
      await s3
        .deleteObject({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: file.s3Key,
        })
        .promise();
    } else if (useLocalStorage) {
      const uploadsRoot = path.resolve("uploads");
      const targetPath = path.join(uploadsRoot, file.s3Key.replace(/^uploads[\\/]/, ""));
      try {
        await fs.unlink(targetPath);
      } catch (err) {
        console.log("File already deleted from disk");
      }
    }

    await File.deleteOne({ _id: fileId });

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("File deletion error:", error);
    res.status(500).json({ message: "Failed to delete file" });
  }
};
