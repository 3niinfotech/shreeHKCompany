import { Form, Input, Select, Row, Col, DatePicker, InputNumber, Checkbox, Upload } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { TextArea } = Input;

const ColorPickerInput = ({ value, onChange, placeholder, disabled, height }) => {
    const rawVal = typeof value === 'string' ? value.trim() : '';
    const normalizedHex = /^[0-9A-Fa-f]{6}$/i.test(rawVal) ? `#${rawVal}` : rawVal;
    const validHex = /^#[0-9A-Fa-f]{6}$/i.test(normalizedHex) ? normalizedHex : '#1e3a8a';

    const handleBlur = (e) => {
        const val = e.target.value?.trim() || '';
        if (/^[0-9A-Fa-f]{6}$/i.test(val)) {
            onChange?.(`#${val}`);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <input
                type="color"
                value={validHex}
                onChange={(e) => onChange?.(e.target.value)}
                disabled={disabled}
                style={{
                    width: 36,
                    height: height || 'var(--form-control-height, 32px)',
                    padding: 2,
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    background: 'transparent',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                }}
                title="Click to pick color"
            />
            <Input
                value={value ?? ''}
                onChange={(e) => onChange?.(e.target.value)}
                onBlur={handleBlur}
                placeholder={placeholder || 'e.g. #1e3a8a'}
                allowClear
                disabled={disabled}
                style={{ flex: 1, height: height || 'var(--form-control-height, 32px)' }}
            />
        </div>
    );
};

const DynamicForm = ({ fields, forceFullWidth, layout = 'grid' }) => {
    const form = Form.useFormInstance();
    const isStack = layout === 'stack';

    const renderInput = (field) => {
        const inputStyle = {
            height: field.type === 'textarea' ? 'auto' : 'var(--form-control-height, 32px)',
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
                        allowClear={field.allowClear !== false}
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
            case 'color':
                return (
                    <ColorPickerInput
                        placeholder={field.placeholder || `Enter ${field.label}...`}
                        height={inputStyle.height}
                        disabled={field.disabled}
                    />
                );
            case 'custom':
                return typeof field.render === 'function' ? field.render() : field.render;
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
        <Row gutter={isStack ? [0, 8] : [16, 8]} className={isStack ? 'dynamic-form--stack' : 'dynamic-form--grid'}>
            {fields.map((field, index) => {
                const columnSpan = isStack || forceFullWidth ? 24 : (field.span || 12);
                const colFlex = !isStack && !forceFullWidth ? field.flex : undefined;
                const isCheckbox = field.type === 'checkbox';
                const isUpload = field.type === 'upload';
                const isHidden = field.type === 'hidden';
                const isCustom = field.type === 'custom';
                const itemKey = `${field.name ?? 'field'}-${field.label ?? ''}-${index}`;
                const colProps = {
                    key: itemKey,
                    ...(colFlex ? { flex: colFlex } : { span: columnSpan }),
                    style: {
                        ...(field.style || {}),
                        ...(isHidden ? { display: 'none' } : null),
                    },
                };

                if (isCustom && field.noFormItem) {
                    return (
                        <Col {...colProps}>
                            {typeof field.render === 'function' ? field.render() : field.render}
                        </Col>
                    );
                }

                return (
                    <Col {...colProps}>
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