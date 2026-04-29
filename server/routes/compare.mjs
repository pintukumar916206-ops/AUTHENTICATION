import { Router } from "express";
import core from "../services/core.mjs";
import { requireAuth } from "../middleware/auth.mjs";
import { runForensicPipeline } from "../services/analysis.mjs";
import { scrapeProduct } from "../services/scraper.mjs";
import { validateScanUrl, urlSafetyMessage } from "../services/urlSafety.mjs";

const router = Router();

router.use(requireAuth);

function canReadReport(report, user) {
  return report && (String(report.userId) === user.id || user.role === "admin");
}

router.post("/", async (req, res) => {
  const { reportIdA, reportIdB, urlA, urlB } = req.body;

  try {
    let reportA, reportB;

    if (reportIdA && reportIdB) {
      [reportA, reportB] = await Promise.all([
        core.getReportById(reportIdA),
        core.getReportById(reportIdB),
      ]);

      if (!canReadReport(reportA, req.user) || !canReadReport(reportB, req.user)) {
        return res.status(404).json({ error: "NOT_FOUND", message: "One or both reports could not be found." });
      }
    } else if (urlA && urlB) {
      const [safeA, safeB] = await Promise.all([
        validateScanUrl(urlA),
        validateScanUrl(urlB),
      ]);

      if (!safeA.ok || !safeB.ok) {
        const failed = !safeA.ok ? safeA : safeB;
        return res.status(400).json({
          error: "INVALID_SCAN_URL",
          message: urlSafetyMessage(failed.reason),
        });
      }

      const [productA, productB] = await Promise.all([
        scrapeProduct(safeA.url),
        scrapeProduct(safeB.url),
      ]);

      if (!productA || !productB) {
        return res.status(422).json({
          error: "CAPTURE_FAILED",
          message: "One or both live URLs could not be captured reliably.",
        });
      }

      [reportA, reportB] = await Promise.all([
        runForensicPipeline(productA),
        runForensicPipeline(productB),
      ]);
    } else {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "Provide two report IDs or two URLs." });
    }

    if (!reportA || !reportB) {
      return res.status(404).json({ error: "NOT_FOUND", message: "One or both reports could not be found." });
    }

    const comparison = {
      a: {
        title: reportA.product?.title || "Report A",
        verdict: reportA.verdict,
        score: reportA.score,
        confidence: reportA.confidence,
        hostname: reportA.product?.hostname,
        price: reportA.product?.price,
        risk_signals: reportA.risk_signals || [],
        summary: reportA.summary,
        timestamp: reportA.timestamp,
      },
      b: {
        title: reportB.product?.title || "Report B",
        verdict: reportB.verdict,
        score: reportB.score,
        confidence: reportB.confidence,
        hostname: reportB.product?.hostname,
        price: reportB.product?.price,
        risk_signals: reportB.risk_signals || [],
        summary: reportB.summary,
        timestamp: reportB.timestamp,
      },
      winner: reportA.score > reportB.score ? "a" : reportB.score > reportA.score ? "b" : "tie",
      scoreGap: Math.abs((reportA.score || 0) - (reportB.score || 0)),
    };

    res.json(comparison);
  } catch (err) {
    console.error("[COMPARE] Error:", err.message);
    res.status(500).json({ error: "SERVER_ERROR", message: "Comparison failed." });
  }
});

export default router;
