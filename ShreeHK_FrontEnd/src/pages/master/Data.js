const companyFields = [
  { type: "input", label: "Company Name", name: "name", required: true, span: 24 },
  { type: "input", label: "Address", name: "address", required: false, span: 24 },
  { type: "input", label: "Country", name: "country", required: false, span: 12 },
  { type: "input", label: "Pincode", name: "pincode", required: false, span: 12 },
  { type: "input", label: "Email", name: "email", inputType: "email", required: false, span: 12 },
  { type: "input", label: "Contact No", name: "contact_number", required: false, span: 12 },
  { type: "input", label: "Fax", name: "fax", required: false, span: 12 },
  { type: "input", label: "Contact Person", name: "contact_person", required: false, span: 12 },
  { type: "input", label: "Website", name: "website", required: false, span: 24 },
  { type: "input", label: "Bank Name", name: "bank_name", required: false, span: 12 },
  { type: "input", label: "Account No.", name: "account_number", required: false, span: 12 },
  { type: "input", label: "Bank Address", name: "bank_address", required: false, span: 24 },
  { type: "input", label: "Branch", name: "branch", required: false, span: 12 },
  { type: "input", label: "Swift Code", name: "swift_code", required: false, span: 12 },
  { type: "input", label: "Under Group", name: "under_group", required: false, span: 12 },
  { type: "input", label: "Under Sub Group", name: "under_subgroup", required: false, span: 12 },
];

const shippingFields = [
  { type: "input", label: "Shipping Name", name: "shipping", required: true, span: 12 },
];

const originFields = [
  { type: "input", label: "Name", name: "name", required: true, span: 12 },
];

const labFields = [
  { type: "input", label: "Lab Name", name: "labname", required: true, span: 12 },
  { type: "input", label: "Report Link", name: "reportlink", required: true, span: 12 },
];

const categoryFields = [
  { type: "input", label: "Name", name: "name", required: true, span: 12 },
  { type: "input", label: "Parent", name: "parent", required: true, span: 12 },
];

const attributeFields = [
  { type: "input", label: "Name", name: "name", required: true, span: 12 },
  { type: "input", label: "Code", name: "code", required: true, span: 12 },
  { type: "input", label: "Value", name: "value", required: false, span: 12 },
  { type: "number", label: "Sort Order", name: "short_order", required: false, span: 12 },
];

const accGroupFields = [
  { type: "input", label: "Group Name", name: "name", required: true, span: 24 },
];

const accSubgroupFields = [
  { type: "input", label: "Sub Group Name", name: "name", required: true, span: 24 },
  { type: "number", label: "Group Id", name: "group_id", required: false, span: 24 },
];

export { companyFields, shippingFields, originFields, labFields, categoryFields, attributeFields, accGroupFields, accSubgroupFields };