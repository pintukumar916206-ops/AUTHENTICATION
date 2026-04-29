import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env"), quiet: true });

const requiredEnv = ["GEMINI_API_KEY", "MONGODB_URI", "JWT_SECRET"];
const missingEnv = requiredEnv.filter((k) => !process.env[k]);

if (missingEnv.length > 0) {
  console.error(
    "\x1b[31m[FATAL] Missing Required Environment Variables:\x1b[0m",
  );
  missingEnv.forEach((k) => console.error(` - ${k}`));
  console.error(
    "\nEnsure your .env file is correctly configured for production.\n",
  );
  process.exit(1);
}

if ((process.env.JWT_SECRET || "").length < 32) {
  console.error("\x1b[31m[FATAL] JWT_SECRET must be at least 32 characters.\x1b[0m");
  process.exit(1);
}

export const config = {
  port: process.env.PORT || 3001,
  mongoUri: process.env.MONGODB_URI,
  geminiKey: process.env.GEMINI_API_KEY,
  env: process.env.NODE_ENV || "development",
  proxyList: (process.env.PROXY_LIST || "")
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("optional_")),
  concurrencyLimit: parseInt(process.env.CONCURRENCY_LIMIT || "4", 10),
  isProduction: process.env.NODE_ENV === "production",
};
