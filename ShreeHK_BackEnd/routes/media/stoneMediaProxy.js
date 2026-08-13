const https = require("https");

const MEDIA_HOST = "www.shreehk.com";
const MEDIA_PREFIX = "/media/v360video";

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
      res.redirect(up.statusCode, location);
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

module.exports = { proxyStoneMedia, MEDIA_PREFIX };
