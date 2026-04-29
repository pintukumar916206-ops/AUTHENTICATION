import fetch from "node-fetch";
import { MongoClient, ObjectId } from "mongodb";

let _client = null;

async function getClient() {
  if (_client) return _client;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("[CRITICAL] MONGODB_URI is not set.");
  }

  try {
    _client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    await _client.connect();
    console.log("[CORE] Database Connectivity Established.");
    return _client;
  } catch (err) {
    console.error("[CORE] FATAL: Database connection failed.", err.message);
    throw new Error("[CORE] Database Connectivity Failure.");
  }
}

const DEFAULT_INTEL = {
  trusted_domains: [
    "amazon.com", "amazon.in", "amazon.co.uk", "flipkart.com", "myntra.com",
    "nykaa.com", "snapdeal.com", "walmart.com", "bestbuy.com", "target.com",
    "apple.com", "samsung.com", "nike.com", "adidas.com", "adidas.co.in",
    "zara.com", "hm.com", "meesho.com",
  ],
  verified_sellers: [
    "amazon", "cloudtail", "appario", "flipkart", "walmart", "best buy",
    "authorized", "official", "genuine",
  ],
};

function toObjectId(id) {
  if (typeof id === "string" && ObjectId.isValid(id)) return new ObjectId(id);
  if (id instanceof ObjectId) return id;
  return null;
}

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class DataCore {
  constructor() {
    this.intel = DEFAULT_INTEL;
    this.isSynced = false;
  }

  async initIntel() {
    try {
      const client = await getClient();
      const db = client.db("authentiscan");
      const doc = await db.collection("intelligence").findOne({ type: "global_feed" });
      if (doc) {
        this.intel = doc.data;
        console.log("[DB] Intel loaded from cache");
      }
    } catch {
      console.warn("[INTEL] Using default data (cache read failed)");
    }
  }

  async syncIntel() {
    const feedUrl = process.env.INTELLIGENCE_FEED_URL;
    if (!feedUrl || feedUrl.startsWith("optional_")) {
      console.log("[CORE-INTEL] No dynamic feed URL configured.");
      return;
    }

    try {
      const res = await fetch(feedUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const freshData = await res.json();
      this.intel = freshData;
      this.isSynced = true;
      console.log("[INTEL] Synced with remote feed");

      const client = await getClient();
      await client.db("authentiscan").collection("intelligence").updateOne(
        { type: "global_feed" },
        { $set: { data: freshData, syncedAt: new Date() } },
        { upsert: true }
      );
    } catch {
      console.error("[INTEL] Remote sync failed. Sticking with current data.");
    }
  }

  getTrustedDomains() { return this.intel.trusted_domains; }
  getVerifiedSellers() { return this.intel.verified_sellers; }

  async seedDemoUser() {
    try {
      const existing = await this.findUserByEmail("demo@authentiscan.io");
      if (existing) return;

      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.default.hash("Demo1234!", 12);
      await this.createUser({ name: "Demo User", email: "demo@authentiscan.io", passwordHash: hash, role: "user" });
      console.log("[SEED] Demo user created: demo@authentiscan.io / Demo1234!");

      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        const adminHash = await bcrypt.default.hash(process.env.ADMIN_PASSWORD || "Admin1234!", 12);
        const adminExists = await this.findUserByEmail(adminEmail);
        if (!adminExists) {
          await this.createUser({ name: "Admin", email: adminEmail, passwordHash: adminHash, role: "admin" });
          console.log(`[SEED] Admin user created: ${adminEmail}`);
        }
      }
    } catch (err) {
      console.warn("[SEED] Could not seed demo user:", err.message);
    }
  }

  async createUser({ name, email, passwordHash, role = "user" }) {
    const client = await getClient();
    const db = client.db("authentiscan");
    const result = await db.collection("users").insertOne({
      name, email, passwordHash, role,
      createdAt: new Date(), updatedAt: new Date(),
    });
    return { _id: result.insertedId, name, email, role };
  }

  async findUserByEmail(email) {
    const client = await getClient();
    return client.db("authentiscan").collection("users").findOne({ email });
  }

  async findUserById(id) {
    const client = await getClient();
    const _id = toObjectId(id);
    if (!_id) return null;
    return client.db("authentiscan").collection("users").findOne({ _id });
  }

  async findUserByResetToken(token) {
    const client = await getClient();
    return client.db("authentiscan").collection("users").findOne({ resetToken: token });
  }

  async updateUser(id, data) {
    const client = await getClient();
    const _id = toObjectId(id);
    if (!_id) return null;
    const result = await client.db("authentiscan").collection("users").findOneAndUpdate(
      { _id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    return result;
  }

  async getUsers({ page = 1, limit = 20 } = {}) {
    const client = await getClient();
    const col = client.db("authentiscan").collection("users");
    const safePage = clampInt(page, 1, 1, 10000);
    const safeLimit = clampInt(limit, 20, 1, 100);
    const skip = (safePage - 1) * safeLimit;
    const [users, total] = await Promise.all([
      col.find({}, { projection: { passwordHash: 0, resetToken: 0 } }).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).toArray(),
      col.countDocuments(),
    ]);
    return { users, total, page: safePage, limit: safeLimit };
  }

  async saveReport(report) {
    const client = await getClient();
    const db = client.db("authentiscan");
    const result = await db.collection("reports").insertOne({
      ...report,
      pinned: false, favorited: false, flagged: false, shareToken: null,
      savedAt: new Date(),
    });
    return { ...report, _id: result.insertedId };
  }

  async getReportById(id) {
    const client = await getClient();
    const _id = toObjectId(id);
    if (!_id) return null;
    return client.db("authentiscan").collection("reports").findOne({ _id });
  }

  async getReportByShareToken(token) {
    const client = await getClient();
    return client.db("authentiscan").collection("reports").findOne({ shareToken: token }, { projection: { userId: 0 } });
  }

  async updateReport(id, data) {
    const client = await getClient();
    const _id = toObjectId(id);
    if (!_id) return null;
    const result = await client.db("authentiscan").collection("reports").findOneAndUpdate(
      { _id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    return result;
  }

  async deleteReport(id) {
    const client = await getClient();
    const _id = toObjectId(id);
    if (!_id) return;
    await client.db("authentiscan").collection("reports").deleteOne({ _id });
  }

  async getUserReports(userId, { page = 1, limit = 20, verdict, search, sort = "newest", pinned, favorited } = {}) {
    const client = await getClient();
    const col = client.db("authentiscan").collection("reports");

    const safePage = clampInt(page, 1, 1, 10000);
    const safeLimit = clampInt(limit, 20, 1, 50);
    const filter = { userId };
    if (["GENUINE", "SUSPICIOUS", "FAKE", "UNVERIFIABLE"].includes(String(verdict).toUpperCase())) {
      filter.verdict = String(verdict).toUpperCase();
    }
    if (pinned !== undefined) filter.pinned = pinned;
    if (favorited !== undefined) filter.favorited = favorited;
    if (search) filter["product.title"] = { $regex: escapeRegex(String(search).trim().slice(0, 80)), $options: "i" };

    const sortMap = {
      newest: { savedAt: -1 },
      oldest: { savedAt: 1 },
      highest: { score: -1 },
      lowest: { score: 1 },
    };
    const safeSort = sortMap[sort] ? sort : "newest";
    const skip = (safePage - 1) * safeLimit;
    const [reports, total] = await Promise.all([
      col.find(filter, { projection: { "product.html": 0 } }).sort(sortMap[safeSort]).skip(skip).limit(safeLimit).toArray(),
      col.countDocuments(filter),
    ]);
    return { reports, total, page: safePage, limit: safeLimit, totalPages: Math.ceil(total / safeLimit) };
  }

  async getUserStats(userId) {
    const client = await getClient();
    const col = client.db("authentiscan").collection("reports");

    const stats = await col.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgScore: { $avg: "$score" },
          genuine: { $sum: { $cond: [{ $eq: ["$verdict", "GENUINE"] }, 1, 0] } },
          suspicious: { $sum: { $cond: [{ $eq: ["$verdict", "SUSPICIOUS"] }, 1, 0] } },
          fake: { $sum: { $cond: [{ $eq: ["$verdict", "FAKE"] }, 1, 0] } },
        },
      },
    ]).toArray();

    return stats[0] || { total: 0, avgScore: 0, genuine: 0, suspicious: 0, fake: 0 };
  }

  async getPlatformStats() {
    const client = await getClient();
    const db = client.db("authentiscan");

    const [reportStats, userCount, flaggedCount] = await Promise.all([
      db.collection("reports").aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgScore: { $avg: "$score" },
            genuine: { $sum: { $cond: [{ $eq: ["$verdict", "GENUINE"] }, 1, 0] } },
            suspicious: { $sum: { $cond: [{ $eq: ["$verdict", "SUSPICIOUS"] }, 1, 0] } },
            fake: { $sum: { $cond: [{ $eq: ["$verdict", "FAKE"] }, 1, 0] } },
          },
        },
      ]).toArray(),
      db.collection("users").countDocuments(),
      db.collection("reports").countDocuments({ flagged: true }),
    ]);

    return { ...(reportStats[0] || { total: 0, avgScore: 0, genuine: 0, suspicious: 0, fake: 0 }), userCount, flaggedCount };
  }

  async getFlaggedReports({ page = 1, limit = 20 } = {}) {
    const client = await getClient();
    const col = client.db("authentiscan").collection("reports");
    const safePage = clampInt(page, 1, 1, 10000);
    const safeLimit = clampInt(limit, 20, 1, 100);
    const skip = (safePage - 1) * safeLimit;
    const [reports, total] = await Promise.all([
      col.find({ flagged: true }, { projection: { "product.html": 0 } }).sort({ flaggedAt: -1 }).skip(skip).limit(safeLimit).toArray(),
      col.countDocuments({ flagged: true }),
    ]);
    return { reports, total, page: safePage, limit: safeLimit };
  }

  async getReports(limit = 10) {
    try {
      const client = await getClient();
      const col = client.db("authentiscan").collection("reports");
      return await col.find({}, { projection: { _id: 0, "product.html": 0 } }).sort({ savedAt: -1 }).limit(limit).toArray();
    } catch {
      return [];
    }
  }

  async clearHistory() {
    const client = await getClient();
    const db = client.db("authentiscan");
    await Promise.all([
      db.collection("reports").deleteMany({}),
      db.collection("jobs").deleteMany({}),
      db.collection("cache").deleteMany({}),
    ]);
  }

  async resetStaleJobs(timeoutMinutes = 5) {
    const col = await this.getJobsCollection();
    if (!col) return;

    const threshold = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    const result = await col.updateMany(
      { status: { $in: ["CLAIMED", "PROCESSING_CAPTURE", "PROCESSING_NEURAL"] }, updatedAt: { $lt: threshold } },
      { $set: { status: "PENDING", updatedAt: new Date() }, $push: { logs: "RECOVERY_DAEMON: Job reset due to timeout." } }
    );

    if (result.matchedCount > 0) {
      console.log(`[CORE-RECOVERY] Rescued ${result.matchedCount} stale jobs.`);
    }
  }

  async getJobsCollection() {
    const client = await getClient();
    return client.db("authentiscan").collection("jobs");
  }

  async addJob(url, userId = null) {
    const col = await this.getJobsCollection();
    const result = await col.insertOne({
      url, userId, status: "PENDING", logs: ["JOB_CREATED"],
      createdAt: new Date(), updatedAt: new Date(),
    });
    return result.insertedId;
  }

  async getJob(jobId) {
    const col = await this.getJobsCollection();
    try {
      const _id = toObjectId(jobId);
      if (!_id) return null;
      return await col.findOne({ _id });
    } catch {
      return null;
    }
  }

  async claimJob() {
    const col = await this.getJobsCollection();
    return await col.findOneAndUpdate(
      { status: "PENDING" },
      { $set: { status: "CLAIMED", updatedAt: new Date() } },
      { sort: { createdAt: 1 }, returnDocument: "after" }
    );
  }

  async updateJob(jobId, data) {
    const col = await this.getJobsCollection();
    const _id = toObjectId(jobId);
    if (!_id) return;
    const { log, ...rest } = data;
    await col.updateOne(
      { _id },
      { $set: { ...rest, updatedAt: new Date() }, ...(log ? { $push: { logs: log } } : {}) }
    );
  }

  async getHostStats(hostname) {
    try {
      const client = await getClient();
      const col = client.db("authentiscan").collection("reports");
      const stats = await col.aggregate([
        { $match: { "product.hostname": hostname } },
        { $group: { _id: "$product.hostname", avgScore: { $avg: "$score" }, maxScore: { $max: "$score" }, avgPrice: { $avg: "$product.price" }, minPrice: { $min: "$product.price" }, scanCount: { $sum: 1 } } },
      ]).toArray();
      return stats[0] || null;
    } catch {
      return null;
    }
  }

  async getCachedResult(url) {
    try {
      const client = await getClient();
      const col = client.db("authentiscan").collection("cache");
      const cached = await col.findOne({ url }, { projection: { _id: 0 } });
      return cached?.result || cached || null;
    } catch {
      return null;
    }
  }

  async saveToCache(url, result) {
    try {
      const client = await getClient();
      const col = client.db("authentiscan").collection("cache");
      await col.updateOne(
        { url },
        { $set: { url, result, cachedAt: new Date() } },
        { upsert: true }
      );
    } catch {
      console.error("[CORE-CACHE] Save failed.");
    }
  }
}

const core = new DataCore();
export default core;
