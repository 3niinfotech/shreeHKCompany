import styles from "../../assets/scss/layout/footer.module.scss";

const Footer = () => {
  return (
    <footer className={styles.footerStyle}>
      <div className={styles.appFooter}>
        © {new Date().getFullYear()} ERP System. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;