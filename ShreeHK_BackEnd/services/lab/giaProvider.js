const LabProviderInterface = require("./labProviderInterface.js");
const { buildNormalizedCertificate } = require("./labDataNormalizer.js");

const GIA_DEFAULT_ENDPOINT = "https://api.gia.edu/v1/graphql";

/**
 * Official GIA Report Results API GraphQL Query
 * Based on GIA Laboratory Developer Documentation (gialaboratory.github.io)
 */
const GIA_GET_REPORT_QUERY = `
query GetReport($reportNumber: String!) {
  getReport(report_number: $reportNumber) {
    report_date
    report_date_iso
    report_number
    report_type
    report_type_code
    industry_disclosures {
      disclosed_source {
        name
        code
      }
    }
    assets {
      asset_type_code
      asset_type_description
      link
    }
    results {
      ... on DiamondGradingReportResults {
        shape_and_cutting_style
        measurements
        carat_weight
        color_grade
        color_origin
        color_distribution
        clarity_grade
        cut_grade
        polish
        symmetry
        fluorescence
        clarity_characteristics
        inscriptions
        report_comments
        proportions {
          depth_pct
          table_pct
          crown_angle
          crown_height
          pavilion_angle
          pavilion_depth
          star_length
          lower_half
          girdle
          culet
        }
      }
      ... on LabGrownDiamondGradingReportResults {
        shape_and_cutting_style
        measurements
        carat_weight
        color_grade
        clarity_grade
        cut_grade
        polish
        symmetry
        fluorescence
        clarity_characteristics
        inscriptions
        report_comments
        proportions {
          depth_pct
          table_pct
          crown_angle
          crown_height
          pavilion_angle
          pavilion_depth
          star_length
          lower_half
          girdle
          culet
        }
      }
    }
  }
}
`;

/**
 * GIA Laboratory Provider Adapter.
 * Implements official GIA Report Results API (GraphQL).
 */
class GiaProvider extends LabProviderInterface {
  constructor() {
    super("GIA");
  }

  /**
   * Check if GIA live credentials are configured
   */
  isConfigured(credential) {
    if (!credential) return false;
    const apiKey = credential.apiKey || credential.api_key;
    return Boolean(apiKey && String(apiKey).trim().length > 0);
  }

  /**
   * Determine if mock responses are allowed.
   * Mock only runs when LAB_ALLOW_MOCK === "true" explicitly, regardless of NODE_ENV. Defaults to false.
   */
  isMockAllowed() {
    return String(process.env.LAB_ALLOW_MOCK || "").trim().toLowerCase() === "true";
  }

  /**
   * Allowed domains for GIA outbound HTTP requests (strictly from config/env, default to gia.edu)
   */
  getAllowedDomains() {
    const raw = process.env.LAB_ALLOWED_DOMAINS;
    if (raw !== undefined && raw !== null && String(raw).trim().length > 0) {
      return raw.split(",").map((d) => d.trim()).filter(Boolean);
    }
    return ["gia.edu", "api.gia.edu", "api.sandbox.gia.edu"];
  }

  /**
   * Fetch by report number
   */
  async fetchByReportNumber(reportNo, options = {}) {
    const reportNum = String(reportNo).trim();
    const credential = options.credential || null;

    // Direct mock response injection (for unit tests with doc samples)
    if (options.mockApiResponse) {
      return this._handleGiaResponse(reportNum, options.mockApiResponse);
    }

    // Check if live credentials exist
    if (this.isConfigured(credential)) {
      return this._fetchFromLiveApi(reportNum, credential, options);
    }

    // Check if mock mode is allowed
    if (!this.isMockAllowed()) {
      return {
        status: "ERROR",
        error: "Provider not configured. GIA live credentials required.",
        isMock: false,
        data: null,
      };
    }

    // Default to Mock Provider when live credentials are not present and mock is allowed
    return this._fetchMockReport(reportNum);
  }

  /**
   * Live GIA Report Results API Call (GraphQL)
   */
  async _fetchFromLiveApi(reportNo, credential, options = {}) {
    let endpoint = credential.baseUrl || credential.base_url || process.env.GIA_API_URL || GIA_DEFAULT_ENDPOINT;
    endpoint = String(endpoint).trim();
    if (!endpoint.endsWith("/graphql") && !endpoint.includes("/graphql")) {
      endpoint = `${endpoint.replace(/\/+$/, "")}/graphql`;
    }

    // Validate URL against SSRF allowlist
    this.validateSsrfUrl(endpoint, this.getAllowedDomains());

    // Prepare authorization header (GIA expects apiKey directly or Bearer)
    const rawKey = String(credential.apiKey || credential.api_key || "").trim();
    const authHeader = rawKey.toLowerCase().startsWith("bearer ") ? rawKey : rawKey;

    // Optional transport mock hook (for offline integration testing)
    if (typeof options.mockTransport === "function") {
      const mockResult = await options.mockTransport({ reportNo, endpoint, apiKey: rawKey });
      return this._handleGiaResponse(reportNo, mockResult);
    }

    const timeoutMs = options.timeoutMs || 10000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify({
          query: GIA_GET_REPORT_QUERY,
          variables: { reportNumber: String(reportNo).trim() },
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        let errDetail = "";
        try {
          const errJson = await response.json();
          errDetail = errJson?.message || errJson?.error || (errJson?.errors ? errJson.errors[0]?.message : "") || JSON.stringify(errJson);
        } catch (_) {
          errDetail = await response.text().catch(() => "");
        }
        return {
          status: "ERROR",
          error: `GIA API HTTP ${response.status} (${response.statusText}): ${errDetail || "Request failed"}`,
          isMock: false,
          statusCode: response.status,
        };
      }

      const json = await response.json();
      return this._handleGiaResponse(reportNo, json);
    } catch (err) {
      clearTimeout(timer);
      const isAbort = err.name === "AbortError";
      return {
        status: "ERROR",
        error: isAbort ? `GIA API request timed out after ${timeoutMs}ms` : `GIA API network error: ${err.message}`,
        isMock: false,
      };
    }
  }

  /**
   * Handle raw GIA GraphQL response, check for errors / not found, and map to normalized model
   */
  _handleGiaResponse(reportNo, json) {
    if (!json) {
      return {
        status: "ERROR",
        error: "Empty response from GIA API",
        isMock: false,
        data: null,
      };
    }

    // 1. Check for GraphQL errors
    if (Array.isArray(json.errors) && json.errors.length > 0) {
      const mainError = json.errors[0];
      const errMsg = mainError?.message || "Unknown GIA GraphQL error";

      if (/not found/i.test(errMsg) || (json.data && json.data.getReport === null)) {
        return {
          status: "NOT_FOUND",
          error: `Report #${reportNo} was not found on official GIA records.`,
          isMock: false,
          data: null,
          raw: json,
        };
      }

      return {
        status: "ERROR",
        error: `GIA GraphQL Error: ${errMsg}`,
        isMock: false,
        data: null,
        raw: json,
      };
    }

    // 2. Check getReport object
    const report = json.data?.getReport;
    if (!report) {
      return {
        status: "NOT_FOUND",
        error: `Report #${reportNo} was not found on official GIA records.`,
        isMock: false,
        data: null,
        raw: json,
      };
    }

    // 3. Map to canonical normalized structure
    const normalized = this._mapGiaToNormalized(reportNo, report);

    return {
      status: "SUCCESS",
      data: normalized,
      raw: json,
      isMock: false,
    };
  }

  /**
   * Map GIA Report object to ShreeHK normalized certificate model
   */
  _mapGiaToNormalized(reportNo, report) {
    const results = report.results || {};
    const proportions = results.proportions || {};

    // 1. Carat weight (e.g. "0.51 carat" -> 0.51)
    let carat = null;
    if (results.carat_weight != null) {
      const match = String(results.carat_weight).match(/[\d.]+/);
      if (match) carat = parseFloat(match[0]);
    }

    // 2. Measurements ("5.29 x 3.88 x 2.61 mm" or "6.45 - 6.49 x 3.98 mm")
    const measStr = results.measurements ? String(results.measurements).trim() : "";
    let length = null;
    let width = null;
    let depth = null;

    if (measStr) {
      const roundMatch = measStr.match(/([\d.]+)\s*-\s*([\d.]+)\s*[x*×]\s*([\d.]+)/i);
      const standardMatch = measStr.match(/([\d.]+)\s*[x*×]\s*([\d.]+)\s*[x*×]\s*([\d.]+)/i);

      if (roundMatch) {
        length = parseFloat(roundMatch[1]);
        width = parseFloat(roundMatch[2]);
        depth = parseFloat(roundMatch[3]);
      } else if (standardMatch) {
        length = parseFloat(standardMatch[1]);
        width = parseFloat(standardMatch[2]);
        depth = parseFloat(standardMatch[3]);
      }
    }

    // 3. Proportions
    const tablePercent = proportions.table_pct != null ? parseFloat(proportions.table_pct) : null;
    const depthPercent = proportions.depth_pct != null ? parseFloat(proportions.depth_pct) : null;
    const crownAngle = proportions.crown_angle != null ? parseFloat(proportions.crown_angle) : null;
    const crownHeight = proportions.crown_height != null ? parseFloat(proportions.crown_height) : null;
    const pavilionAngle = proportions.pavilion_angle != null ? parseFloat(proportions.pavilion_angle) : null;
    const pavilionDepth = proportions.pavilion_depth != null ? parseFloat(proportions.pavilion_depth) : null;
    const starLength = proportions.star_length != null ? parseFloat(proportions.star_length) : null;
    const lowerHalf = proportions.lower_half != null ? parseFloat(proportions.lower_half) : null;
    const girdle = proportions.girdle || null;
    const culet = proportions.culet || null;

    // 4. Extract Digital Assets (PDF Report & Plot / Diagram Image URLs)
    let pdfReportUrl = null;
    let plotImageUrl = null;

    if (Array.isArray(report.assets)) {
      for (const asset of report.assets) {
        const code = String(asset?.asset_type_code || "").toUpperCase();
        if (code === "REPORT_FACSIMILE_PDF" && asset.link) {
          pdfReportUrl = asset.link;
        } else if ((code === "CLARITY_DIAGRAM" || code === "PROPORTIONS_DIAGRAM") && asset.link) {
          if (!plotImageUrl || code === "CLARITY_DIAGRAM") {
            plotImageUrl = asset.link;
          }
        }
      }
    }

    // Safe fallback PDF URL if not present in assets
    if (!pdfReportUrl) {
      pdfReportUrl = `https://www.gia.edu/report-check?reportno=${reportNo}`;
    }

    // 5. Inscriptions & Key to symbols
    let inscriptions = [];
    if (Array.isArray(results.inscriptions)) {
      inscriptions = results.inscriptions;
    } else if (results.inscriptions) {
      inscriptions = [String(results.inscriptions)];
    }

    let keyToSymbols = [];
    if (Array.isArray(results.clarity_characteristics)) {
      keyToSymbols = results.clarity_characteristics;
    } else if (results.clarity_characteristics) {
      keyToSymbols = String(results.clarity_characteristics)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // 6. Fancy color handling
    let fancyColor = null;
    if (results.color_origin || results.color_distribution) {
      fancyColor = {
        grade: results.color_grade || null,
        origin: results.color_origin || null,
        distribution: results.color_distribution || null,
      };
    }

    return buildNormalizedCertificate({
      reportNumber: String(report.report_number || reportNo).trim(),
      lab: "GIA",
      reportDate: report.report_date_iso || report.report_date || null,
      shape: results.shape_and_cutting_style || "",
      carat,
      color: results.color_grade || "",
      fancyColor,
      clarity: results.clarity_grade || "",
      cut: results.cut_grade || null,
      polish: results.polish || null,
      symmetry: results.symmetry || null,
      fluorescence: {
        intensity: results.fluorescence || "NONE",
        color: null,
      },
      measurements: {
        length,
        width,
        depth,
        formatted: measStr,
      },
      proportions: {
        tablePercent,
        depthPercent,
        girdle,
        culet,
        crownAngle,
        crownHeight,
        pavilionAngle,
        pavilionDepth,
        starLength,
        lowerHalf,
      },
      inscriptions,
      keyToSymbols,
      comments: results.report_comments || null,
      origin: report.industry_disclosures?.disclosed_source?.name || null,
      pdfReportUrl,
      plotImageUrl,
      rawJson: report,
      isMock: false,
    });
  }

  /**
   * Public helper to parse raw GIA JSON directly (useful for tests and external consumers)
   */
  parseGiaResponse(reportNo, giaJson) {
    return this._handleGiaResponse(reportNo, giaJson);
  }

  /**
   * Generates realistic, deterministic mock report data for local development & fallback testing.
   * STRICT ENFORCEMENT: Always flags isMock = true so cache and verified flags are never updated.
   */
  _fetchMockReport(reportNo) {
    const num = parseInt(reportNo.replace(/\D/g, "").slice(-4), 10) || 1234;

    const shapes = ["ROUND", "PRINCESS", "CUSHION MODIFIED", "EMERALD", "OVAL", "PEAR"];
    const colors = ["D", "E", "F", "G", "H", "I"];
    const clarities = ["IF", "VVS1", "VVS2", "VS1", "VS2", "SI1"];
    const cuts = ["EX", "VG", "GD"];

    const shape = shapes[num % shapes.length];
    const color = colors[(num >> 2) % colors.length];
    const clarity = clarities[(num >> 4) % clarities.length];
    const cut = shape === "ROUND" ? cuts[num % cuts.length] : null;
    const carat = Number((0.70 + (num % 180) / 100).toFixed(2));
    const tablePc = 54 + (num % 8);
    const depthPc = 60 + (num % 4);

    const length = Number((5.5 + (num % 25) / 10).toFixed(2));
    const width = Number((5.4 + (num % 25) / 10).toFixed(2));
    const depth = Number((3.3 + (num % 15) / 10).toFixed(2));

    const normalized = buildNormalizedCertificate({
      reportNumber: reportNo,
      lab: "GIA",
      reportDate: new Date().toISOString().split("T")[0],
      shape,
      carat,
      color,
      clarity,
      cut,
      polish: "EX",
      symmetry: "EX",
      fluorescence: { intensity: "NONE", color: null },
      measurements: {
        length,
        width,
        depth,
        formatted: `${length} - ${width} x ${depth} mm`,
      },
      proportions: {
        tablePercent: tablePc,
        depthPercent: depthPc,
        girdle: "Medium to Slightly Thick, Faceted",
        culet: "None",
        crownAngle: 34.5,
        crownHeight: 14.5,
        pavilionAngle: 40.8,
        pavilionDepth: 43.0,
        starLength: 50,
        lowerHalf: 80,
      },
      inscriptions: [`GIA ${reportNo}`],
      keyToSymbols: ["Feather", "Cloud", "Pinpoint"],
      comments: "Additional clouds are not shown. Pinpoints are not shown.",
      pdfReportUrl: `https://www.gia.edu/report-check?reportno=${reportNo}`,
      plotImageUrl: `https://mock.gia.edu/plots/${reportNo}.png`,
      rawJson: { mockSource: "ShreeHK GIA Mock Provider Adapter", reportNo },
      isMock: true,
    });

    return {
      status: "SUCCESS",
      data: normalized,
      raw: { isMock: true, reportNo },
      isMock: true,
    };
  }
}

module.exports = GiaProvider;
