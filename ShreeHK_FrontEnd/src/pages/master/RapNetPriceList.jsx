import React, { useEffect, useState } from 'react';
import { Alert, Button, Typography } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { toastApiSuccess, toastApiError, getApiErrorMessage } from '../../utils/apiToast';
import { MasterListTable } from '../../components/common/table';
import Loader from '../../components/common/Loader';
import { useFetchApi } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';

const { Text } = Typography;

const RapNetPriceList = () => {
    const [dataSource, setDataSource] = useState([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const queryClient = useQueryClient();
    const { data, isLoading, isError, error, refetch } = useFetchApi('rapnetPrices', ENDPOINTS.rapnet.prices, {});

    const {
        refetch: refetchUpdate,
        isFetching: isUpdating,
    } = useFetchApi(
        'rapnetUpdatePrice',
        ENDPOINTS.rapnet.updatePrice,
        {},
        'GET',
        { enabled: false }
    );

    const columns = [
        {
            title: 'No.',
            width: 70,
            render: (_, __, index) => index + 1,
        },
        {
            title: 'Shape',
            dataIndex: 'shape',
            key: 'shape',
            render: (text) => (text != null ? String(text).toUpperCase() : ''),
        },
        {
            title: 'Color',
            dataIndex: 'color',
            key: 'color',
            render: (text) => (text != null ? String(text).toUpperCase() : ''),
        },
        {
            title: 'Clarity',
            dataIndex: 'clarity',
            key: 'clarity',
            render: (text) => (text != null ? String(text).toUpperCase() : ''),
        },
        {
            title: 'Low Size',
            dataIndex: 'low_size',
            key: 'low_size',
        },
        {
            title: 'High Size',
            dataIndex: 'high_size',
            key: 'high_size',
            ellipsis: true,
        },
        {
            title: 'Carat Price',
            dataIndex: 'caratprice',
            key: 'caratprice',
        },
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
        },
    ];

    useEffect(() => {
        if (Array.isArray(data?.Data)) {
            setDataSource(data.Data);
            setIsInitialLoading(false);
        } else if (!isLoading) {
            setIsInitialLoading(false);
        }
    }, [data, isLoading]);

    const handleUpdateRapnet = async () => {
        try {
            const result = await refetchUpdate();
            const payload = result.data;
            if (payload?.status) {
                toastApiSuccess(payload);
                await queryClient.invalidateQueries({ queryKey: ['rapnetPrices'] });
                refetch();
            } else {
                toastApiError({ response: { data: payload } });
            }
        } catch (error) {
            toastApiError(error);
        }
    };

    if (isInitialLoading && isLoading) {
        return <Loader />;
    }

    const loadError = isError ? getApiErrorMessage(error) : null;
    const isEmpty = !isLoading && !loadError && dataSource.length === 0;

    return (
        <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                Prices are synced from the Rapaport API. Click <strong>Update Rapnet Price</strong> to load data into the current company/year database.
            </Text>
            {loadError && (
                <Alert
                    type="error"
                    showIcon
                    style={{ marginBottom: 12 }}
                    message="Could not load RapNet prices"
                    description={loadError}
                />
            )}
            {isEmpty && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 12 }}
                    message="No RapNet prices in database"
                    description='The list is empty for your selected company/year. Click "Update Rapnet Price" above to fetch prices from Rapaport.'
                />
            )}
            <MasterListTable
                title="RapNet Price List"
                columns={columns}
                dataSource={dataSource}
                loading={isLoading}
                hideCrudActions
                rowKey={(record, index) =>
                    record?.id ?? `${record?.shape}-${record?.color}-${record?.clarity}-${record?.low_size}-${index}`
                }
                extraHeaderActions={
                    <Button
                        type="primary"
                        loading={isUpdating}
                        disabled={isUpdating}
                        onClick={handleUpdateRapnet}
                    >
                        Update Rapnet Price
                    </Button>
                }
            />
        </>
    );
};

export default RapNetPriceList;
