import React from 'react';
import styles from '../../assets/scss/pages/transaction/stoneupdate.module.scss';

const Toggle = ({ label, checked, onChange, id }) => {
  return (
    <div className={styles.toggleWrapper}>
      {label && <span className={styles.toggleLabel}>{label}</span>}
      <label className={styles.switch}>
        <input 
          type="checkbox" 
          id={id}
          checked={checked} 
          onChange={(e) => onChange && onChange(e.target.checked)} 
        />
        <span className={`${styles.slider} ${styles.round}`}></span>
      </label>
    </div>
  );
};

export default Toggle;