import styles from "../../assets/scss/layout/footer.module.scss";

const Footer = () => {
  return (
    <footer className={styles.footerStyle}>
      <div className={styles.appFooter}>
        © {new Date().getFullYear()}  Smart DIA. All rights reserved. Developed by 3ni Infotech.
      </div>
    </footer>
  );
};

export default Footer;