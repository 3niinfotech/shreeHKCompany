import React from 'react';
import { Form, Input, Select, DatePicker, Checkbox, Radio } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import "../assets/scss/hooks/useFiltersFormFields.scss";

const { RangePicker } = DatePicker;

const DEFAULT_FILTER_LABELS = {
    type: 'Type',
    invoice: 'Invoice No',
    date: 'Date',
    party: 'Party',
};

const useFiltersFormFields = (enabledFields = [], fieldConfigs = {}) => {
    const [form] = Form.useForm();

    const handleClear = () => form.resetFields();

    const fieldLabel = (key) => {
        if (!fieldConfigs.showLabels) return undefined;
        return fieldConfigs.labels?.[key] ?? DEFAULT_FILTER_LABELS[key];
    };

    const fieldNodes = {
        stockChecks: (
            <Form.Item
                key="stockChecks"
                name="stockChecks"
                className="filter-item"
                initialValue={fieldConfigs.stockChecksDefault || []}
            >
                <Checkbox.Group
                    className="filter-checks"
                    options={fieldConfigs.stockChecksOptions || []}
                />
            </Form.Item>
        ),
        fwRadio: (
            <Form.Item
                key="fwRadio"
                name="fwRadio"
                className="filter-item"
                initialValue={fieldConfigs.fwDefault || 'F'}
            >
                <Radio.Group
                    className="filter-radios"
                    options={fieldConfigs.fwOptions || [
                        { label: 'F', value: 'F' },
                        { label: 'W', value: 'W' },
                    ]}
                    optionType="button"
                    buttonStyle="solid"
                />
            </Form.Item>
        ),
        invoice: (
            <Form.Item
                key="invoice"
                name="invoiceNo"
                className="filter-item"
                label={fieldLabel('invoice')}
            >
                <Input
                    className="width-invoice"
                    placeholder="Search Invoice No..."
                    prefix={<SearchOutlined />}
                    allowClear
                />
            </Form.Item>
        ),
        type: (
            <Form.Item
                key="type"
                name="type"
                className="filter-item"
                label={fieldLabel('type')}
            >
                <Select
                    className="width-type"
                    placeholder="Select Type"
                    allowClear
                    options={fieldConfigs.typeOptions || []}
                />
            </Form.Item>
        ),
        party: (
            <Form.Item
                key="party"
                name="party"
                className="filter-item"
                label={fieldLabel('party')}
            >
                <Select
                    className="width-party"
                    placeholder="Select Party"
                    showSearch
                    allowClear
                    loading={fieldConfigs.isPartyLoading}
                    options={fieldConfigs.partyOptions || []}
                    virtual
                    optionFilterProp="label"
                    filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                />
            </Form.Item>
        ),
        date: (
            <Form.Item
                key="date"
                name="dateRange"
                className="filter-item"
                label={fieldLabel('date')}
            >
                <RangePicker className="width-date" placeholder={['Start date', 'End date']} />
            </Form.Item>
        ),
    };

    const renderFilters = () => (
        <div className="filter-form-container">
            {enabledFields.map((key) => fieldNodes[key] || null)}
        </div>
    );

    return { form, handleClear, renderFilters };
};

export default useFiltersFormFields;
