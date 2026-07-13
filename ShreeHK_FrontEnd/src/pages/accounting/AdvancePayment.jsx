import React, { useMemo } from 'react';
import {
    Form, Button, Card, Typography, Space, message, Input,
} from 'antd';
import { WalletOutlined, UnorderedListOutlined } from '@ant-design/icons';
import {
    BetweenHorizontalEnd, SaveAll, RotateCcw, Plus,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import DynamicFormField from '../../hooks/DynamicFormField';
import useFormHandleChange from '../../hooks/useFormHandleChange';
import { advancePaymentFields } from './data';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import PageHeroHeader, { pageHeroHeaderStyles } from '../../components/common/PageHeroHeader';
import styles from '../../assets/scss/pages/accountings/expanse.module.scss';

const { Text } = Typography;

const AdvancePayment = () => {
    const navigate = useNavigate();
    const { form: addForm, resetAll } = useFormHandleChange();

    const { data: companyData } = useFetchApi('GetCompany', ENDPOINTS.company.options);
    const { refetch } = useFetchApi('advanceData', ENDPOINTS.advance.list, { limit: 100, offset: 0 });
    const { mutate: createAdvance, isLoading: isSubmitting } = usePostApiRequest(ENDPOINTS.advance.payment);

    const handleOpenCompanyModal = () => {
        navigate('/master/company-details');
    };

    const companyOptions = useMemo(() => {
        if (!companyData?.Data) return [];
        return companyData.Data.map(item => ({ label: item.name, value: item.id }));
    }, [companyData]);

    const updatedFields = useMemo(() => {
        return advancePaymentFields.map(field => {
            const compact = { ...field, span: 6 };
            if (field.name === 'name' || field.name === 'otherpartyname') {
                return { ...compact, type: 'select', options: companyOptions };
            }
            if (field.name === 'dr-cr') {
                return { ...compact, type: 'select', options: [{ label: 'Dr', value: 'dr' }, { label: 'Cr', value: 'cr' }] };
            }
            if (field.name === 'booktype') {
                const bookValues = [1, 2, 3, 45, 11, 22, 33, 85, 48];
                return { ...compact, type: 'select', options: bookValues.map(n => ({ label: `Book ${n}`, value: n.toString() })) };
            }
            return compact;
        });
    }, [companyOptions]);

    const partyFields = useMemo(
        () => updatedFields.filter((f) => ['name', 'otherpartyname'].includes(f.name)),
        [updatedFields]
    );
    const paymentFields = useMemo(
        () => updatedFields.filter((f) => ['date', 'dr-cr', 'cheque', 'amount', 'booktype'].includes(f.name)),
        [updatedFields]
    );
    const noteFields = useMemo(
        () => updatedFields
            .filter((f) => f.name === 'description')
            .map((f) => ({ ...f, span: 12 })),
        [updatedFields]
    );

    const onFinish = (values) => {
        const payload = {
            id: Number(values?.id) > 0 ? Number(values.id) : 0,
            party: values.name,
            other_party: values.otherpartyname,
            date: values.date?.format ? values.date.format('YYYY-MM-DD') : values.date,
            type: values['dr-cr'],
            cheque: values.cheque,
            amount: values.amount,
            book: values.booktype,
            description: values.description,
        };
        createAdvance(payload, {
            onSuccess: () => {
                resetAll();
                refetch();
            },
        });
    };

    return (
        <div className={styles.Container}>
            <PageHeroHeader
                breadcrumb="ACCOUNTING"
                title="Advance — Payment"
                icon={<WalletOutlined />}
                actions={(
                    <Space wrap>
                        <Link to="/accounting/advance/table-data">
                            <Button icon={<UnorderedListOutlined />} className={pageHeroHeaderStyles.actionBtn}>
                                View All Entries
                            </Button>
                        </Link>
                        <Button type="primary" icon={<Plus size={16} />} onClick={handleOpenCompanyModal}>
                            Add New Company
                        </Button>
                    </Space>
                )}
            />

            <div className={styles.rowLayout}>
                <div className={styles.formCol}>
                    <Card className={styles.formCard}>
                        <div className={styles.formCardHead}>
                            <div className={styles.formCardHeadIcon}>
                                <BetweenHorizontalEnd size={18} />
                            </div>
                            <div>
                                <Text strong className={styles.formCardTitle}>Add New Advance</Text>
                                <Text type="secondary" className={styles.formCardSub}>Fill payment details and save entry</Text>
                            </div>
                        </div>

                        <Form form={addForm} layout="vertical" onFinish={onFinish} className={styles.expenseForm}>
                            <Form.Item name="id" hidden>
                                <Input />
                            </Form.Item>

                            <div className={styles.formSection}>
                                <Text className={styles.sectionLabel}>Party Details</Text>
                                <DynamicFormField fields={partyFields} />
                            </div>

                            <div className={styles.formSection}>
                                <Text className={styles.sectionLabel}>Payment Details</Text>
                                <DynamicFormField fields={paymentFields} />
                            </div>

                            <div className={styles.formSection}>
                                <Text className={styles.sectionLabel}>Additional Info</Text>
                                <DynamicFormField fields={noteFields} />
                            </div>

                            <div className={styles.footerActions}>
                                <Button icon={<RotateCcw size={14} />} className={styles.btnReset} onClick={resetAll}>
                                    Reset
                                </Button>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={isSubmitting}
                                    icon={<SaveAll size={14} />}
                                    className={styles.btnSave}
                                >
                                    Save Advance
                                </Button>
                            </div>
                        </Form>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdvancePayment;
