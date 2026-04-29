import { Router } from "express";
import crypto from "crypto";
import core from "../services/core.mjs";
import { getGenAI } from "../services/analysis.mjs";
import { requireAuth } from "../middleware/auth.mjs";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20, verdict, search, sort = "newest", pinned, favorited } = req.query;

    const reports = await core.getUserReports(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      verdict: verdict || null,
      search: search || null,
      sort,
      pinned: pinned === "true" ? true : undefined,
      favorited: favorited === "true" ? true : undefined,
    });

    res.json(reports);
  } catch (err) {
    console.error("[REPORTS] List error:", err.message);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const stats = await core.getUserStats(req.user.id);
    res.json(stats);
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const report = await core.getReportById(req.params.id);
    if (!report) return res.status(404).json({ error: "NOT_FOUND" });
    if (report.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    res.json(report);
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const report = await core.getReportById(req.params.id);
    if (!report) return res.status(404).json({ error: "NOT_FOUND" });
    if (report.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    await core.deleteReport(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.patch("/:id/pin", async (req, res) => {
  try {
    const report = await core.getReportById(req.params.id);
    if (!report || report.userId !== req.user.id) return res.status(404).json({ error: "NOT_FOUND" });
    const updated = await core.updateReport(req.params.id, { pinned: !report.pinned });
    res.json({ pinned: updated.pinned });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.patch("/:id/favorite", async (req, res) => {
  try {
    const report = await core.getReportById(req.params.id);
    if (!report || report.userId !== req.user.id) return res.status(404).json({ error: "NOT_FOUND" });
    const updated = await core.updateReport(req.params.id, { favorited: !report.favorited });
    res.json({ favorited: updated.favorited });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.post("/:id/share", async (req, res) => {
  try {
    const report = await core.getReportById(req.params.id);
    if (!report || report.userId !== req.user.id) return res.status(404).json({ error: "NOT_FOUND" });

    const shareToken = report.shareToken || crypto.randomBytes(24).toString("hex");
    await core.updateReport(req.params.id, { shareToken });

    const shareUrl = `${req.protocol}://${req.get("host")}/share/${shareToken}`;
    res.json({ shareUrl, shareToken });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

router.post("/:id/explain", async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim();
    if (!question) return res.status(400).json({ error: "Question required" });
    if (question.length > 500) return res.status(400).json({ error: "Question too long" });

    const report = await core.getReportById(req.params.id);
    if (!report || report.userId !== req.user.id) return res.status(404).json({ error: "NOT_FOUND" });

    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are the AuthentiScan AI Copilot. A user is asking a question about a forensic fraud report.
    
    Report Details:
    Product: ${report.product.title}
    Verdict: ${report.verdict} (Score: ${report.score}%)
    Summary: ${report.summary}
    Evidence: ${JSON.stringify(report.evidence)}
    Risk Signals: ${JSON.stringify(report.risk_signals)}
    
    User Question: ${question}
    
    Provide a concise, direct, and professional answer based only on the report data. Keep it under 100 words.`;

    // Setup SSE response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const result = await model.generateContentStream(prompt);
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("[REPORTS] AI Explain error:", err.message);
    res.write(`data: {"error": "Failed to generate explanation"}\n\n`);
    res.end();
  }
});

export default router;
