import multer from "multer";
import path from "path";

// Configure storage to use userId as the filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // Ensure userId is available; otherwise, throw an error
    if (!req.params.userId) {
      return cb(new Error("User ID is required in the request parameters"));
    }

    // Use userId as the filename and keep the original file extension
    const userId = req.params.userId;
    const extension = path.extname(file.originalname);
    cb(null, `${userId}${extension}`);
  },
});

// Initialize Multer with disk storage and file restrictions
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error("Only .png, .jpg, and .jpeg formats are allowed."));
    }
  },
});

// Middleware function to handle file uploads and errors
const uploadMiddleware = (req, res, next) => {
  const singleUpload = upload.single("profileImage");

  singleUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ error: "File size should be under 2 MB." });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

export default uploadMiddleware;
