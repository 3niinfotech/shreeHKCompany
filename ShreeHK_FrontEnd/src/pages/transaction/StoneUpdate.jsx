import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation } from "react-router-dom";
import { Form, Button, Divider, Row, Col, Empty, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Save, Box } from "lucide-react";
import AIPriceSuggestBlock from '../../components/ai/AIPriceSuggestBlock';
import { toastApiSuccess, toastApiError } from '../../utils/apiToast';

import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import useFormHandleChange from '../../hooks/useFormHandleChange';
import DynamicForm from '../../hooks/DynamicFormField';
import useThemeColors from '../../hooks/useThemeColors';
import { SkeletonForm, SkeletonDetail } from '../../components/common/skeleton';
import Toggle from './Toggle';
import {
    stoneUploadfields,
    stoneUploadfieldsBottom,
    initialFormData,
    stoneTypeOptions,
} from './Data';
import { mapApiToForm, mapFormToApi } from './stoneUpdateMappers';
import AdvancedFilterPanel, { FilterField, filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import styles from '../../assets/scss/pages/transaction/stoneupdate.module.scss';

const StoneUpdate = () => {
    const theme = useThemeColors();
    const [form] = Form.useForm();
    const { resetAll } = useFormHandleChange(initialFormData);
    const [searchValue, setSearchValue] = useState("");
    const [showForm, setShowForm] = useState(false);

    const location = useLocation();
    const skuFromUpdate = new URLSearchParams(location.search).get('skuupdate');

    const categories = useMemo(() => [
        { id: 1, name: "Natural Diamond" },
        { id: 2, name: "Lab Grown Diamond" },
        { id: 56, name: "Pink Collection" },
    ], []);

    const { data: apiResponse, refetch: fetchStone, isFetching: isSearching } = useFetchApi(
        ['productDetails', searchValue],
        ENDPOINTS.product.detail,
        { by: 'p.sku', id: searchValue },
        'GET',
        { enabled: false, retry: false, staleTime: 0 }
    );

    const saveMutation = usePostApiRequest(ENDPOINTS.product.save, 'productDetails');

    const populateForm = useCallback((data) => {
        const mapped = mapApiToForm(data);
        if (!mapped?.id) {
            setShowForm(false);
            return;
        }
        form.setFieldsValue({ ...initialFormData, ...mapped });
        setShowForm(true);
    }, [form]);

    const handleSearch = async () => {
        const sku = searchValue.trim();
        if (!sku) return;

        // const loadingId = toast.loading("Searching ERP...");
        try {
            const result = await fetchStone();
            if (result.error) throw result.error;

            const stone = result.data?.Data;
            if (!stone) {
                setShowForm(false);
                toastApiError(result.error || { response: { data: result.data } });
                return;
            }

            populateForm(stone);
            toastApiSuccess(result.data);
        } catch (err) {
            setShowForm(false);
            toastApiError(err);
        }
    };

    const handleReload = () => {
        setSearchValue("");
        setShowForm(false);
        form.resetFields();
        resetAll();
    };

    const onFinish = (formValues) => {
        const productId = formValues.id ?? form.getFieldValue('id');
        if (!productId) return;

        const payload = mapFormToApi({ ...formValues, id: productId });
        saveMutation.mutate(payload);
    };

    useEffect(() => {
        if (skuFromUpdate) {
            setSearchValue(skuFromUpdate);
            setTimeout(() => fetchStone(), 0);
        }
    }, [skuFromUpdate, fetchStone]);

    useEffect(() => {
        if (apiResponse?.Data) populateForm(apiResponse.Data);
    }, [apiResponse, populateForm]);

    const renderLoader = () => (
        <div className={styles.loaderContainer} style={{ padding: 24 }}>
            <SkeletonDetail fields={8} />
            <div style={{ marginTop: 24 }}>
                <SkeletonForm fields={6} />
            </div>
        </div>
    );

    const renderEmpty = () => (
        <div className={styles.emptyState}>
            <Empty
                image={<Box size={64} color={theme.muted} strokeWidth={1} />}
                description={<span>Enter a <b>Stone SKU</b> to load details.</span>}
            />
        </div>
    );

    return (
        <div className={styles.erpContainer}>
            <AdvancedFilterPanel
                title="Search Stone"
                // subtitle="Enter stone ID or SKU to load and update stone details."
                activeCount={searchValue ? 1 : 0}
                showClear={false}
                showSearch={false}
                extraActions={
                    <>
                        <Button
                            onClick={handleReload}
                            className={styles.stoneResetBtn}
                            disabled={isSearching}
                        >
                            Reset
                        </Button>
                        <Button
                            type="primary"
                            icon={<SearchOutlined />}
                            loading={isSearching}
                            onClick={handleSearch}
                            className={styles.stoneSearchBtn}
                        >
                            Search
                        </Button>
                    </>
                }
            >
                {/* <FilterField label="Stone Id / SKU"> */}
                <FilterField>
                    <Input
                        id="stone-sku-input"
                        allowClear
                        prefix={<SearchOutlined className={styles.stoneSearchIcon} />}
                        className={`${filterPanelStyles.filterControl} ${styles.stoneSearchInput}`}
                        placeholder="e.g. DKG-010"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onPressEnter={handleSearch}
                        disabled={isSearching}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </FilterField>
            </AdvancedFilterPanel>

            {isSearching && !showForm ? renderLoader() :
                showForm ? (
                    <Form form={form} layout="vertical" onFinish={onFinish} className={styles.mainCard}>
                        <Form.Item name="id" hidden>
                            <Input type="hidden" />
                        </Form.Item>

                        <div className={styles.actionBar}>
                            <div className={styles.toggleGroup}>
                                {['is_uploadsite', 'is_uploadrapnet', 'hide'].map(name => (
                                    <Form.Item key={name} name={name} valuePropName="checked" noStyle>
                                        <Toggle label={`${name.replace('is_', '').replace('_', ' ')} :`} />
                                    </Form.Item>
                                ))}
                            </div>
                            {/* <AIPriceSuggestBlock getFormValues={() => form.getFieldsValue()} /> */}
                            <Button type="primary" htmlType="submit" className={styles.saveBtn}
                                icon={<Save size={18} />} loading={saveMutation.isPending}>
                                Save Stone Data
                            </Button>
                        </div>

                        <div className={styles.formBody}>
                            <Section title="Basic Specifications" fields={stoneUploadfields} />
                            <Divider className={styles.formDivider} />
                            <Section title="Technical Details" fields={stoneUploadfieldsBottom} />
                            <Divider dashed />

                            <Row gutter={[24, 24]}>
                                <SelectField name="group_type" label="Stone Type" options={stoneTypeOptions} />
                                <SelectField name="category" label="Category" options={categories} isCategory />
                            </Row>
                        </div>
                    </Form>
                ) : renderEmpty()}
        </div>
    );
};

const Section = ({ title, fields }) => (
    <>
        <div className={styles.sectionTitle}>{title}</div>
        <DynamicForm fields={fields} />
    </>
);

const SelectField = ({ name, label, options }) => (
    <Col span={6}>
        <Form.Item name={name} label={label}>
            <select className="form-control">
                <option value="">Select {label}</option>
                {options.map(opt => (
                    <option key={opt.id || opt.value} value={opt.id || opt.value}>
                        {opt.name || opt.label}
                    </option>
                ))}
            </select>
        </Form.Item>
    </Col>
);

export default StoneUpdate;
