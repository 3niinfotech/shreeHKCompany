export const getMasterRowNumberColumn = () => ({
    title: "No",
    width: 80,
    render: (_, __, index) => index + 1,
});
