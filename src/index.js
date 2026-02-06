import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import session from "express-session";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import fileRoutes from "./routes/file.routes.js";
import s3 from "./config/s3.js";
import passport from "./config/passport.js";

dotenv.config();
connectDB();


(async () => {
  try {
    await s3.listBuckets().promise();
    console.log("AWS AUTH SUCCESS");
  } catch (err) {
    console.error("AWS S3 Connection Failed:", err.message);
  }
})();

const app = express();

app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Session configuration for passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);


app.get("/api/health", (req, res) => {
  res.json({ message: "Server is running" });
});


app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

app.listen(process.env.PORT, () =>
  console.log(`Server running on http://localhost:${process.env.PORT}`)
);
