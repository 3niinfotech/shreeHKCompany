const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

const CHROME_CANDIDATES = () =>
  [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    process.env.LOCALAPPDATA
      ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
      : null,
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    process.env.LOCALAPPDATA
      ? `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`
      : null,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);

const resolveExecutablePath = () => {
  for (const candidate of CHROME_CANDIDATES()) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      /* ignore invalid paths */
    }
  }
  return null;
};

const runHeadlessPrint = (executablePath, htmlFileUrl, pdfPath) =>
  new Promise((resolve, reject) => {
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--no-pdf-header-footer",
      `--print-to-pdf=${pdfPath}`,
      htmlFileUrl,
    ];

    const child = spawn(executablePath, args, {
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true,
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("PDF generation timed out"));
    }, 60000);

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `Browser exited with code ${code}`));
    });
  });

const renderPdf = async (html) => {
  const executablePath = resolveExecutablePath();
  if (!executablePath) {
    const browserError = new Error(
      "Chrome or Edge was not found. Install Google Chrome / Microsoft Edge, or set PUPPETEER_EXECUTABLE_PATH in backend/.env"
    );
    browserError.statusCode = 500;
    throw browserError;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "label-sticker-"));
  const htmlPath = path.join(tmpDir, "labels.html");
  const pdfPath = path.join(tmpDir, "Print.pdf");

  try {
    fs.writeFileSync(htmlPath, html, "utf8");
    const htmlFileUrl = pathToFileURL(htmlPath).href;
    await runHeadlessPrint(executablePath, htmlFileUrl, pdfPath);

    if (!fs.existsSync(pdfPath)) {
      throw new Error("PDF file was not created");
    }

    return fs.readFileSync(pdfPath);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore cleanup errors */
    }
  }
};

module.exports = {
  renderPdf,
};
