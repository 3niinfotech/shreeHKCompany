export const mapApiToForm = (record) => {
    if (!record) return null;

    return {
        id: record.id,
        name: record.name ?? "",
        address: record.address ?? "",
        country: record.country ?? "",
        pincode: record.pincode ?? "",
        email: record.email ?? "",
        contact_number: record.contact_number ?? "",
        fax: record.fax ?? "",
        contact_person: record.contact_person ?? "",
        website: record.website ?? "",
        bank_name: record.bank_name ?? "",
        account_number: record.account_number ?? "",
        bank_address: record.bank_address ?? "",
        branch: record.branch ?? "",
        swift_code: record.swift_code ?? "",
        under_group: record.under_group ?? "",
        under_subgroup: record.under_subgroup ?? "",
    };
};

export const mapFormToApi = (values) => ({
    name: values.name,
    address: values.address,
    country: values.country,
    pincode: values.pincode,
    email: values.email,
    contact_number: values.contact_number,
    fax: values.fax,
    contact_person: values.contact_person,
    website: values.website,
    bank_name: values.bank_name,
    bank_address: values.bank_address,
    account_number: values.account_number,
    branch: values.branch,
    swift_code: values.swift_code,
    under_group: values.under_group,
    under_subgroup: values.under_subgroup,
});
