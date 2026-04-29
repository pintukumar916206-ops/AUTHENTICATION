import "./services/env.mjs";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { config } from "./services/config.mjs";
import core from "./services/core.mjs";
import { validateScanUrl, urlSafetyMessage } from "./services/urlSafety.mjs";
import { requireAuth } from "./middleware/auth.mjs";
import authRouter from "./routes/auth.mjs";
import reportsRouter from "./routes/reports.mjs";
import compareRouter from "./routes/compare.mjs";
import adminRouter from "./routes/admin.mjs";

const app = express();
const PORT = config.port;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "TOO_MANY_REQUESTS", message: "Forensic limits reached. Please wait 15 minutes." },
});

app.get("/health", (req, res) => res.status(200).json({ status: "UP", timestamp: new Date(), version: "3.0.0" }));

app.get("/api/share/:token", async (req, res) => {
  try {
    const report = await core.getReportByShareToken(req.params.token);
    if (!report) return res.status(404).json({ error: "NOT_FOUND" });
    res.json(report);
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/compare", compareRouter);
app.use("/api/admin", adminRouter);

(async () => {
  console.log("[BOOT] Calibrating Forensic Intel...");
  await core.initIntel();
  await core.syncIntel();
  await core.seedDemoUser();
})();

app.get("/api/history", async (req, res) => {
  const reports = await core.getReports(30);
  res.json(reports);
});

app.delete("/api/history", async (req, res) => {
  try {
    await core.clearHistory();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to clear history" });
  }
});

app.get("/api/trends/:hostname", async (req, res) => {
  const { hostname } = req.params;
  const stats = await core.getHostStats(hostname);
  res.json(stats || { message: "NO_HIST_DATA" });
});

app.post("/api/analyze", analyzeLimiter, requireAuth, async (req, res) => {
  try {
    const validated = await validateScanUrl(req.body?.url);
    if (!validated.ok) {
      return res.status(400).json({
        error: "INVALID_SCAN_URL",
        message: urlSafetyMessage(validated.reason),
      });
    }

    const cached = await core.getCachedResult(validated.url);
    if (cached) return res.json({ jobId: null, result: cached });

    const jobId = await core.addJob(validated.url, req.user.id);
    res.json({ jobId: jobId.toString() });
  } catch {
    res.status(400).json({ error: "INVALID_URL_OR_ENGINE_FAILURE" });
  }
});

app.get("/api/status/:jobId", requireAuth, async (req, res) => {
  const { jobId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const emit = (event, data) => {
    if (res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  let lastIndex = 0;
  const poller = setInterval(async () => {
    try {
      const job = await core.getJob(jobId);
      if (!job) {
        emit("ERROR", { message: "JOB_NOT_FOUND" });
        res.end();
        return clearInterval(poller);
      }

      if (job.userId && job.userId !== req.user.id && req.user.role !== "admin") {
        emit("ERROR", { message: "JOB_FORBIDDEN" });
        res.end();
        return clearInterval(poller);
      }

      if (job.logs.length > lastIndex) {
        job.logs.slice(lastIndex).forEach(m => emit("LOG", { message: m }));
        lastIndex = job.logs.length;
      }

      if (job.status === "COMPLETED") {
        emit("COMPLETE", job.result);
        clearInterval(poller);
        res.end();
      } else if (job.status === "FAILED") {
        emit("ERROR", { message: job.error || "ANALYSIS_ABORTED" });
        clearInterval(poller);
        res.end();
      }
    } catch (err) {
      console.error("[SSE-ERROR]", err.message);
      clearInterval(poller);
      res.end();
    }
  }, 1000);

  req.on("close", () => {
    clearInterval(poller);
    res.end();
  });
});
const server = app.listen(PORT, () => {
  console.log(`[READY] AuthentiScan Gateway active on Port ${PORT} [${config.env}]`);
});

const shutdown = () => {
  console.log("\n[SHUTDOWN] Initiating graceful termination...");
  server.close(() => {
    console.log("[SHUTDOWN] API Gateway closed.");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("[SHUTDOWN] Forced termination.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
