import express from "express";
import upload from "../config/multer.js";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  uploadFile,
  getUserFiles,
  downloadFile,
  deleteFile,
} from "../controllers/file.controller.js";

const router = express.Router();

router.post("/upload", authMiddleware, upload.single("file"), uploadFile);
router.get("/", authMiddleware, getUserFiles);
router.get("/download/:fileId", authMiddleware, downloadFile);
router.delete("/:fileId", authMiddleware, deleteFile);

export default router;
