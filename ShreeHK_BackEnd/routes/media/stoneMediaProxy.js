const https = require("https");
const { URL } = require("url");

const MEDIA_HOST = "www.shreehk.com";
const MEDIA_PREFIX = "/media/v360video";

/**
 * Domain allowlist to prevent SSRF and untrusted media proxying
 * Allowed: Company domains, GIA, IGI, RapNet, AWS S3 / CloudFront CDN
 */
const ALLOWED_DOMAIN_PATTERNS = [
  /^([a-zA-Z0-9-]+\.)*shreehk\.com$/,
  /^([a-zA-Z0-9-]+\.)*gia\.edu$/,
  /^([a-zA-Z0-9-]+\.)*igi\.org$/,
  /^([a-zA-Z0-9-]+\.)*rapnet\.com$/,
  /^([a-zA-Z0-9-]+\.)*amazonaws\.com$/,
  /^([a-zA-Z0-9-]+\.)*cloudfront\.net$/,
];

const isAllowedDomain = (hostname) => {
  if (!hostname || typeof hostname !== "string") return false;
  const cleanHost = hostname.toLowerCase().split(":")[0].trim();
  return ALLOWED_DOMAIN_PATTERNS.some((pattern) => pattern.test(cleanHost));
};

const hopByHop = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const stripEmbedHeaders = (headers) => {
  const out = {};
  Object.keys(headers || {}).forEach((key) => {
    const lower = key.toLowerCase();
    if (hopByHop.has(lower)) return;
    if (lower === "x-frame-options") return;
    if (lower === "content-security-policy") return;
    if (lower === "content-security-policy-report-only") return;
    out[key] = headers[key];
  });
  return out;
};

const proxyStoneMedia = (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).end();
    return;
  }

  if (String(req.url || "").includes("..")) {
    res.status(400).end();
    return;
  }

  // Check custom target URL parameter if supplied
  const customUrl = req.query?.url || req.query?.targetUrl;
  if (customUrl) {
    try {
      const parsed = new URL(customUrl);
      if (!isAllowedDomain(parsed.hostname)) {
        res.status(403).json({ status: false, message: "Target media domain not allowed" });
        return;
      }
    } catch {
      res.status(400).json({ status: false, message: "Invalid target media URL" });
      return;
    }
  }

  // Verify default upstream host
  if (!isAllowedDomain(MEDIA_HOST)) {
    res.status(403).json({ status: false, message: "Upstream media host not allowed" });
    return;
  }

  const options = {
    hostname: MEDIA_HOST,
    path: `${MEDIA_PREFIX}${req.url}`,
    method: req.method,
    headers: {
      Accept: req.headers.accept || "*/*",
      "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
      Referer: `https://${MEDIA_HOST}/`,
      Origin: `https://${MEDIA_HOST}`,
    },
  };

  const upstream = https.request(options, (up) => {
    const location = up.headers.location;
    if (up.statusCode >= 300 && up.statusCode < 400 && location) {
      up.resume();
      try {
        const redirectUrl = new URL(location, `https://${MEDIA_HOST}`);
        if (!isAllowedDomain(redirectUrl.hostname)) {
          res.status(403).json({ status: false, message: "Redirect to untrusted media domain blocked" });
          return;
        }
        res.redirect(up.statusCode, location);
      } catch {
        res.status(400).end();
      }
      return;
    }
    res.writeHead(up.statusCode || 502, stripEmbedHeaders(up.headers));
    up.pipe(res);
  });

  upstream.on("error", () => {
    if (!res.headersSent) res.status(502).end();
  });
  upstream.end();
};

module.exports = { proxyStoneMedia, MEDIA_PREFIX, isAllowedDomain };
