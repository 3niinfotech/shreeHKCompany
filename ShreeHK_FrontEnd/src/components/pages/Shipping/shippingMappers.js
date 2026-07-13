export const mapApiToForm = (record) => {
    if (!record) return null;
    return {
        id: record.id,
        shipping: record.name ?? "",
    };
};

export const mapFormToApi = (values) => ({
    name: values.shipping,
});
