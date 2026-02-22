import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Authentication token is missing" });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: "JWT_SECRET is not configured" });
    }

    const payload = jwt.verify(token, jwtSecret);
    const user = await User.findById(payload.userId).lean();

    if (!user) {
      return res.status(401).json({ message: "Invalid authentication token" });
    }

    req.auth = {
      userId: user._id.toString(),
      user,
      token,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired authentication token" });
  }
};
