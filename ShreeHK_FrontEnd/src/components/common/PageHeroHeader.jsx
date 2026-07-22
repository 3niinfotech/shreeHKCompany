import React from 'react';
import { FileTextOutlined } from '@ant-design/icons';
import styles from '../../assets/scss/components/pageHeroHeader.module.scss';

const PageHeroHeader = ({
    breadcrumb,
    title,
    subtitle,
    icon,
    actions,
    className,
    as = 'header',
}) => {
    const Tag = as;

    return (
        <Tag className={[styles.hero, className].filter(Boolean).join(' ')}>
            <div className={styles.heroMain}>
                <span className={styles.heroIcon}>{icon ?? <FileTextOutlined />}</span>
                <div className={styles.heroText}>
                    {/* {breadcrumb ? <span className={styles.breadcrumbText}>{breadcrumb}</span> : null} */}
                    <h4 className={styles.pageTitle}>{title}</h4>
                    {subtitle ? <p className={styles.pagesubtitle}>{subtitle}</p> : null}
                </div>
            </div>
            {actions ? <div className={styles.heroActions}>{actions}</div> : null}
        </Tag>
    );
};

export { styles as pageHeroHeaderStyles };
export default PageHeroHeader;
