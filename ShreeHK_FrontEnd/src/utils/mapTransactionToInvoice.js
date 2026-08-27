import useAuthStore from "../store/Auth.Store";

const fmtDate = (value) => {
  if (!value) return "—";
  const str = String(value);
  return str.length >= 10 ? str.slice(0, 10) : str;
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const buildDescription = (product) => {
  const color = product.main_color || product.color || "";
  const parts = [product.shape, color, product.clarity, product.size].filter(Boolean).join(" ");
  const labPart = product.report_no ? ` GIA : ${product.report_no}` : "";
  return `${parts}${labPart}`.trim() || "—";
};

const mapProductToLineItem = (product) => ({
  sku: product.sku || product.mfg_code || "—",
  shape: product.shape || product.cut || "",
  clarity: product.clarity || "",
  color: product.color || "",
  main_color: product.main_color || "",
  size: product.size || "",
  report_no: product.report_no || "",
  pcs: toNumber(product.polish_pcs ?? product.rought_pcs),
  carat: toNumber(product.polish_carat ?? product.rought_carat),
  price: toNumber(product.sell_price ?? product.purchase_price ?? product.price ?? product.cost),
  amount: toNumber(product.sell_amount ?? product.purchase_amount ?? product.amount),
  lab: product.lab || "",
  description: buildDescription(product),
});

/**
 * Maps a transaction stock group (outward/inward row + products) to Venya invoice props.
 */
export function mapTransactionToInvoice(record, options = {}) {
  const {
    productIds = null,
    invoiceTitle = "Purchase Invoice",
    company = {},
    disclaimer,
    footerNote = "Receive the above goods as per condition overleaf.",
  } = options;

  const authState = typeof window !== "undefined" ? useAuthStore?.getState?.() || {} : {};

  const allProducts = Array.isArray(record?.products) ? record.products : [];
  const products =
    Array.isArray(productIds) && productIds.length
      ? allProducts.filter((p) => productIds.includes(p.id))
      : allProducts;

  const lineItems = products.map(mapProductToLineItem);
  const subtotal = lineItems.reduce((sum, row) => sum + row.amount, 0);
  const finalAmount = toNumber(record?.final_amount) || subtotal;
  const vatAmount = toNumber(record?.vat_amount);
  const adjustments = finalAmount - subtotal - vatAmount;

  const party = {
    name: record?.party_name || record?.party || "—",
    address: record?.party_address || record?.address || "",
    pincode: record?.party_pincode || record?.pincode || "",
    country: record?.party_country || record?.country || "",
    contact: record?.party_contact || record?.contact_number || "",
    fax: record?.party_fax || record?.fax || "",
    contactPerson: record?.contact_person || "",
  };

  const companyPayload = {
    name: company.name || company.company_name || company.companyName || authState.companyName,
    company_name: company.company_name || company.name || authState.companyName,
    shortcutName: company.shortcutName || authState.companyShortcutName,
    logo: company.logo || company.logoUrl || authState.companyLogo || null,
    logoUrl: company.logoUrl || company.logo || authState.companyLogo || null,
    address: company.address || company.companyAddress || authState.companyAddress || null,
    companyAddress: company.companyAddress || company.address || authState.companyAddress || null,
    number: company.number || company.companyNumber || company.tel || authState.companyNumber || null,
    companyNumber: company.companyNumber || company.number || authState.companyNumber || null,
    city: company.city || company.companyCity || authState.companyCity || null,
    companyCity: company.companyCity || company.city || authState.companyCity || null,
    state: company.state || company.companyState || authState.companyState || null,
    companyState: company.companyState || company.state || authState.companyState || null,
    pincode: company.pincode || company.companyPincode || authState.companyPincode || null,
    companyPincode: company.companyPincode || company.pincode || authState.companyPincode || null,
    country: company.country || company.companyCountry || authState.companyCountry || null,
    companyCountry: company.companyCountry || company.country || authState.companyCountry || null,
    email: company.email || company.companyEmail || authState.companyEmail || null,
    companyEmail: company.companyEmail || company.email || authState.companyEmail || null,
    website: company.website || company.companyWebsite || authState.companyWebsite || null,
    companyWebsite: company.companyWebsite || company.website || authState.companyWebsite || null,
    rapnetId: company.rapnetId || company.companyRapnetId || company.rapnet_id || authState.companyRapnetId || null,
    companyRapnetId: company.companyRapnetId || company.rapnetId || authState.companyRapnetId || null,
    skype: company.skype || company.companySkype || company.skype_id || company.skypeId || authState.companySkypeId || authState.companySkype || null,
    companySkype: company.companySkype || company.skype || authState.companySkypeId || null,
    ...company,
  };

  return {
    invoiceTitle,
    docType: record?.type || "",
    inwardType: record?.inward_type || "",
    type: record?.type || record?.inward_type || "",
    company: companyPayload,
    entryNo: record?.entryno ?? "—",
    invoiceNo: record?.invoiceno ?? "—",
    date: fmtDate(record?.invoicedate || record?.date),
    dueDate: fmtDate(record?.duedate || record?.invoicedate || record?.date),
    reference: record?.reference || "—",
    party,
    lineItems,
    terms: record?.terms ?? "",
    shippingName: record?.shipping_name || "",
    shippingCharge: toNumber(record?.shipping_charge),
    originOf: record?.origin_of || "",
    manufactureOrigin: record?.manufacture_origin || "",
    cif: record?.cif || "",
    paidAmount: toNumber(record?.paid_amount),
    dueAmount: toNumber(record?.due_amount),
    vatAmount,
    vatPercent: record?.vat_percent ?? 7,
    invoiceFrom: toNumber(record?.invoice_from),
    bankFlags: {
      boc: record?.boc,
      citi: record?.citi,
      dbs: record?.dbs,
      sc: record?.sc,
      boc_sksm: record?.boc_sksm,
      citi_sksm: record?.citi_sksm,
    },
    finalAmount,
    totals: {
      subtotal,
      adjustments,
      finalAmount,
    },
    disclaimer,
    footerNote,
  };
}

export default mapTransactionToInvoice;
