import { Router } from "express";
import core from "../services/core.mjs";
import { requireAuth, requireAdmin } from "../middleware/auth.mjs";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/stats", async (req, res) => {
  try {
    const stats = await core.getPlatformStats();
    res.json(stats);
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.get("/health", async (req, res) => {
  try {
    // Import dynamically to avoid circular issues or ensure current values
    const { SCRAPER_HEALTH } = await import("../services/scraper.mjs");
    res.json({
      uptime: process.uptime(),
      scrapers: SCRAPER_HEALTH,
      timestamp: new Date()
    });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.get("/flagged", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const reports = await core.getFlaggedReports({ page: parseInt(page), limit: parseInt(limit) });
    res.json(reports);
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const users = await core.getUsers({ page: parseInt(page), limit: parseInt(limit) });
    res.json(users);
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.patch("/reports/:id/flag", async (req, res) => {
  try {
    const report = await core.getReportById(req.params.id);
    if (!report) return res.status(404).json({ error: "NOT_FOUND" });
    const updated = await core.updateReport(req.params.id, { flagged: !report.flagged, flaggedBy: req.user.id, flaggedAt: new Date() });
    res.json({ flagged: updated.flagged });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.delete("/reports/:id", async (req, res) => {
  try {
    await core.deleteReport(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.patch("/users/:id/role", async (req, res) => {
  const { role } = req.body;
  if (!["user", "admin"].includes(role)) return res.status(400).json({ error: "VALIDATION_ERROR" });
  if (req.params.id === req.user.id && role !== "admin") {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "Admins cannot remove their own access." });
  }
  try {
    await core.updateUser(req.params.id, { role });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

export default router;
