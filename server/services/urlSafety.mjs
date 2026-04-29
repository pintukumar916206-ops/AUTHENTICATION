import dns from "node:dns/promises";
import net from "node:net";

const MAX_URL_LENGTH = 2048;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_PORTS = new Set(["", "80", "443"]);
const BLOCKED_HOSTS = new Set(["localhost", "localhost.localdomain"]);

const REASON_MESSAGES = {
  REQUIRED: "URL is required.",
  TOO_LONG: "URL is too long.",
  INVALID: "Enter a valid product URL.",
  PROTOCOL: "Only HTTP and HTTPS URLs can be scanned.",
  CREDENTIALS: "URLs with embedded credentials are not accepted.",
  PORT: "Only standard web ports are accepted.",
  HOSTNAME: "Use a public product URL with a real hostname.",
  PRIVATE_ADDRESS: "Private, local, and metadata network URLs are blocked.",
  DNS_FAILED: "Could not verify that this hostname is public.",
};

function ipv4ToLong(address) {
  return address.split(".").reduce((acc, part) => (acc * 256) + Number(part), 0);
}

function inIpv4Range(address, start, end) {
  const value = ipv4ToLong(address);
  return value >= ipv4ToLong(start) && value <= ipv4ToLong(end);
}

function isPrivateIpv4(address) {
  return [
    ["0.0.0.0", "0.255.255.255"],
    ["10.0.0.0", "10.255.255.255"],
    ["100.64.0.0", "100.127.255.255"],
    ["127.0.0.0", "127.255.255.255"],
    ["169.254.0.0", "169.254.255.255"],
    ["172.16.0.0", "172.31.255.255"],
    ["192.0.0.0", "192.0.0.255"],
    ["192.168.0.0", "192.168.255.255"],
    ["198.18.0.0", "198.19.255.255"],
    ["224.0.0.0", "255.255.255.255"],
  ].some(([start, end]) => inIpv4Range(address, start, end));
}

function isPrivateIpv6(address) {
  const normalized = address.toLowerCase();
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith("ff")) return true;
  if (normalized.startsWith("2001:db8")) return true;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIpv4(mapped[1]) : false;
}

export function isPrivateAddress(address) {
  const type = net.isIP(address);
  if (type === 4) return isPrivateIpv4(address);
  if (type === 6) return isPrivateIpv6(address);
  return false;
}

export function urlSafetyMessage(reason) {
  return REASON_MESSAGES[reason] || REASON_MESSAGES.INVALID;
}

export function normalizeScanUrl(input) {
  if (typeof input !== "string" || !input.trim()) {
    return { ok: false, reason: "REQUIRED" };
  }

  const raw = input.trim();
  if (raw.length > MAX_URL_LENGTH) {
    return { ok: false, reason: "TOO_LONG" };
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "INVALID" };
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { ok: false, reason: "PROTOCOL" };
  }

  if (url.username || url.password) {
    return { ok: false, reason: "CREDENTIALS" };
  }

  if (!ALLOWED_PORTS.has(url.port)) {
    return { ok: false, reason: "PORT" };
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!hostname || BLOCKED_HOSTS.has(hostname) || hostname.endsWith(".local") || !hostname.includes(".")) {
    return { ok: false, reason: "HOSTNAME" };
  }

  if (net.isIP(hostname)) {
    return { ok: false, reason: isPrivateAddress(hostname) ? "PRIVATE_ADDRESS" : "HOSTNAME" };
  }

  url.hash = "";
  return { ok: true, url: url.toString(), hostname };
}

async function resolveHostname(hostname, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("DNS_TIMEOUT")), timeoutMs);
  });

  try {
    return await Promise.race([
      dns.lookup(hostname, { all: true, verbatim: true }),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function validateScanUrl(input, options = {}) {
  const { resolveDns = true, timeoutMs = 1500 } = options;
  const parsed = normalizeScanUrl(input);
  if (!parsed.ok || !resolveDns || net.isIP(parsed.hostname)) return parsed;

  try {
    const records = await resolveHostname(parsed.hostname, timeoutMs);
    if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
      return { ok: false, reason: "PRIVATE_ADDRESS" };
    }
    return parsed;
  } catch {
    return { ok: false, reason: "DNS_FAILED" };
  }
}
