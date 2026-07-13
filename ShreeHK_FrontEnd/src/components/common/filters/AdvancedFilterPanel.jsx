import React from 'react';
import { Button, Typography } from 'antd';
import { FilterOutlined, SearchOutlined } from '@ant-design/icons';
import styles from '../../../assets/scss/components/advancedFilterPanel.module.scss';

const { Title, Text } = Typography;

export const FilterField = ({ label, icon, children, className = '' }) => (
    <div className={`${styles.filterField} ${className}`.trim()}>
        {label ? (
            <label className={styles.fieldLabel}>
                {icon}
                <span>{label}</span>
            </label>
        ) : null}
        {children}
    </div>
);

export const FilterActions = ({ children, className = '' }) => (
    <div className={`${styles.filterActions} ${className}`.trim()}>{children}</div>
);

const AdvancedFilterPanel = ({
    title = 'Filters',
    subtitle,
    activeCount = 0,
    icon = <FilterOutlined />,
    children,
    onClear,
    onSearch,
    searchLoading = false,
    clearDisabled = false,
    showClear = true,
    showSearch = true,
    searchLabel = 'Search',
    clearLabel = 'Clear',
    extraActions = null,
    className = '',
    bodyClassName = '',
}) => (
    <section className={`${styles.filterPanel} ${className}`.trim()}>
        <div className={styles.filterPanelHead}>
            <div className={styles.filterPanelTitle}>
                <span className={styles.filterPanelIcon}>{icon}</span>
                <div>
                    <Title level={5} className={styles.filterTitle}>{title}</Title>
                    {subtitle ? <Text type="secondary" className={styles.filterSub}>{subtitle}</Text> : null}
                </div>
            </div>
            {activeCount > 0 ? (
                <span className={styles.activeBadge}>{activeCount} active</span>
            ) : null}
        </div>

        <div className={`${styles.filterGrid} ${bodyClassName}`.trim()}>
            <div className={styles.filterFieldsRow}>
                {children}
            </div>
            {(showClear || showSearch || extraActions) && (
                <FilterActions>
                    {extraActions}
                    {showClear && onClear ? (
                        <Button
                            onClick={onClear}
                            className={styles.btnClear}
                            disabled={clearDisabled}
                        >
                            {clearLabel}
                        </Button>
                    ) : null}
                    {showSearch && onSearch ? (
                        <Button
                            type="primary"
                            icon={<SearchOutlined />}
                            loading={searchLoading}
                            onClick={onSearch}
                            className={styles.btnSearch}
                        >
                            {searchLabel}
                        </Button>
                    ) : null}
                </FilterActions>
            )}
        </div>
    </section>
);

export { styles as filterPanelStyles };
export default AdvancedFilterPanel;
