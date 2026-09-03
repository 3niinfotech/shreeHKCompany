/**
 * Canonical TanStack Query keys for migrated features.
 * Use queryKeys.<feature>.root to invalidate all queries under that feature.
 */

/** @param {...unknown} parts */
const key = (...parts) => parts.filter((p) => p !== undefined && p !== null);

export const queryKeys = {
    auth: {
        root: key("auth"),
    },

    session: {
        root: key("session"),
        keepalive: (params) => key("session", "keepalive", params),
        context: key("session", "context"),
        companyYears: key("session", "companyYears"),
    },

    common: {
        root: key("common"),
        increment: key("common", "increment"),
    },

    company: {
        root: key("company"),
        list: (params) => key("company", "list", params),
        options: key("company", "options"),
    },

    master: {
        shipping: {
            root: key("master", "shipping"),
            list: (params) => key("master", "shipping", "list", params),
        },
        origin: {
            root: key("master", "origin"),
            list: (params) => key("master", "origin", "list", params),
        },
        lab: {
            root: key("master", "lab"),
            list: (params) => key("master", "lab", "list", params),
        },
        category: {
            root: key("master", "category"),
            list: (params) => key("master", "category", "list", params),
        },
        attribute: {
            root: key("master", "attribute"),
            list: key("master", "attribute", "list"),
        },
        rapnet: {
            root: key("master", "rapnet"),
            prices: key("master", "rapnet", "prices"),
            updatePrice: key("master", "rapnet", "updatePrice"),
            live: key("master", "rapnet", "live"),
            history: (interval) => key("master", "rapnet", "history", interval),
        },
        bulk: {
            root: key("master", "bulk"),
        },
        integration: {
            root: key("master", "integration"),
        },
    },

    inventory: {
        root: key("inventory"),
        list: (params) => key("inventory", "list", params),
        summary: key("inventory", "summary"),
        suggest: (q) => key("inventory", "suggest", q),
        detail: (params) => key("inventory", "detail", params),
        history: (params) => key("inventory", "history", params),
        holdDetail: (params) => key("inventory", "holdDetail", params),
        categorizeTree: key("inventory", "categorizeTree"),
        categorizeStats: (params) => key("inventory", "categorizeStats", params),
    },

    transactionStock: {
        root: key("transactionStock"),
        gia: {
            list: (payload) => key("transactionStock", "gia", "list", payload),
        },
        inward: {
            list: (payload) => key("transactionStock", "inward", "list", payload),
        },
        outward: {
            list: (payload) => key("transactionStock", "outward", "list", payload),
        },
        purchase: {
            list: (payload) => key("transactionStock", "purchase", "list", payload),
        },
        editDetail: (base, id) => key("transactionStock", "editDetail", base, id),
    },

    inward: {
        root: key("inward"),
        checkExist: key("inward", "checkExist"),
        save: key("inward", "save"),
    },

    outward: {
        root: key("outward"),
        list: (payload) => key("outward", "list", payload),
        products: (rowId) => key("outward", "products", rowId),
        detail: (id) => key("outward", "detail", id),
    },

    dashboard: {
        root: key("dashboard"),
        summary: key("dashboard", "summary"),
        trends: (range) => key("dashboard", "trends", range),
    },

    quickNotes: {
        root: key("quickNotes"),
        list: key("quickNotes", "list"),
        todayReminders: key("quickNotes", "todayReminders"),
    },

    admin: {
        root: key("admin"),
        users: (params) => key("admin", "users", params),
        activityLog: (params) => key("admin", "activityLog", params),
        activityLogSummary: (params) => key("admin", "activityLogSummary", params),
        loginHistory: (params) => key("admin", "loginHistory", params),
        tenantCompany: {
            root: key("admin", "tenantCompany"),
            list: key("admin", "tenantCompany", "list"),
            options: key("admin", "tenantCompany", "options"),
        },
        fiscalYears: key("admin", "fiscalYears"),
        legacyApps: key("admin", "legacyApps"),
    },

    role: {
        root: key("role"),
        list: key("role", "list"),
    },

    profile: {
        root: key("profile"),
        me: key("profile", "me"),
    },

    accounting: {
        expanse: {
            root: key("accounting", "expanse"),
            list: (params) => key("accounting", "expanse", "list", params),
        },
        advance: {
            root: key("accounting", "advance"),
            list: (params) => key("accounting", "advance", "list", params),
        },
        balance: {
            root: key("accounting", "balance"),
            list: key("accounting", "balance", "list"),
        },
        currency: {
            root: key("accounting", "currency"),
            list: key("accounting", "currency", "list"),
        },
        partyWise: {
            root: key("accounting", "partyWise"),
            list: (params) => key("accounting", "partyWise", "list", params),
        },
        group: {
            root: key("accounting", "group"),
            list: key("accounting", "group", "list"),
        },
        subgroup: {
            root: key("accounting", "subgroup"),
            list: key("accounting", "subgroup", "list"),
        },
        txn: {
            root: key("accounting", "txn"),
            books: key("accounting", "txn", "books"),
        },
    },

    reports: {
        root: key("reports"),
        filterOptions: key("reports", "filterOptions"),
        outstanding: key("reports", "outstanding"),
        transaction: key("reports", "transaction"),
        group: key("reports", "group"),
        saleStock: key("reports", "saleStock"),
        stoneDetail: (sku) => key("reports", "stoneDetail", sku),
        stoneDetailOld: (sku) => key("reports", "stoneDetailOld", sku),
        transferHistory: (params) => key("reports", "transferHistory", params),
        stoneInfo: (sku) => key("reports", "stoneInfo", sku),
    },

    ai: {
        root: key("ai"),
        threads: key("ai", "threads"),
        threadDetail: (id) => key("ai", "thread", id),
    },

    stoneUpdate: {
        root: key("stoneUpdate"),
        detail: (sku) => key("stoneUpdate", "detail", sku),
    },
};
