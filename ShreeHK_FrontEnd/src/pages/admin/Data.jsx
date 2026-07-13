const manageUserFromAdmin = [
    { type: "input", label: "First Name", name: "fname", required: true, span: 12 },
    { type: "input", label: "Last Name", name: "lname", required: true, span: 12 },
    { type: "input", label: "User Name", name: "username", required: true, span: 12 },
    { type: "input", label: "Email ID", name: "email", required: true, span: 12 },
    { type: "input", label: "Mobile No", name: "mobileno", required: true, span: 12 },
    {
        type: "select",
        label: "User Role",
        name: "userroll",
        required: true,
        span: 12,
        options: [
            { key: 1, label: "Super Admin", value: 1 },
            { key: 2, label: "Admin", value: 2 },
            { key: 3, label: "User", value: 0 },
        ]
    },
    {
        type: "select",
        label: "Status",
        name: "is_active",
        required: true,
        span: 12,
        options: [
            { key: 1, label: "Active", value: 1 },
            { key: 0, label: "Inactive", value: 0 },
        ],
    },
    { type: "password", label: "Password", name: "password", required: false, span: 12 },
];

export { manageUserFromAdmin };