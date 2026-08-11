import { Gem } from "lucide-react";
import styles from "../../assets/scss/loader.module.scss";

/**
 * Full-viewport route / suspense loader for the ERP shell.
 * Theme-aware via CSS custom properties from applyTheme().
 */
const Loader = ({
  text = "Loading",
  subtitle = "Preparing your workspace",
}) => {
  return (
    <div
      className={styles.overlay}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={text}
    >
      <div className={styles.panel}>
        <div className={styles.logoStage} aria-hidden="true">
          <span className={styles.glowAura} />
          <span className={styles.orbitRing} />
          <span className={styles.orbitDot} />
          <span className={styles.logoIcon}>
            <Gem className={styles.logoGem} size={26} strokeWidth={2.1} />
          </span>
        </div>

        <div className={styles.copy}>
          <span className={styles.brandMark}>Smart DIA</span>
          <span className={styles.statusText}>{text}</span>
          {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
        </div>

        <div className={styles.track} aria-hidden="true">
          <div className={styles.beam} />
        </div>

        <div className={styles.pulseDots} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
};

export default Loader;
