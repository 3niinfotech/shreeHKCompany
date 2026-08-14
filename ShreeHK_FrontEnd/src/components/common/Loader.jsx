import { useEffect, useState } from "react";
import brandLogo from "../../assets/loader/icon.png";
import styles from "../../assets/scss/loader.module.scss";

/** Strip near-white pixels so the baked logo background disappears. */
function stripWhiteBackground(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "sync";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve(src);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;

      const lastRow = (canvas.height - 1) * canvas.width * 4;
      const lastCol = (canvas.width - 1) * 4;
      const cornersTransparent =
        data[3] === 0 &&
        data[lastCol + 3] === 0 &&
        data[lastRow + 3] === 0 &&
        data[lastRow + lastCol + 3] === 0;
      if (cornersTransparent) {
        resolve(src);
        return;
      }

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Broader white/near-white knockout so no square remains
        if (r >= 235 && g >= 235 && b >= 235) {
          data[i + 3] = 0;
        } else if (r >= 210 && g >= 210 && b >= 210) {
          const min = Math.min(r, g, b);
          const t = (min - 210) / 25;
          data[i + 3] = Math.max(0, Math.min(255, Math.round(255 * (1 - t))));
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

let cachedTransparentLogo = null;
let pendingTransparentLogo = null;

function getTransparentLogo() {
  if (cachedTransparentLogo) return Promise.resolve(cachedTransparentLogo);
  if (!pendingTransparentLogo) {
    pendingTransparentLogo = stripWhiteBackground(brandLogo).then((src) => {
      cachedTransparentLogo = src;
      return src;
    });
  }
  return pendingTransparentLogo;
}

// Start stripping ASAP so cache is warm before Loader mounts.
getTransparentLogo();

/**
 * Premium full-viewport route / suspense loader for Smart DIA.
 */
const Loader = ({
  text = "Loading",
  subtitle = "",
}) => {
  // Never paint the white-bg source — only the stripped transparent logo.
  const [logoSrc, setLogoSrc] = useState(() => cachedTransparentLogo);

  useEffect(() => {
    let alive = true;
    getTransparentLogo().then((src) => {
      if (alive) setLogoSrc(src);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div
      className={styles.overlay}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={text}
    >
      <div className={styles.stage}>
        <div className={styles.halo} aria-hidden="true" />

        <div className={styles.mark} aria-hidden="true">
          <svg className={styles.spinner} viewBox="0 0 100 100">
            <defs>
              <linearGradient id="sdArc" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--color-primary-medium)" />
                <stop offset="50%" stopColor="var(--color-primary)" />
                <stop offset="100%" stopColor="var(--color-primary-dark)" />
              </linearGradient>
            </defs>
            <circle className={styles.spinnerTrack} cx="50" cy="50" r="42" />
            <circle className={styles.spinnerArc} cx="50" cy="50" r="42" />
          </svg>

          <svg className={styles.spinnerInner} viewBox="0 0 100 100">
            <circle className={styles.spinnerTrackInner} cx="50" cy="50" r="34" />
            <circle className={styles.spinnerArcInner} cx="50" cy="50" r="34" />
          </svg>

          <div className={styles.logoWrap}>
            {logoSrc ? (
              <img
                className={styles.logo}
                src={logoSrc}
                alt=""
                width={48}
                height={48}
                decoding="sync"
                fetchPriority="high"
              />
            ) : null}
          </div>
        </div>

        <div className={styles.copy}>
          <div className={styles.statusRow}>
            <p className={styles.status}>{text}</p>
            <div className={styles.dots} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
      </div>
    </div>
  );
};

export default Loader;
