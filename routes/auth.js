import express from "express";
import {
  login,
  signUp,
  forgotPassword,
  verifyOTP,
  resetPassword,
  verifyEmailOTP,
  resendOTP, // Import resendOTP
} from "../controllers/authController.js";

const router = express.Router();

router.post("/signUp", signUp);
router.post("/login", login);
router.post("/forgotPassword", forgotPassword);
router.post("/verifyOTP", verifyOTP);
router.post("/resetPassword", resetPassword);
router.post("/verifyEmailOTP", verifyEmailOTP);
router.post("/resendOTP", resendOTP);

export default router;
