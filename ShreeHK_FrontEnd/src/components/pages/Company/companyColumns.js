import { renderLocationWithFlag } from "../../inventory/LocationWithFlag";

export const getCompanyColumns = (offset) => [
    {
        title: "No.",
        dataIndex: "id",
        key: "id",
        width: 70,
        render: (text, record, index) => offset + index + 1,
    },
    { title: "Company", dataIndex: "name", key: "name" },
    { title: "Address", dataIndex: "address", key: "address", ellipsis: true },
    { title: "Country", dataIndex: "country", key: "country", render: renderLocationWithFlag },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Contact Number", dataIndex: "contact_number", key: "contact_number" },
    { title: "Contact Person", dataIndex: "contact_person", key: "contact_person" },
    { title: "Website", dataIndex: "website", key: "website" },
    { title: "Bank Name", dataIndex: "bank_name", key: "bank_name" },
];
