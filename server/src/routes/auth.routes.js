import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeUser, serializeProfile } from "../utils/serializers.js";

const router = express.Router();

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const createAuthToken = (userId) => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({ userId }, jwtSecret, { expiresIn: "7d" });
};

router.post("/register", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const displayName = String(req.body?.displayName || "").trim();

    if (!email || !password || !displayName) {
      return res.status(400).json({ message: "Email, password, and display name are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(409).json({ message: "A user with that email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      passwordHash,
      displayName,
      color: Math.floor(Math.random() * 6) + 1,
    });

    return res.status(201).json({
      message: "Account created successfully",
      user: serializeUser(user),
      profile: serializeProfile(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register user" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = createAuthToken(user._id.toString());

    return res.json({
      token,
      user: serializeUser(user),
      profile: serializeProfile(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to login" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  return res.json({
    user: serializeUser(req.auth.user),
    profile: serializeProfile(req.auth.user),
  });
});

router.post("/logout", requireAuth, async (req, res) => {
  return res.json({ success: true });
});

export default router;
