/**
 * Common Provider Interface contract for diamond grading laboratories (GIA, IGI, HRD, etc.)
 */
class LabProviderInterface {
  constructor(name) {
    if (new.target === LabProviderInterface) {
      throw new TypeError("Cannot instantiate abstract LabProviderInterface directly.");
    }
    this.name = name;
  }

  getName() {
    return this.name;
  }

  /**
   * Determine if the provider has necessary live credentials configured.
   * @param {Object} credential Decrypted credential object
   * @returns {boolean}
   */
  isConfigured(credential) {
    throw new Error("isConfigured() must be implemented by subclass");
  }

  /**
   * Fetch certificate data by report number.
   * Must return: { status: 'SUCCESS'|'NOT_FOUND'|'ERROR', data: NormalizedObject, raw: Object, isMock: boolean, error?: string }
   * @param {string} reportNo
   * @param {Object} options { credential, timeoutMs, forceRefresh }
   */
  async fetchByReportNumber(reportNo, options = {}) {
    throw new Error("fetchByReportNumber() must be implemented by subclass");
  }

  /**
   * Validates target URL against configurable SSRF allowlist
   * @param {string} targetUrl 
   * @param {string[]} allowedDomains
   */
  validateSsrfUrl(targetUrl, allowedDomains = []) {
    if (!targetUrl) throw new Error("Target URL is empty");

    if (!Array.isArray(allowedDomains) || allowedDomains.length === 0) {
      throw new Error("No allowed lab domains configured. Please configure LAB_ALLOWED_DOMAINS in environment.");
    }

    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      throw new Error("Invalid target URL format");
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error(`Forbidden protocol: ${parsed.protocol}`);
    }

    const host = parsed.hostname.toLowerCase();
    const isAllowed = allowedDomains.some((d) => {
      const dom = String(d).trim().toLowerCase();
      if (!dom) return false;
      return host === dom || host.endsWith(`.${dom}`);
    });

    if (!isAllowed) {
      throw new Error(`SSRF Protection: Host ${host} is not in the allowed lab domains list.`);
    }

    return true;
  }
}

module.exports = LabProviderInterface;
