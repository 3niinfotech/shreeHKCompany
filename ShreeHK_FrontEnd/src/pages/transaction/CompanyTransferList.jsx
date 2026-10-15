import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Table,
  Card,
  Typography,
  Space,
  Button,
  Tag,
  Select,
  Input,
  Empty,
  DatePicker,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  RollbackOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import AdvancedFilterPanel, { FilterField, filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import TransactionInvoicePreviewModal from '../../components/transaction/invoice/TransactionInvoicePreviewModal';
import { SkuLink } from '../../hooks/useSkuModalAction';
import useAuthStore from '../../store/Auth.Store';
import useBranchCompanies from '../../hooks/useBranchCompanies';
import useTableBodyScrollHeight from '../../hooks/useTableBodyScrollHeight';
import useTableSkeleton from '../../components/common/skeleton/useTableSkeleton';
import { cssVar } from '../../theme';
import {
  fetchCompanyTransferList,
  executeTransferSaleReturn,
} from '../../api/services/companyTransferService';
import { toastSuccess, toastError, toastApiError } from '../../utils/toastNotify';
import styles from '../../assets/scss/pages/outward.module.scss';
import '../../assets/scss/masterEdit.scss';

const { Text } = Typography;

const PAGE_SIZE_DEFAULT = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const childColumns = [
  {
    title: 'No',
    width: 45,
    align: 'center',
    render: (_, __, i) => i + 1,
  },
  {
    title: 'SKU / Transferred Stone',
    dataIndex: 'sku',
    key: 'sku',
    width: 170,
    render: (text, record) => {
      const hasDiffSource = record.source_sku && record.source_sku !== text;
      return (
        <Space direction="vertical" size={1} style={{ display: 'inline-flex' }}>
          <SkuLink sku={text} record={record} />
          {hasDiffSource && (
            <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>
              From SKU: <strong style={{ color: '#0284c7' }}>{record.source_sku}</strong>
            </span>
          )}
        </Space>
      );
    },
  },
  {
    title: 'Shape',
    dataIndex: 'shape',
    key: 'shape',
    width: 90,
    render: (v) => v || '—',
  },
  {
    title: 'Color',
    dataIndex: 'color',
    key: 'color',
    width: 80,
    align: 'center',
    render: (v) => v || '—',
  },
  {
    title: 'Clarity',
    dataIndex: 'clarity',
    key: 'clarity',
    width: 80,
    align: 'center',
    render: (v) => v || '—',
  },
  {
    title: 'Cut',
    dataIndex: 'cut',
    key: 'cut',
    width: 70,
    align: 'center',
    render: (v) => v || '—',
  },
  {
    title: 'Polish',
    dataIndex: 'polish',
    key: 'polish',
    width: 70,
    align: 'center',
    render: (v) => v || '—',
  },
  {
    title: 'Lab',
    dataIndex: 'lab',
    key: 'lab',
    width: 70,
    align: 'center',
    render: (v) => v || '—',
  },
  {
    title: 'Pcs',
    dataIndex: 'pcs',
    key: 'pcs',
    width: 70,
    align: 'center',
    render: (v) => Number(v || 0).toLocaleString(),
  },
  {
    title: 'Carat',
    dataIndex: 'carat',
    key: 'carat',
    width: 90,
    align: 'right',
    render: (v) => Number(v || 0).toFixed(2),
  },
  {
    title: 'Price ($)',
    dataIndex: 'price',
    key: 'price',
    width: 100,
    align: 'right',
    render: (v) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  },
  {
    title: 'Amount ($)',
    dataIndex: 'amount',
    key: 'amount',
    width: 120,
    align: 'right',
    render: (v) => (
      <Text strong>
        ${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Text>
    ),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 110,
    align: 'center',
    render: (status) => (
      <Tag
        color={status === 'transferred' ? 'success' : 'purple'}
        style={{ textTransform: 'uppercase', fontWeight: 600 }}
      >
        {status || 'transferred'}
      </Tag>
    ),
  },
];

const CompanyTransferList = () => {
  const navigate = useNavigate();
  const currentCompanyName = useAuthStore((s) => s.companyName) || 'Company';

  const { options: branchCompanies } = useBranchCompanies();

  // Filter state (matches AdvancedFilterPanel pattern)
  const [skuSearch, setSkuSearch] = useState('');
  const [fromCompany, setFromCompany] = useState('');
  const [toCompany, setToCompany] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  // Table state
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [returnSubmittingId, setReturnSubmittingId] = useState(null);

  // Invoice Preview Modal state
  const [invoiceModal, setInvoiceModal] = useState({
    open: false,
    record: null,
    invoiceTitle: 'Sale Invoice',
    printType: 'sale',
    company: {},
  });

  const tableRef = useRef(null);
  const tableHeight = useTableBodyScrollHeight(tableRef, [
    transfers.length,
    loading,
    page,
    pageSize,
    totalCount,
  ]);
  const effectiveTableHeight = tableHeight > 200 ? tableHeight : 550;

  // Load Transfers from API
  const loadTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        sku: skuSearch || undefined,
        fromCompanyId: fromCompany ? Number(fromCompany) : undefined,
        toCompanyId: toCompany ? Number(toCompany) : undefined,
        status: statusFilter || undefined,
        fromDate: fromDate ? dayjs(fromDate).format('YYYY-MM-DD') : undefined,
        toDate: toDate ? dayjs(toDate).format('YYYY-MM-DD') : undefined,
      };

      const res = await fetchCompanyTransferList(params);
      if (res?.status) {
        setTransfers(res.data || []);
        setTotalCount(res.total || 0);
      } else {
        setTransfers([]);
        setTotalCount(0);
      }
    } catch (err) {
      toastApiError(err);
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, skuSearch, fromCompany, toCompany, statusFilter, fromDate, toDate]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  const resetList = () => {
    setPage(1);
    setExpandedRowKeys([]);
  };

  const handleClearFilters = () => {
    setSkuSearch('');
    setFromCompany('');
    setToCompany('');
    setInvoiceSearch('');
    setStatusFilter('');
    setFromDate(null);
    setToDate(null);
    resetList();
  };

  const handlePaginationChange = (nextPage, nextPageSize) => {
    setPage(nextPage);
    if (nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
      setPage(1);
    }
    setExpandedRowKeys([]);
  };

  // Preview Sale Invoice
  const handlePreviewSaleInvoice = (record) => {
    const items = record.items || [];
    const invoiceRecord = {
      id: record.source_outward_id,
      invoice_no: record.source_invoice_no || `OUT-${record.source_outward_id}`,
      date: record.transfer_date,
      party_name: record.to_company_name || record.to_party || `Company #${record.to_company_id}`,
      party: record.to_party || record.to_company_name,
      final_amount: Number(record.total_amount || 0),
      products: items.map((item) => ({
        id: item.source_product_id,
        sku: item.source_sku || item.sku,
        shape: item.shape || '',
        color: item.color || '',
        clarity: item.clarity || '',
        polish_pcs: item.pcs,
        polish_carat: item.carat,
        sell_price: item.price,
        sell_amount: item.amount,
      })),
    };

    setInvoiceModal({
      open: true,
      record: invoiceRecord,
      invoiceTitle: 'Sale Invoice',
      printType: 'sale',
      company: { name: record.from_company_name || currentCompanyName },
    });
  };

  // Preview Purchase Bill
  const handlePreviewPurchaseBill = (record) => {
    const items = record.items || [];
    const billRecord = {
      id: record.target_inward_id,
      invoice_no: record.target_invoice_no || `IN-${record.target_inward_id}`,
      date: record.transfer_date,
      party_name: record.from_company_name || `Company #${record.from_company_id}`,
      party: record.from_company_name,
      final_amount: Number(record.total_amount || 0),
      products: items.map((item) => ({
        id: item.target_product_id,
        sku: item.sku,
        shape: item.shape || '',
        color: item.color || '',
        clarity: item.clarity || '',
        polish_pcs: item.pcs,
        polish_carat: item.carat,
        purchase_price: item.price,
        purchase_amount: item.amount,
      })),
    };

    setInvoiceModal({
      open: true,
      record: billRecord,
      invoiceTitle: 'Purchase Bill',
      printType: 'purchase',
      company: { name: record.to_company_name || 'Target Company' },
    });
  };

  // Execute Sale Return
  const handleExecuteSaleReturn = async (record) => {
    setReturnSubmittingId(record.id);
    try {
      const res = await executeTransferSaleReturn({
        transfer_id: record.id,
        return_notes: 'Returned via Inter-Company Stone Transfer',
      });

      if (res?.status) {
        toastSuccess(
          res.message ||
          `Sale return processed successfully. Stock returned to ${record.from_company_name || 'source company'}.`
        );
        loadTransfers();
      } else {
        toastError(res?.message || 'Failed to process sale return.');
      }
    } catch (err) {
      toastApiError(err);
    } finally {
      setReturnSubmittingId(null);
    }
  };

  // Page statistics for footer stats bar
  const pageStats = useMemo(() => {
    return transfers.reduce(
      (acc, t) => {
        acc.pcs += Number(t.total_pcs || 0);
        acc.carats += Number(t.total_carat || 0);
        acc.amount += Number(t.total_amount || 0);
        return acc;
      },
      { pcs: 0, carats: 0, amount: 0 }
    );
  }, [transfers]);

  // Nested row render (identical to In-Memo / Purchase expanded rows)
  const expandedRowRender = (record) => {
    const items = record.items || [];
    const childTotals = items.reduce(
      (acc, p) => ({
        pcs: acc.pcs + Number(p.pcs || 0),
        carats: acc.carats + Number(p.carat || 0),
        amount: acc.amount + Number(p.amount || 0),
      }),
      { pcs: 0, carats: 0, amount: 0 }
    );
    childTotals.price = childTotals.carats > 0 ? childTotals.amount / childTotals.carats : 0;

    return (
      <div className={styles.expandedBlock}>
        <div className={styles.innerTableWrap}>
          <Table
            columns={childColumns}
            dataSource={items}
            rowKey="id"
            pagination={false}
            size="middle"
            bordered
            tableLayout="fixed"
            className={styles.innerTable}
            style={{ minWidth: 1200 }}
            summary={() => {
              if (!items.length) return null;
              return (
                <Table.Summary fixed>
                  <Table.Summary.Row className={styles.childSummaryRow}>
                    <Table.Summary.Cell index={0} align="left">
                      <Text strong>Total</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="left">—</Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="left">—</Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="center">—</Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="center">—</Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="center">—</Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="center">—</Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="center">—</Table.Summary.Cell>
                    <Table.Summary.Cell index={8} align="center">
                      <Text strong>{childTotals.pcs.toLocaleString()}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={9} align="right">
                      <Text strong>{childTotals.carats.toFixed(2)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={10} align="right">
                      <Text strong>
                        {childTotals.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={11} align="right">
                      <Text strong>
                        ${childTotals.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={12} align="center">—</Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              );
            }}
          />
        </div>
      </div>
    );
  };

  // Main columns (styled exactly like TransactionStockTemplate)
  const mainColumns = useMemo(
    () => [
      {
        title: 'Transfer No',
        dataIndex: 'transfer_no',
        key: 'transfer_no',
        width: 90,
        render: (val) => <Text strong>#{val}</Text>,
      },
      {
        title: 'Company',
        key: 'company',
        width: 160,
        ellipsis: true,
        render: (_, r) => {
          const compName = r.from_company_name || `Company #${r.from_company_id}`;
          return (
            <Tag color="blue" style={{ fontWeight: 600 }}>
              {compName}
            </Tag>
          );
        },
      },
      {
        title: 'Type',
        key: 'type',
        width: 105,
        render: () => (
          <Tag color="cyan" style={{ textTransform: 'uppercase', fontWeight: 600 }}>
            TRANSFER
          </Tag>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 110,
        render: (status) => (
          <Tag
            color={status === 'transferred' ? 'success' : 'purple'}
            style={{ textTransform: 'uppercase', fontWeight: 600 }}
          >
            {status || 'transferred'}
          </Tag>
        ),
      },
      {
        title: 'From Company',
        key: 'from_company',
        width: 170,
        ellipsis: true,
        render: (_, r) => (
          <span style={{ fontWeight: 500 }}>
            {r.from_company_name || `Company #${r.from_company_id}`}
          </span>
        ),
      },
      {
        title: 'To Company',
        key: 'to_company',
        width: 170,
        ellipsis: true,
        render: (_, r) => (
          <span style={{ fontWeight: 500 }}>
            {r.to_company_name || `Company #${r.to_company_id}`}
          </span>
        ),
      },
      {
        title: 'Date',
        dataIndex: 'transfer_date',
        key: 'transfer_date',
        width: 85,
        render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : v || '—'),
      },
      {
        title: 'Stones',
        key: 'stoneCount',
        width: 60,
        align: 'center',
        render: (_, record) => (record.items || []).length,
      },
      {
        title: 'Pcs',
        dataIndex: 'total_pcs',
        key: 'total_pcs',
        width: 40,
        align: 'center',
        render: (v) => Number(v || 0).toLocaleString(),
      },
      {
        title: 'Carat',
        dataIndex: 'total_carat',
        key: 'total_carat',
        width: 55,
        align: 'center',
        render: (v) => Number(v || 0).toFixed(2),
      },
      {
        title: 'Amount',
        dataIndex: 'total_amount',
        key: 'total_amount',
        width: 120,
        align: 'right',
        render: (val) => (
          <Text strong style={{ color: cssVar('color-error') }}>
            ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        ),
      },
      {
        title: 'Operations',
        key: 'operations',
        width: 250,
        align: 'center',
        fixed: 'right',
        render: (_, record) => {
          const isTransferred = record.status === 'transferred';
          const isReturning = returnSubmittingId === record.id;

          return (
            <div className={styles.actionButtons}>
              {/* Sale Return button matching .actionReturn style */}
              <Popconfirm
                title="Process Sale Return?"
                description={
                  <span>
                    Stock will be returned from <b>{record.to_company_name}</b> back to{' '}
                    <b>{record.from_company_name}</b>. Continue?
                  </span>
                }
                okText="Yes, Return"
                cancelText="Cancel"
                okButtonProps={{ danger: true, loading: isReturning }}
                disabled={!isTransferred || isReturning}
                onConfirm={() => handleExecuteSaleReturn(record)}
              >
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionReturn} ${!isTransferred || isReturning ? styles.actionDisabled : ''
                    }`}
                  disabled={!isTransferred || isReturning}
                  title={!isTransferred ? 'Stock already returned' : 'Return stock back to source company'}
                >
                  <RollbackOutlined />
                  Sale Return
                </button>
              </Popconfirm>

              {/* Print Sale Invoice */}
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionSale}`}
                onClick={() => handlePreviewSaleInvoice(record)}
                title="View / Print Sale Invoice"
              >
                <PrinterOutlined />
                Sale Inv
              </button>

              {/* Print Purchase Bill */}
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionPurchase}`}
                onClick={() => handlePreviewPurchaseBill(record)}
                title="View / Print Purchase Bill"
              >
                <PrinterOutlined />
                Pur Bill
              </button>
            </div>
          );
        },
      },
    ],
    [returnSubmittingId]
  );

  const {
    columns: skeletonAwareColumns,
    dataSource: skeletonAwareTransfers,
    tableLoading,
    showSkeleton,
  } = useTableSkeleton({
    columns: mainColumns,
    dataSource: transfers,
    loading,
    rowCount: 8,
    rowKey: '_skeletonKey',
  });

  return (
    <div className={styles.outwardContainer}>
      {/* Exact AdvancedFilterPanel matching In-Memo / Purchase Stock */}
      <AdvancedFilterPanel
        title="Transfer History"
        activeCount={
          [skuSearch, fromCompany, toCompany, invoiceSearch, statusFilter, fromDate, toDate].filter(
            Boolean
          ).length
        }
        onClear={handleClearFilters}
        clearDisabled={
          !skuSearch &&
          !fromCompany &&
          !toCompany &&
          !invoiceSearch &&
          !statusFilter &&
          !fromDate &&
          !toDate
        }
        showSearch={false}
        extraActions={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/inventory/my-inventory')}
            >
              New Transfer
            </Button>

            <Button
              type="primary"
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={loadTransfers}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        <FilterField>
          <Input
            className={filterPanelStyles.filterControl}
            value={skuSearch}
            onChange={(e) => {
              setSkuSearch(e.target.value);
              resetList();
            }}
            onPressEnter={loadTransfers}
            placeholder="Enter Stone / SKU"
            allowClear
          />
        </FilterField>

        <FilterField>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="All From Company"
            className={filterPanelStyles.filterControl}
            value={fromCompany || undefined}
            onChange={(v) => {
              setFromCompany(v || '');
              resetList();
            }}
            options={branchCompanies}
            style={{ minWidth: 150, borderRadius: 8 }}
          />
        </FilterField>

        <FilterField>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="All To Company"
            className={filterPanelStyles.filterControl}
            value={toCompany || undefined}
            onChange={(v) => {
              setToCompany(v || '');
              resetList();
            }}
            options={branchCompanies}
            style={{ minWidth: 150, borderRadius: 8 }}
          />
        </FilterField>

        <FilterField>
          <Input
            className={filterPanelStyles.filterControl}
            value={invoiceSearch}
            onChange={(e) => {
              setInvoiceSearch(e.target.value);
              resetList();
            }}
            onPressEnter={loadTransfers}
            placeholder="Transfer / Invoice No"
            borderRadius="8px"
            allowClear
          />
        </FilterField>

        <FilterField>
          <Select
            allowClear
            placeholder="All Status"
            className={filterPanelStyles.filterControl}
            value={statusFilter || undefined}
            onChange={(v) => {
              setStatusFilter(v || '');
              resetList();
            }}
            options={[
              { label: 'Transferred', value: 'transferred' },
              { label: 'Returned', value: 'returned' },
            ]}
            style={{ minWidth: 130, borderRadius: 8 }}
          />
        </FilterField>

        <FilterField>
          <DatePicker
            allowClear
            format="DD-MM-YYYY"
            placeholder="From Date"
            className={filterPanelStyles.filterControl}
            value={fromDate}
            onChange={(v) => {
              setFromDate(v);
              resetList();
            }}
            style={{ width: '100%', minWidth: 130 }}
          />
        </FilterField>

        <FilterField>
          <DatePicker
            allowClear
            format="DD-MM-YYYY"
            placeholder="To Date"
            className={filterPanelStyles.filterControl}
            value={toDate}
            onChange={(v) => {
              setToDate(v);
              resetList();
            }}
            style={{ width: '100%', minWidth: 130 }}
          />
        </FilterField>
      </AdvancedFilterPanel>

      {/* Main Table Card Container (identical to In-Memo / Purchase) */}
      <Card variant="none" className={styles.cardContainer}>
        <div
          ref={tableRef}
          className={`erp-table-container ${styles.fixedHeightTable}`}
          style={{
            ['--table-scroll-y']: `${effectiveTableHeight}px`,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
          }}
        >
          <Table
            columns={skeletonAwareColumns}
            dataSource={skeletonAwareTransfers}
            rowKey={showSkeleton ? '_skeletonKey' : 'id'}
            loading={tableLoading}
            className={styles.tableWrapper}
            size="small"
            bordered
            tableLayout="fixed"
            scroll={{ x: 1720, y: effectiveTableHeight }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No transfer records found. Adjust filters or perform a new transfer from Inventory."
                />
              ),
            }}
            expandable={
              showSkeleton
                ? undefined
                : {
                  expandedRowRender,
                  expandedRowClassName: () => styles.expandedRow,
                  expandedRowKeys,
                  onExpandedRowsChange: setExpandedRowKeys,
                }
            }
            pagination={
              showSkeleton
                ? false
                : {
                  current: page,
                  pageSize,
                  total: totalCount,
                  showSizeChanger: true,
                  pageSizeOptions: PAGE_SIZE_OPTIONS,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} entries`,
                  onChange: handlePaginationChange,
                  position: ['bottomCenter'],
                  hideOnSinglePage: totalCount <= PAGE_SIZE_DEFAULT,
                }
            }
            footer={() => (
              <div className={styles.statsBarFooter}>
                <div className={styles.statsBar}>
                  <div className={styles.legendGroup}>
                    <Text strong>
                      {`Showing page ${page} · ${transfers.length} ${transfers.length === 1 ? 'entry' : 'entries'
                        }`}
                    </Text>
                    <Text
                      type="secondary"
                      className={styles.totalStoneLabel}
                      style={{ marginLeft: 12 }}
                    >
                      Total Transfers:{' '}
                      <span className={styles.totalStoneValue}>{totalCount.toLocaleString()}</span>
                    </Text>
                  </div>
                  <div className={styles.totalsGroup}>
                    <div className={styles.statItem}>
                      <label>Page Pcs</label>
                      <span>{pageStats.pcs.toLocaleString()}</span>
                    </div>
                    <div className={styles.statItem}>
                      <label>Page Carats</label>
                      <span>{pageStats.carats.toFixed(2)}</span>
                    </div>
                    <div className={styles.statItem}>
                      <label>Page Amount</label>
                      <span style={{ color: cssVar('color-error') }}>
                        $
                        {pageStats.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          />
        </div>
      </Card>

      {/* Authentic Transaction Invoice Preview Modal */}
      <TransactionInvoicePreviewModal
        open={invoiceModal.open}
        onClose={() => setInvoiceModal((p) => ({ ...p, open: false, record: null }))}
        record={invoiceModal.record}
        invoiceTitle={invoiceModal.invoiceTitle}
        printType={invoiceModal.printType}
        company={invoiceModal.company}
      />
    </div>
  );
};

export default CompanyTransferList;
