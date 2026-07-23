import { Gem } from "lucide-react";
import styles from "../../assets/scss/loader.module.scss";

const Loader = ({ text = "Loading" }) => {
  return (
    <div
      className={styles.overlay}
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <div className={styles.content}>
        <div className={styles.logoStage} aria-hidden="true">
          <span className={styles.glowAura} />
          <span className={styles.orbitRing} />
          <span className={styles.sparkRing} />
          <span className={styles.logoIcon}>
            <Gem className={styles.logoGem} size={28} strokeWidth={2.2} />
          </span>
        </div>

        <span className={styles.brandMark}>Smart DIA</span>

        <div className={styles.track}>
          <div className={styles.beam} />
        </div>
      </div>
    </div>
  );
};

export default Loader;
