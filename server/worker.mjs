import "./services/env.mjs";
import core from "./services/core.mjs";
import { config } from "./services/config.mjs";
import { scrapeProduct, cleanup } from "./services/scraper.mjs";
import { runForensicPipeline } from "./services/analysis.mjs";

console.log("[WORKER] Engine Initializing...");

const CONCURRENCY_LIMIT = config.concurrencyLimit || 4;
const slots = new Set();
let isShuttingDown = false;

async function processJob(job) {
  const id = job._id;
  slots.add(id);
  try {
    console.log(`[JOB-START] ${id} | URL: ${job.url}`);

    await core.updateJob(id, { status: "PROCESSING_CAPTURE", log: "Initializing stealth browser..." });
    
    const product = await scrapeProduct(job.url, (log) => {
      core.updateJob(id, { log });
    });

    if (!product) {
      console.error(`[JOB-FAIL] ${id} | Capture failed`);
      await core.updateJob(id, { status: "FAILED", log: "ERR_CAPTURE_FAILED: Site protection or timeout block." });
      return;
    }

    await core.updateJob(id, { status: "PROCESSING_NEURAL", log: "Executing algorithmic audit..." });
    
    const analysis = await runForensicPipeline(product);
    
    const savedReport = await core.saveReport({ ...analysis, userId: job.userId || null });
    const result = { ...analysis, _id: savedReport._id };
    await core.saveToCache(job.url, result);
    
    await core.updateJob(id, {
      status: "COMPLETED",
      result,
      log: "Forensic analysis finalized.",
    });
    console.log(`[JOB-OK] ${id} | Verdict: ${analysis.verdict}`);
  } catch (err) {
    console.error(`[JOB-CRASH] ${id}:`, err.message);
    await core.updateJob(id, { status: "FAILED", log: `ERR_SYSTEM_CRASH: ${err.message}` });
  } finally {
    slots.delete(id);
  }
}

(async () => {
  console.log(`[READY] Active slots: ${CONCURRENCY_LIMIT}. Polling initialized.`);
  
  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    clearInterval(reaper);
    
    console.log(`\n[SHUTDOWN] Worker draining ${slots.size} active slots...`);
    
    if (slots.size > 0) {
      let waitTime = 0;
      while (slots.size > 0 && waitTime < 30000) {
        await new Promise(r => setTimeout(r, 1000));
        waitTime += 1000;
      }
    }
    
    await cleanup();
    console.log("[SHUTDOWN] Worker terminated.");
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  const reaper = setInterval(() => core.resetStaleJobs(), 60000);

  while (!isShuttingDown) {
    let jobFound = false;
    try {
      if (slots.size < CONCURRENCY_LIMIT) {
        const jobResult = await core.claimJob();
        const job = jobResult?.value || jobResult;

        if (job && job.status === "CLAIMED") {
          processJob(job).catch(err => console.error("[WORKER-FATAL] Unhandled job crash:", err.message));
          jobFound = true;
        }
      }
    } catch (err) {
      console.error("[HEARTBEAT-ERR]", err.message);
    }
    
    if (!jobFound) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
})();
