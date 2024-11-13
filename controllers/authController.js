import "dotenv/config";
import { auth, db } from "../config/firebase.js"; // Firebase and Firestore config
import nodemailer from "nodemailer";
import fetch from "node-fetch";
import { Timestamp } from "firebase-admin/firestore";

// Configure Nodemailer for sending emails
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Generate random OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

// --- Sign Up with OTP for email verification ---
export const signUp = async (req, res) => {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name) {
    return res
      .status(400)
      .json({ message: "Name, email, and password are required." });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters long." });
  }

  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    const otp = generateOTP();
    const otpData = { otp, createdAt: Timestamp.now() };
    await db.collection("emailVerificationOTPs").doc(email).set(otpData);

    const userRole = role || "client";
    const userData = {
      uid: userRecord.uid,
      email,
      name,
      role: userRole,
      emailVerified: false,
      createdAt: Timestamp.now(),
    };
    await db.collection("users").doc(userRecord.uid).set(userData);

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: "Verify Your Email Address",
      text: `Your OTP for email verification is: ${otp}. It is valid for 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending OTP email:", err);
        return res.status(500).json({
          message: "Failed to send verification OTP. Please try again later.",
        });
      } else {
        console.log("Verification OTP email sent:", info.response);
        return res.status(201).json({
          uid: userRecord.uid,
          email: userRecord.email,
          name: userRecord.displayName,
          role: userRole,
          message:
            "User registered successfully! A verification OTP has been sent.",
        });
      }
    });
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      res.status(400).json({ message: "Email is already in use." });
    } else {
      console.error("Sign-up error:", error.message);
      res
        .status(500)
        .json({ message: "Internal server error.", error: error.message });
    }
  }
};

// --- Resend OTP for Email Verification ---
export const resendOTP = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    const userRecord = await auth.getUserByEmail(email);

    const otp = generateOTP();
    const otpData = { otp, createdAt: Timestamp.now() };

    await db.collection("emailVerificationOTPs").doc(email).set(otpData);

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: "Resend: Verify Your Email Address",
      text: `Your new OTP for email verification is: ${otp}. It is valid for 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error resending OTP email:", err);
        return res.status(500).json({
          message: "Failed to resend OTP. Please try again later.",
        });
      } else {
        console.log("Resend OTP email sent:", info.response);
        return res.status(200).json({
          message: "A new OTP has been sent to your email address.",
        });
      }
    });
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      res.status(400).json({ message: "Email is not registered." });
    } else {
      console.error("Resend OTP error:", error.message);
      res
        .status(500)
        .json({ message: "Internal server error.", error: error.message });
    }
  }
};

// --- Verify Email OTP to complete email verification ---
export const verifyEmailOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  try {
    const otpDoc = await db
      .collection("emailVerificationOTPs")
      .doc(email)
      .get();
    if (!otpDoc.exists) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    const { otp: storedOTP, createdAt } = otpDoc.data();
    const now = Timestamp.now();
    const timeDifference = now.toMillis() - createdAt.toMillis();

    if (timeDifference > 10 * 60 * 1000) {
      return res.status(400).json({ message: "OTP is expired." });
    }

    if (storedOTP !== parseInt(otp)) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    const user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, { emailVerified: true });
    await db.collection("users").doc(user.uid).update({ emailVerified: true });

    await db.collection("emailVerificationOTPs").doc(email).delete();

    res.status(200).json({ message: "Email verified successfully." });
  } catch (error) {
    console.error("Error in email OTP verification:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};

// --- Login ---
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const firebaseApiKey = process.env.FIREBASE_API_KEY;

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const data = await response.json();

    console.log(data);

    if (data.error) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const userRecord = await auth.getUser(data.localId);

    if (!userRecord.emailVerified) {
      // Resend OTP if the account is not verified
      await resendOTP(
        { body: { email } },
        {
          status: (code) => ({
            json: (data) => ({ statusCode: code, ...data }),
          }),
        }
      );

      return res.status(403).json({
        message: "Account not verified. A new OTP has been sent to your email.",
      });
    }

    // Retrieve user data from Firestore
    const userDoc = await db.collection("users").doc(data.localId).get();

    if (!userDoc.exists) {
      return res
        .status(404)
        .json({ message: "User data not found in Firestore." });
    }

    const userData = userDoc.data();

    console.log(userData);

    const user = {
      uid: userData.uid,
      email: userData.email,
      name: userData.name,
      role: userData.user,
      ...userData, // Add all Firestore user data to the user object
    };

    res.status(200).json({
      token: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      user,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};

// --- Forgot Password - Step 1: Send OTP ---
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }
  try {
    // Check if user exists and if email is verified
    const userRecord = await auth.getUserByEmail(email);

    if (!userRecord) {
      return res
        .status(404)
        .json({ message: "User with this email does not exist." });
    }
    if (!userRecord.emailVerified) {
      // Resend OTP if the account is not verified
      // Call resendOTP by creating mock req and res objects
      await resendOTP(
        { body: { email } }, // mock req object
        {
          status: (code) => ({
            json: (data) => ({ statusCode: code, ...data }),
          }),
        } // mock res object
      );

      return res.status(403).json({
        message: "Account not verified. A new OTP has been sent to your email.",
      });
    }

    // Check if an OTP was recently generated
    const otpDoc = await db.collection("passwordResetOTPs").doc(email).get();
    if (otpDoc.exists) {
      const { otp, createdAt } = otpDoc.data();
      const now = Timestamp.now();
      const timeDifference = now.toMillis() - createdAt.toMillis();

      // If OTP is still valid (within 10 minutes), resend the existing OTP
      if (timeDifference < 10 * 60 * 1000) {
        await sendOtpEmail(email, otp);
        return res
          .status(200)
          .json({ message: "OTP resent to your email address." });
      }
    }

    // Generate a new OTP, store it, and send via email
    const otp = generateOTP();
    const otpData = { otp, createdAt: Timestamp.now() };
    await db.collection("passwordResetOTPs").doc(email).set(otpData);
    await sendOtpEmail(email, otp);

    res.status(200).json({ message: "OTP sent to your email address." });
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      return res
        .status(404)
        .json({ message: "User with this email does not exist." });
    }
    console.error("Error in forgot password:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};

// Helper function to send OTP email
const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: email,
    subject: "Your Password Reset OTP",
    text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error sending OTP email:", err);
        reject(new Error("Failed to send OTP. Please try again later."));
      } else {
        console.log("OTP email sent:", info.response);
        resolve(info);
      }
    });
  });
};

// --- Forgot Password - Step 2: Verify OTP ---
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  try {
    const otpDoc = await db.collection("passwordResetOTPs").doc(email).get();
    if (!otpDoc.exists) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    const { otp: storedOTP, createdAt } = otpDoc.data();
    const now = Timestamp.now();
    const timeDifference = now.toMillis() - createdAt.toMillis();

    if (storedOTP !== parseInt(otp) || timeDifference > 10 * 60 * 1000) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    await db.collection("passwordResetOTPs").doc(email).delete();
    res
      .status(200)
      .json({ message: "OTP verified. You can now reset your password." });
  } catch (error) {
    console.error("Error in OTP verification:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};

// --- Forgot Password - Step 3: Reset Password ---
export const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res
      .status(400)
      .json({ message: "Email and new password are required." });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters long." });
  }

  try {
    const userRecord = await auth.getUserByEmail(email);
    await auth.updateUser(userRecord.uid, { password: newPassword });
    res.status(200).json({ message: "Password has been reset successfully." });
  } catch (error) {
    console.error("Error in password reset:", error.message);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};
