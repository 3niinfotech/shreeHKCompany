import { Form, Input, Select, Row, Col, DatePicker, InputNumber, Checkbox } from 'antd';

const { TextArea } = Input;

const DynamicForm = ({ fields, forceFullWidth, layout = 'grid' }) => {
    const form = Form.useFormInstance();
    const isStack = layout === 'stack';

    const renderInput = (field) => {
        const inputStyle = {
            height: field.type === 'textarea' ? 'auto' : (isStack ? '32px' : '40px'),
            width: isStack ? '100%' : (field.width || '100%'),
        };

        switch (field.type) {
            case 'select':
                return (
                    <Select
                        mode={field.mode}
                        placeholder={field.placeholder || `Select ${field.label}`}
                        options={field.options}
                        showSearch
                        allowClear
                        virtual
                        maxTagCount={field.mode === 'multiple' ? 'responsive' : undefined}
                        optionFilterProp="label"
                        style={inputStyle}
                        disabled={field.disabled}
                    />
                );
            case 'date':
                return <DatePicker format="DD-MM-YYYY" placeholder={field.placeholder || `Select ${field.label}`} style={inputStyle} disabled={field.disabled} />;
            case 'number':
                return <InputNumber placeholder={`0.00`} style={inputStyle} disabled={field.disabled} min={0} />;
            case 'textarea':
                return <TextArea rows={field.rows || 3} placeholder={`Enter ${field.label}...`} style={inputStyle} disabled={field.disabled} />;
            case 'checkbox':
                return <Checkbox disabled={field.disabled}>{field.label}</Checkbox>;
            default:
                return (
                    <Input
                        placeholder={field.placeholder || `Enter ${field.label}...`}
                        prefix={field.prefix}
                        onPressEnter={field.onPressEnter}
                        style={inputStyle}
                        disabled={field.disabled}
                    />
                );
        }
    };

    return (
        <Row gutter={isStack ? [0, 8] : [16, 0]} className={isStack ? 'dynamic-form--stack' : undefined}>
            {fields.map((field, index) => {
                const columnSpan = isStack || forceFullWidth ? 24 : (field.span || 12);
                const isCheckbox = field.type === 'checkbox';
                const itemKey = `${field.name ?? 'field'}-${field.label ?? ''}-${index}`;

                return (
                    <Col span={columnSpan} key={itemKey}>
                        <Form.Item
                            name={field.name}
                            label={
                                !isCheckbox && field.label
                                    ? (
                                        <span style={{ fontWeight: isStack ? 500 : 500, fontSize: isStack ? 11 : undefined }}>
                                            {field.label}
                                        </span>
                                    )
                                    : null
                            }
                            valuePropName={isCheckbox ? "checked" : "value"}
                            rules={[{ required: field.required, message: `${field.label} is required` }]}
                        >
                            {renderInput(field)}
                        </Form.Item>
                    </Col>
                );
            })}
        </Row>
    );
};

export default DynamicForm;