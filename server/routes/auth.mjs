import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import core from "../services/core.mjs";
import { requireAuth } from "../middleware/auth.mjs";

const router = Router();

const cookieOptions = {
  httpOnly: true,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role || "user" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/register", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const { password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "Name, email and password are required." });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "Enter a valid email address." });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "Password must be at least 8 characters." });
  }

  try {
    const existing = await core.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "EMAIL_TAKEN", message: "An account with this email already exists." });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await core.createUser({ name, email, passwordHash: hash, role: "user" });

    const token = signToken(user);
    res.cookie("token", token, cookieOptions);
    res.status(201).json({ token, user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error("[AUTH] Register error:", err.message);
    res.status(500).json({ error: "SERVER_ERROR", message: "Registration failed. Please try again." });
  }
});

router.post("/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const { password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "Email and password are required." });
  }

  try {
    const user = await core.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Invalid email or password." });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Invalid email or password." });
    }

    const token = signToken(user);
    res.cookie("token", token, cookieOptions);
    res.json({ token, user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error("[AUTH] Login error:", err.message);
    res.status(500).json({ error: "SERVER_ERROR", message: "Login failed. Please try again." });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await core.findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: "USER_NOT_FOUND" });
    res.json({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "VALIDATION_ERROR", message: "Email is required." });

  try {
    const user = await core.findUserByEmail(email);
    if (!user) {
      return res.json({ success: true, message: "If this email is registered, a reset link has been sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await core.updateUser(user._id, { resetToken, resetTokenExpiresAt: expiresAt });

    console.log(`[AUTH] Password reset token for ${email}: ${resetToken}`);
    res.json({ success: true, message: "If this email is registered, a reset link has been sent.", _devToken: process.env.NODE_ENV === "development" ? resetToken : undefined });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "VALIDATION_ERROR", message: "Token and new password are required." });
  if (password.length < 8) return res.status(400).json({ error: "VALIDATION_ERROR", message: "Password must be at least 8 characters." });

  try {
    const user = await core.findUserByResetToken(token);
    if (!user || new Date() > user.resetTokenExpiresAt) {
      return res.status(400).json({ error: "TOKEN_INVALID", message: "Reset link has expired or is invalid." });
    }

    const hash = await bcrypt.hash(password, 12);
    await core.updateUser(user._id, { passwordHash: hash, resetToken: null, resetTokenExpiresAt: null });
    res.json({ success: true, message: "Password updated successfully." });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

export default router;
