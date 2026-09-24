import { Form, Input, Select, Row, Col, DatePicker, InputNumber, Checkbox, Upload } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

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
            case 'password':
                return (
                    <Input.Password
                        autoComplete="new-password"
                        placeholder={field.placeholder || `Enter ${field.label}...`}
                        style={inputStyle}
                        disabled={field.disabled}
                    />
                );
            case 'checkbox':
                return <Checkbox disabled={field.disabled}>{field.label}</Checkbox>;
            case 'upload':
                return (
                    <Upload
                        accept={field.accept || 'image/*'}
                        maxCount={1}
                        listType="picture-card"
                        beforeUpload={() => false}
                        disabled={field.disabled}
                    >
                        <div>
                            <PlusOutlined />
                            <div style={{ marginTop: 8 }}>{field.uploadText || 'Upload'}</div>
                        </div>
                    </Upload>
                );
            case 'hidden':
                return <Input type="hidden" />;
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
                const isUpload = field.type === 'upload';
                const isHidden = field.type === 'hidden';
                const itemKey = `${field.name ?? 'field'}-${field.label ?? ''}-${index}`;

                return (
                    <Col span={columnSpan} key={itemKey} style={isHidden ? { display: 'none' } : undefined}>
                        <Form.Item
                            name={field.name}
                            label={
                                !isCheckbox && !isHidden && field.label
                                    ? (
                                        <span style={{ fontWeight: isStack ? 500 : 500, fontSize: isStack ? 11 : undefined }}>
                                            {field.label}
                                        </span>
                                    )
                                    : null
                            }
                            valuePropName={isCheckbox ? "checked" : isUpload ? "fileList" : "value"}
                            getValueFromEvent={isUpload ? (e) => (Array.isArray(e) ? e : e?.fileList) : undefined}
                            rules={isHidden ? [] : [{ required: field.required, message: `${field.label} is required` }]}
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