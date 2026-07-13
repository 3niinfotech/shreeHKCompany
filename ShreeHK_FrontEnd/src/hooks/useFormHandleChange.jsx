import { useState, useCallback } from 'react';
import { Form } from 'antd';

const useFormHandleChange = (initialFormValues = {}, initialTableItems = []) => {
    const [form] = Form.useForm();
    const [items, setItems] = useState(initialTableItems);

    // 1. Handle Simple Input Changes (if not using AntD Form)
    // AntD Form automatic handle karta hai, par agar custom state chahiye toh:
    const handleInputChange = useCallback((name, value) => {
        form.setFieldsValue({ [name]: value });
    }, [form]);

    // 2. Table Row Logic: Add Row
    const addRow = useCallback((newRowStructure) => {
        setItems((prev) => [...prev, { ...newRowStructure, key: Date.now() }]);
    }, []);

    // 3. Table Row Logic: Remove Row
    const removeRow = useCallback((key) => {
        setItems((prev) => {
            if (prev.length > 1) return prev.filter(item => item.key !== key);
            return prev;
        });
    }, []);

    // 4. Table Row Logic: Update Cell Value & Auto-Calculate
    const updateTableValue = useCallback((key, field, value, calcFunction) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.key === key) {
                    let updatedItem = { ...item, [field]: value };
                    // Agar koi calculation logic pass kiya hai (e.g. Carat * Price)
                    if (calcFunction) {
                        updatedItem = calcFunction(updatedItem);
                    }
                    return updatedItem;
                }
                return item;
            })
        );
    }, []);

    // 5. Reset Everything
    const resetAll = useCallback(() => {
        form.resetFields();
        setItems(initialTableItems);
    }, [form, initialTableItems]);

    return {
        form,
        items,
        setItems,
        handleInputChange,
        addRow,
        removeRow,
        updateTableValue,
        resetAll
    };
};

export default useFormHandleChange;