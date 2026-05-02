import "./services/env.mjs";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { config } from "./services/config.mjs";
import core from "./services/core.mjs";
import { validateScanUrl, urlSafetyMessage } from "./services/urlSafety.mjs";
import { requireAuth, requireAdmin } from "./middleware/auth.mjs";
import authRouter from "./routes/auth.mjs";
import reportsRouter from "./routes/reports.mjs";
import compareRouter from "./routes/compare.mjs";
import adminRouter from "./routes/admin.mjs";

const app = express();
const PORT = config.port;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
  }),
);

const allowedOrigins = [
  process.env.CLIENT_ORIGIN || "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Global rate limiter — applies to all endpoints
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "TOO_MANY_REQUESTS",
    message: "Request limit exceeded. Please wait 15 minutes.",
  },
});
app.use(globalLimiter);

// Tighter limiter for the expensive scrape operation
const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: "TOO_MANY_REQUESTS",
    message: "Forensic analysis limit reached. Please wait 15 minutes.",
  },
});

// Tighter rate limiter for sensitive authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: "TOO_MANY_REQUESTS",
    message: "Authentication limit reached. Please wait 15 minutes.",
  },
});

app.get("/health", (req, res) =>
  res
    .status(200)
    .json({ status: "UP", timestamp: new Date(), version: "3.0.0" }),
);

app.get("/api/share/:token", async (req, res) => {
  try {
    const report = await core.getReportByShareToken(req.params.token);
    if (!report) return res.status(404).json({ error: "NOT_FOUND" });
    res.json(report);
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/compare", compareRouter);
app.use("/api/admin", adminRouter);

(async () => {
  console.log("[BOOT] Calibrating Forensic Intel...");
  if (!process.env.JWT_SECRET) {
    console.error("[CRITICAL] JWT_SECRET is not configured.");
    process.exit(1);
  }
  await core.initIntel();
  await core.syncIntel();
  await core.seedDemoUser();
})();

app.get("/api/history", requireAuth, async (req, res) => {
  try {
    const reports = await core.getReports(30);
    res.json(reports);
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

app.delete("/api/history", requireAuth, requireAdmin, async (req, res) => {
  try {
    await core.clearHistory();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to clear history" });
  }
});

app.get("/api/trends/:hostname", requireAuth, async (req, res) => {
  try {
    const { hostname } = req.params;
    const stats = await core.getHostStats(hostname);
    res.json(stats || { message: "NO_HIST_DATA" });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
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

      if (
        job.userId &&
        job.userId !== req.user.id &&
        req.user.role !== "admin"
      ) {
        emit("ERROR", { message: "JOB_FORBIDDEN" });
        res.end();
        return clearInterval(poller);
      }

      if (job.logs.length > lastIndex) {
        job.logs.slice(lastIndex).forEach((m) => emit("LOG", { message: m }));
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
    if (!res.writableEnded) res.end();
  });
});
const server = app.listen(PORT, () => {
  console.log(
    `[READY] AuthentiScan Gateway active on Port ${PORT} [${config.env}]`,
  );
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
