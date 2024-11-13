import { Router } from "express";
import {
  updateProfile,
  getProfile,
  getAllProfiles,
} from "../controllers/profileController.js";
import uploadMiddleware from "../middlewares/uploadMiddleware.js";
const router = Router();
// import multer, { memoryStorage } from "multer";
// const upload = multer({ storage: memoryStorage() }); // For profile image upload

// Route to update or create a profile, with support for image upload
router.put("/editProfile/:userId", uploadMiddleware, updateProfile);

// Route to get a single profile by userId
router.get("/getProfile/:userId", getProfile);

// Route to get all profiles
router.get("/getAllProfiles", getAllProfiles);

export default router;
