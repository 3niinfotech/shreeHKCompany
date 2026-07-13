export const mapApiToForm = (record) => {
    if (!record) return null;
    return {
        id: record.id,
        labname: record.lab ?? "",
        reportlink: record.reportlink ?? "",
    };
};

export const mapFormToApi = (values) => ({
    lab: values.labname ?? values.lab ?? "",
    reportlink: values.reportlink ?? "",
});
