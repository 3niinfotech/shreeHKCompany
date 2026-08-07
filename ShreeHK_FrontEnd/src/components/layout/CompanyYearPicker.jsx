import React, { useEffect, useState } from "react";
import { Modal, Typography, Spin, Empty } from "antd";
import {
  CalendarOutlined,
  BankOutlined,
  RightOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";
import useAuthStore from "../../store/Auth.Store";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { toastApiSuccess, toastApiError } from "../../utils/apiToast";
import styles from "../../assets/scss/pages/admin/companyYearPicker.module.scss";

const { Text, Title } = Typography;

const CompanyYearPicker = ({ open, onClose, force = false }) => {
  const [loading, setLoading] = useState(false);
  const [selectingKey, setSelectingKey] = useState(null);
  const [options, setOptions] = useState([]);
  const setSessionContext = useAuthStore((s) => s.setSessionContext);
  const setShowContextPicker = useAuthStore((s) => s.setShowContextPicker);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyOptions, setCompanyOptions] = useState([]);
  const yearOptions = selectedCompany
    ? options.filter(
      (x) => x.companyId === selectedCompany.companyId
    )
    : [];
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get(ENDPOINTS.portal.companyYears)
      .then((res) => {
        const rows = res.data?.Data || [];

        setOptions(rows);

        const companies = [];
        const seen = new Set();

        rows.forEach((item) => {
          if (!seen.has(item.companyId)) {
            seen.add(item.companyId);

            companies.push({
              companyId: item.companyId,
              companyName: item.companyName,
            });
          }
        });

        setCompanyOptions(companies);
        // const seen = new Set();
        // const rows = rowsRaw.filter((item) => {
        //   const key = `${String(item.companyName || "").trim().toLowerCase()}::${String(item.yearLabel || "").trim().toLowerCase()}`;
        //   if (!key || seen.has(key)) return false;
        //   seen.add(key);
        //   return true;
        // });
        // setOptions(rows);

        if (rows.length === 0) {
          toastApiError({ response: { data: res.data } });
          setShowContextPicker(false);
          onClose?.();
        } else if (rows.length === 1) {
          selectContext(rows[0]);
        }
      })
      .catch((err) => toastApiError(err))
      .finally(() => setLoading(false));
  }, [open, onClose, setShowContextPicker]);

  const handleCompanySelect = (company) => {
    const years = options.filter(
      (x) => x.companyId === company.companyId
    );

    if (years.length === 1) {
      selectContext(years[0]);
      return;
    }

    setSelectedCompany(company);
  };

  const selectContext = async (item) => {
    const itemKey = `${item.companyId}-${item.yearId}`;
    if (selectingKey) return;

    setSelectingKey(itemKey);
    try {
      const res = await api.post(ENDPOINTS.session.context, {
        companyId: item.companyId,
        yearId: item.yearId,
      });
      const { token: newToken, Data } = res.data || {};
      if (newToken) {
        login(user, newToken, {
          companyId: Data.companyId,
          yearId: Data.yearId,
          companyName: Data.companyName,
          companyShortcutName: Data.companyShortcutName,
          dbName: Data.dbName,
        });
      } else {
        setSessionContext({
          companyId: Data.companyId,
          yearId: Data.yearId,
          companyName: Data.companyName,
          companyShortcutName: Data.companyShortcutName,
          dbName: Data.dbName,
        });
      }
      toastApiSuccess(res.data);
      setShowContextPicker(false);
      onClose?.();
      // window.location.reload();
      return;
    } catch (err) {
      toastApiError(err);
    } finally {
      setSelectingKey(null);
    }
  };

  useEffect(() => {
    if (open) {
      setSelectedCompany(null);
    }
  }, [open]);

  const modalTitle = (
    <div className={styles.modalTitle}>
      <div className={styles.titleIcon}>
        <SwapOutlined />
      </div>
      <div>
        {/* <div className={styles.titleText}>Select Company & Year</div> */}
        <div className={styles.titleText}>
          {selectedCompany ? "Select Financial Year" : "Select Company"}
        </div>
        {/* <Text className={styles.titleSubtext}>
          Choose a workspace to continue. You can switch context anytime from the header.
        </Text> */}
        <Text className={styles.titleSubtext}>
          {selectedCompany
            ? `Company : ${selectedCompany.companyName}`
            : "Choose your company to continue"}
        </Text>
      </div>
    </div>
  );

  return (
    <Modal
      title={modalTitle}
      open={open}
      onCancel={force ? undefined : onClose}
      footer={null}
      closable={!force}
      maskClosable={!force}
      centered
      className={styles.companyYearModal}
      width="min(1080px, calc(100vw - 32px))"
      destroyOnClose
    >
      {loading ? (
        <div className={styles.loaderWrap}>
          <Spin size="large" />
          <Text type="secondary">Loading available contexts...</Text>
        </div>
      ) : options.length === 0 ? (
        <Empty description="No company/year mapping found" className={styles.emptyState} />
      ) : (
        <>
          {/* <div className={styles.resultMeta}>
            <Text type="secondary">{options.length} context{options.length === 1 ? "" : "s"} available</Text>
          </div> */}
          {/* <div className={styles.cardGrid}>
            {options.map((item, idx) => {
              const itemKey = `${item.companyId}-${item.yearId}-${idx}`;
              const isSelecting = selectingKey === `${item.companyId}-${item.yearId}`;

              return (
                <button
                  key={itemKey}
                  type="button"
                  className={`${styles.contextCard} ${isSelecting ? styles.contextCardSelecting : ""}`}
                  onClick={() => selectContext(item)}
                  disabled={Boolean(selectingKey)}
                  aria-label={`Select ${item.companyName}, fiscal year ${item.yearLabel}`}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.cardHeadIcon}>
                      <BankOutlined />
                    </span>
                    <span className={styles.cardArrow}>
                      {isSelecting ? <Spin size="small" /> : <RightOutlined />}
                    </span>
                  </div>

                  <Title level={5} className={styles.companyName} title={item.companyName}>
                    {item.companyName}
                  </Title>

                  <span className={styles.yearTag}>
                    <CalendarOutlined />
                    <span>{item.yearLabel}</span>
                  </span>
                </button>
              );
            })}
          </div> */}
          {selectedCompany && (
            <div className={styles.backWrapper}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => setSelectedCompany(null)}
              >
                <ArrowLeftOutlined />
                <span>Back to Companies</span>
              </button>
            </div>
          )}
          <div className={styles.cardGrid}>
            {!selectedCompany &&
              companyOptions.map((item) => {
                return (
                  <button
                    key={item.companyId}
                    type="button"
                    className={styles.contextCard}
                    onClick={() => handleCompanySelect(item)}
                  >
                    <div className={styles.cardTop}>
                      <span className={styles.cardHeadIcon}>
                        <BankOutlined />
                      </span>
                      <span className={styles.cardArrow}>
                        <RightOutlined />
                      </span>
                    </div>
                    <Title
                      level={5}
                      className={styles.companyName}
                    >
                      {item.companyName}
                    </Title>
                  </button>
                )
              })
            }
            {selectedCompany &&
              yearOptions.map((item) => {
                const isSelecting =
                  selectingKey === `${item.companyId}-${item.yearId}`;
                return (
                  <button
                    key={item.yearId}
                    type="button"
                    disabled={Boolean(selectingKey)}
                    className={`${styles.contextCard} ${isSelecting
                      ? styles.contextCardSelecting
                      : ""
                      }`}
                    onClick={() => selectContext(item)}
                  >
                    <div className={styles.cardTop}>
                      <span className={styles.cardHeadIcon}>
                        <CalendarOutlined />
                      </span>
                      <span className={styles.cardArrow}>
                        {isSelecting
                          ? <Spin size="small" />
                          : <RightOutlined />
                        }
                      </span>
                    </div>
                    <Title
                      level={5}
                      className={styles.companyName}
                    >
                      {item.yearLabel}
                    </Title>
                  </button>
                )
              })
            }
          </div>
        </>
      )}
    </Modal>
  );
};

export default CompanyYearPicker;
