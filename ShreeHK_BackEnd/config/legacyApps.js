/**
 * Legacy PHP apps outside the Node/React DAI ERP rewrite scope.
 * EMS (venya/ems) and SMS (venya/sms) remain separate deployments.
 * Jewelry module (venya/dai/module/jewelry) is disabled in legacy menu — not migrated.
 */
module.exports = {
  outOfScopeApps: [
    {
      key: "ems",
      name: "Email Marketing System",
      legacyPath: "venya/ems/",
      status: "separate_app",
      recommendation: "Keep on PHP or rebuild as a microservice if still required.",
    },
    {
      key: "sms",
      name: "Stock Management System",
      legacyPath: "venya/sms/",
      status: "separate_app",
      recommendation: "Keep on PHP unless SMS workflows are merged into DAI inventory.",
    },
    {
      key: "jewelry",
      name: "Jewelry Module",
      legacyPath: "venya/dai/module/jewelry/",
      status: "legacy_disabled",
      recommendation: "Menu was commented out in PHP; enable migration only if business still uses it.",
    },
  ],
};
