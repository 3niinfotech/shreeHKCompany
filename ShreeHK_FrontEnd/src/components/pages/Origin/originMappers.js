export const mapApiToForm = (record) => {
    if (!record) return null;
    return {
        id: record.id,
        name: record.name ?? "",
    };
};

export const mapFormToApi = (values) => ({
    name: values.name,
});
