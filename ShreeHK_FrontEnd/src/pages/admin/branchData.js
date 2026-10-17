export const branchFields = [
  { type: "input", label: "Branch Name", name: "name", span: 16, required: true },
  { type: "input", label: "Shortcut", name: "shortcutName", span: 8 },
  { type: "input", label: "Phone Number", name: "number", span: 12 },
  {
    type: "select",
    label: "Status",
    name: "status",
    span: 12,
    options: [
      { label: "Active", value: 1 },
      { label: "Inactive", value: 0 },
    ],
  },
  { type: "textarea", label: "Address", name: "address", span: 24 },
  { type: "input", label: "City", name: "city", span: 12 },
  { type: "input", label: "Country", name: "country", span: 12 },
];
