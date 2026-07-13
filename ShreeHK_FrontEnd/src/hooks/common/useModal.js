import { useState, useCallback } from "react";

const useModal = (initialOpen = false) => {
    const [open, setOpen] = useState(initialOpen);

    const openModal = useCallback(() => setOpen(true), []);
    const closeModal = useCallback(() => setOpen(false), []);

    return { open, openModal, closeModal, setOpen };
};

export default useModal;
