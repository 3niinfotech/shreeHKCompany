export const mapApiToForm = (record) => {
    if (!record) return null;
    return {
        id: record.id,
        name: record.name ?? "",
        parent: record.parent ?? 0,
    };
};

export const mapFormToApi = (values) => ({
    name: values.name,
    parent: values.parent,
});
