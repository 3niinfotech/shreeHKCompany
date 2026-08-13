import React, { useEffect, useMemo, useState } from 'react';
import { Form, Button, Card, Typography, Space, Input } from 'antd';
import { WalletOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { BetweenHorizontalEnd, SaveAll, RotateCcw, Plus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import DynamicFormField from '../../hooks/DynamicFormField';
import useFormHandleChange from '../../hooks/useFormHandleChange';
import { expenseFields } from './data';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import { companyFields } from '../master/Data';
import MasterFormAddModal from '../../components/common/masterCommon/MasterFormAddModal';
import PageHeroHeader, { pageHeroHeaderStyles } from '../../components/common/PageHeroHeader';
import styles from '../../assets/scss/pages/accountings/expanse.module.scss';

const { Text } = Typography;

const ExpensePayment = () => {
    const { form: addForm, resetAll } = useFormHandleChange();
    const location = useLocation();
    const [companyForm] = Form.useForm();
    const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

    const { data: companyData, refetch: refetchCompanyOptions } = useFetchApi('GetCompany', ENDPOINTS.company.options);
    const { data: expanseData, refetch } = useFetchApi('expanseData', ENDPOINTS.expanse.list, { limit: 100, offset: 0 });
    const { mutate: createExpense, isLoading: isSubmitting } = usePostApiRequest(ENDPOINTS.expanse.payment, 'expanseData');
    const { mutate: saveCompanyMutation, isLoading: isCompanySaving } = usePostApiRequest(ENDPOINTS.company.save, 'companies');

    const companyOptions = useMemo(() => {
        if (!companyData?.Data) return [];
        return companyData.Data.map((item) => ({ label: item.name, value: item.id }));
    }, [companyData]);

    const updatedFields = useMemo(() => {
        return expenseFields.map((field) => {
            const compact = { ...field, span: 6 };
            if (field.name === 'name' || field.name === 'otherpartyname') {
                return { ...compact, type: 'select', options: companyOptions };
            }
            if (field.name === 'dr-cr') {
                return { ...compact, type: 'select', options: [{ label: 'Dr', value: 'dr' }, { label: 'Cr', value: 'cr' }] };
            }
            if (field.name === 'booktype') {
                const bookValues = [1, 2, 3, 45, 11, 22, 33, 45, 85, 48];
                return { ...compact, type: 'select', options: bookValues.map((n) => ({ label: `Book ${n}`, value: n.toString() })) };
            }
            return compact;
        });
    }, [companyOptions]);

    const partyFields = useMemo(
        () => updatedFields.filter((f) => ['name', 'otherpartyname'].includes(f.name)),
        [updatedFields]
    );
    const paymentFields = useMemo(
        () => updatedFields.filter((f) => ['date', 'dr-cr', 'chequeno', 'amount', 'booktype'].includes(f.name)),
        [updatedFields]
    );
    const noteFields = useMemo(
        () => updatedFields
            .filter((f) => f.name === 'description')
            .map((f) => ({ ...f, span: 12 })),
        [updatedFields]
    );

    const editIdFromUrl = useMemo(() => {
        const id = new URLSearchParams(location.search).get('id');
        return id ? Number(id) : 0;
    }, [location.search]);

    useEffect(() => {
        const recordFromState = location.state?.record;
        if (recordFromState?.id) {
            addForm.setFieldsValue({
                id: recordFromState.id,
                name: recordFromState.party ?? recordFromState.name,
                otherpartyname: recordFromState.other_party ?? recordFromState.otherpartyname,
                date: recordFromState.date ? dayjs(recordFromState.date) : null,
                'dr-cr': recordFromState.type ?? recordFromState['dr-cr'],
                chequeno: recordFromState.cheque ?? recordFromState.chequeno,
                amount: recordFromState.amount,
                booktype: recordFromState.book ?? recordFromState.booktype,
                description: recordFromState.description,
            });
        }
    }, [location.state, addForm]);

    useEffect(() => {
        if (!editIdFromUrl || !expanseData?.Data) return;
        const rows = Array.isArray(expanseData.Data) ? expanseData.Data : Object.values(expanseData.Data);
        const record = rows.find((row) => Number(row.id) === Number(editIdFromUrl));
        if (!record) return;
        addForm.setFieldsValue({
            id: record.id,
            name: record.party,
            otherpartyname: record.other_party,
            date: record.date ? dayjs(record.date) : null,
            'dr-cr': record.type,
            chequeno: record.cheque,
            amount: record.amount,
            booktype: record.book,
            description: record.description,
        });
    }, [editIdFromUrl, expanseData, addForm]);

    const onFinish = (values) => {
        const payload = {
            id: Number(values?.id) > 0 ? Number(values.id) : 0,
            party: values.name,
            other_party: values.otherpartyname,
            date: values.date?.format ? values.date.format('YYYY-MM-DD') : values.date,
            type: values['dr-cr'],
            cheque: values.chequeno,
            amount: values.amount,
            book: values.booktype,
            description: values.description,
        };
        createExpense(payload, {
            onSuccess: () => {
                resetAll();
                refetch();
            },
        });
    };

    const handleOpenCompanyModal = () => {
        companyForm.resetFields();
        setIsCompanyModalOpen(true);
    };

    const handleCloseCompanyModal = () => {
        setIsCompanyModalOpen(false);
        companyForm.resetFields();
    };

    const handleSaveCompany = async () => {
        try {
            const values = await companyForm.validateFields();
            saveCompanyMutation(
                { id: 0, ...values },
                {
                    onSuccess: () => {
                        handleCloseCompanyModal();
                        refetchCompanyOptions();
                    },
                }
            );
        } catch {
            // Form validation handles field errors.
        }
    };

    return (
        <div className={styles.Container}>
            <PageHeroHeader
                breadcrumb="ACCOUNTING"
                title="Expense — Payment"
                icon={<WalletOutlined />}
                actions={(
                    <Space wrap>
                        <Link to="/accounting/expanse/table-data">
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
                                <Text strong className={styles.formCardTitle}>Add New Expense</Text>
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
                                    Save Entry
                                </Button>
                            </div>
                        </Form>
                    </Card>
                </div>
            </div>

            <MasterFormAddModal
                isOpen={isCompanyModalOpen}
                onClose={handleCloseCompanyModal}
                onSave={handleSaveCompany}
                loading={isCompanySaving}
                form={companyForm}
                formFields={companyFields}
                title="Add Company Management Details"
                width={800}
            />
        </div>
    );
};

export default ExpensePayment;
