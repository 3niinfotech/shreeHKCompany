const LabProviderInterface = require("./labProviderInterface.js");

/**
 * IGI Laboratory Provider Adapter (Disabled Stub).
 * 
 * NOTE: Official IGI API is not yet confirmed.
 * This adapter remains in a disabled stub state and reports "not configured".
 */
class IgiProvider extends LabProviderInterface {
  constructor() {
    super("IGI");
  }

  isConfigured() {
    // Strictly disabled stub until official IGI API credentials & endpoints are provided
    return false;
  }

  async fetchByReportNumber(reportNo) {
    return {
      status: "ERROR",
      error: "IGI API provider is currently not configured or enabled. Please use manual entry.",
      isMock: false,
      data: null,
    };
  }
}

module.exports = IgiProvider;
