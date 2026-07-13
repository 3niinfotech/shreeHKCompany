const expenseFields = [
    { type: "select", label: "Party Name", name: "name", required: true, span: 12 },
    { type: "select", label: "Other Party Name", name: "otherpartyname", required: true, span: 12 },
    { type: "date", label: "Date", name: "date", required: true, span: 12 },
    { type: "select", label: "Dr - Cr", name: "dr-cr", required: true, span: 12 },
    { type: "input", label: "Cheque No", name: "chequeno", required: true, span: 12 },
    { type: "input", label: "Amount", name: "amount", required: true, span: 12 },
    { type: "select", label: "Book Type", name: "booktype", required: true, span: 12 },
    { type: "input", label: "Description", name: "description", required: true, span: 12 },
];

const advancePaymentFields = [
    { type: "select", label: "Party Name", name: "name", required: true, span: 12 },
    { type: "select", label: "Other Party Name", name: "otherpartyname", required: true, span: 12 },
    { type: "date", label: "Date", name: "date", required: true, span: 12 },
    { type: "select", label: "Dr - Cr", name: "dr-cr", required: true, span: 12 },
    { type: "input", label: "Cheque No", name: "cheque", required: true, span: 12 },
    { type: "input", label: "Amount", name: "amount", required: true, span: 12 },
    { type: "select", label: "Book Type", name: "booktype", required: true, span: 12 },
    { type: "input", label: "Description", name: "description", required: true, span: 12 },
];

export { expenseFields, advancePaymentFields };
