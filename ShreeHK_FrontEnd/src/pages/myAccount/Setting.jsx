import React from "react";
import { Row, Col, Tag, Switch, Button, Space, Tooltip } from "antd";
import {
  SettingOutlined,
  BgColorsOutlined,
  AppstoreOutlined,
  SunOutlined,
  MoonOutlined,
  CheckCircleFilled,
  LayoutOutlined,
  InfoCircleOutlined,
  SoundOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import PageHeroHeader from "../../components/common/PageHeroHeader";
import useUIStore from "../../store/Ui.Store";
import { playScanSuccessSound, playWarningSound, playErrorSound } from "../../utils/audioBeep";
import styles from "../../assets/scss/pages/settings.module.scss";

const Settings = () => {
  const isDarkMode = useUIStore((state) => state.isDarkMode);
  const setThemeMode = useUIStore((state) => state.setThemeMode);
  const viewMode = useUIStore((state) => state.viewMode);
  const setViewMode = useUIStore((state) => state.setViewMode);
  const soundEnabled = useUIStore((state) => state.soundEnabled ?? true);
  const setSoundEnabled = useUIStore((state) => state.setSoundEnabled);
  const quickScanShortcut = useUIStore((state) => state.quickScanShortcut ?? true);
  const setQuickScanShortcut = useUIStore((state) => state.setQuickScanShortcut);

  return (
    <div className="page-shell">
      <PageHeroHeader
        breadcrumb="MY ACCOUNT"
        title="Settings & Workspace Preferences"
        icon={<SettingOutlined />}
      />

      <div className={styles.settingsContainer}>
        <Row gutter={[20, 20]}>
          {/* 1. Theme / Appearance Mode Card (Left Column) */}
          <Col xs={24} lg={12}>
            <div className={styles.settingsCard}>
              <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", height: "100%" }}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIcon}>
                    <BgColorsOutlined />
                  </div>
                  <div>
                    <h3 className={styles.sectionTitle}>Appearance & Theme</h3>
                    <span className={styles.sectionSubtitle}>
                      Select your preferred color theme for optimal clarity and comfort.
                    </span>
                  </div>
                </div>

                <div className={styles.optionGrid} style={{ flex: 1 }}>
                  {/* Light Mode Card */}
                  <div
                    className={`${styles.optionCard} ${!isDarkMode ? styles.optionCardActive : ""}`}
                    onClick={() => setThemeMode("light")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setThemeMode("light");
                    }}
                  >
                    <div>
                      <div className={styles.cardHeaderRow}>
                        <div className={`${styles.cardIconWrap} ${styles.iconLight}`}>
                          <SunOutlined />
                        </div>
                        {!isDarkMode ? (
                          <Tag color="blue" icon={<CheckCircleFilled />} className={styles.activeBadge}>
                            Active
                          </Tag>
                        ) : null}
                      </div>

                      <div className={styles.cardTitle}>Light Theme</div>
                      <div className={styles.cardDesc}>
                        Crisp, clean high-contrast appearance for bright daylight environments.
                      </div>
                    </div>

                    <div className={`${styles.visualPreview} ${styles.previewLight}`}>
                      <div className={styles.previewNav} />
                      <div className={styles.previewBody} />
                    </div>
                  </div>

                  {/* Dark Mode Card */}
                  <div
                    className={`${styles.optionCard} ${isDarkMode ? styles.optionCardActive : ""}`}
                    onClick={() => setThemeMode("dark")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setThemeMode("dark");
                    }}
                  >
                    <div>
                      <div className={styles.cardHeaderRow}>
                        <div className={`${styles.cardIconWrap} ${styles.iconDark}`}>
                          <MoonOutlined />
                        </div>
                        {isDarkMode ? (
                          <Tag color="purple" icon={<CheckCircleFilled />} className={styles.activeBadge}>
                            Active
                          </Tag>
                        ) : null}
                      </div>

                      <div className={styles.cardTitle}>Dark Theme</div>
                      <div className={styles.cardDesc}>
                        Sleek dark interface designed to reduce eye strain and glare in low-light trading rooms.
                      </div>
                    </div>

                    <div className={`${styles.visualPreview} ${styles.previewDark}`}>
                      <div className={styles.previewNav} />
                      <div className={styles.previewBody} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Col>

          {/* 2. Workspace Navigation Layout Card (Right Column) */}
          <Col xs={24} lg={12}>
            <div className={styles.settingsCard}>
              <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", height: "100%" }}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionIcon}>
                    <LayoutOutlined />
                  </div>
                  <div>
                    <h3 className={styles.sectionTitle}>Workspace Layout & Navigation</h3>
                    <span className={styles.sectionSubtitle}>
                      Choose how you navigate through modules, reports, and transaction screens.
                    </span>
                  </div>
                </div>

                <div className={styles.optionGrid} style={{ flex: 1 }}>
                  {/* Web View Card */}
                  <div
                    className={`${styles.optionCard} ${viewMode === "web" ? styles.optionCardActive : ""}`}
                    onClick={() => setViewMode("web")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setViewMode("web");
                    }}
                  >
                    <div>
                      <div className={styles.cardHeaderRow}>
                        <div className={`${styles.cardIconWrap} ${styles.iconWeb}`}>
                          <AppstoreOutlined />
                        </div>
                        {viewMode === "web" ? (
                          <Tag color="blue" icon={<CheckCircleFilled />} className={styles.activeBadge}>
                            Active
                          </Tag>
                        ) : null}
                      </div>

                      <div className={styles.cardTitle}>Web Navigation (Top Bar)</div>
                      <div className={styles.cardDesc}>
                        Full-width responsive workspace with horizontal header tabs for quick module switching.
                      </div>
                    </div>

                    <div className={`${styles.visualPreview} ${styles.previewWeb}`}>
                      <div className={styles.previewNav} />
                      <div className={styles.previewBody} />
                    </div>
                  </div>

                  {/* Dashboard View Card */}
                  <div
                    className={`${styles.optionCard} ${viewMode === "dashboard" ? styles.optionCardActive : ""}`}
                    onClick={() => setViewMode("dashboard")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setViewMode("dashboard");
                    }}
                  >
                    <div>
                      <div className={styles.cardHeaderRow}>
                        <div className={`${styles.cardIconWrap} ${styles.iconDashboard}`}>
                          <LayoutOutlined />
                        </div>
                        {viewMode === "dashboard" ? (
                          <Tag color="purple" icon={<CheckCircleFilled />} className={styles.activeBadge}>
                            Active
                          </Tag>
                        ) : null}
                      </div>

                      <div className={styles.cardTitle}>Dashboard Layout (Sidebar)</div>
                      <div className={styles.cardDesc}>
                        Pinned vertical sidebar navigation for power users managing dense diamond inventory.
                      </div>
                    </div>

                    <div className={`${styles.visualPreview} ${styles.previewDashboard}`}>
                      <div className={styles.previewSidebar} />
                      <div className={styles.previewMain}>
                        <div className={styles.previewTop} />
                        <div className={styles.previewContent} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* 3. Productivity, Scanner Audio & Shortcut Preferences Card */}
        <div className={styles.settingsCard} style={{ marginTop: 20 }}>
          <div style={{ padding: "22px 24px" }}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIcon}>
                <SoundOutlined />
              </div>
              <div>
                <h3 className={styles.sectionTitle}>Scanner Audio & Productivity Preferences</h3>
                <span className={styles.sectionSubtitle}>
                  Configure real-time audio beeps for barcode scanners and rapid keyboard shortcuts.
                </span>
              </div>
            </div>

            <Row gutter={[20, 16]}>
              {/* Audio Feedback Switch */}
              <Col xs={24} md={12}>
                <div className={styles.preferenceRow}>
                  <div className={styles.preferenceMeta}>
                    <div className={styles.preferenceTitleRow}>
                      <SoundOutlined className={styles.preferenceIcon} />
                      <span className={styles.preferenceTitle}>Barcode Scanner Audio Feedback</span>
                    </div>
                    <span className={styles.preferenceDesc}>
                      Plays instant acoustic tones on barcode scan success, stone hold warnings, and error alerts.
                    </span>
                  </div>
                  <Switch
                    checked={soundEnabled}
                    onChange={setSoundEnabled}
                    checkedChildren="ON"
                    unCheckedChildren="OFF"
                  />
                </div>

                {soundEnabled ? (
                  <div style={{ marginTop: 12, paddingLeft: 4 }}>
                    <span style={{ fontSize: 11.5, color: "var(--color-text-secondary)", marginRight: 8 }}>
                      Test Audio Chimes:
                    </span>
                    <Space size={6} wrap>
                      <Button
                        size="small"
                        icon={<CheckCircleOutlined style={{ color: "#16a34a" }} />}
                        onClick={playScanSuccessSound}
                      >
                        Success Chime
                      </Button>
                      <Button
                        size="small"
                        icon={<WarningOutlined style={{ color: "#d97706" }} />}
                        onClick={playWarningSound}
                      >
                        Warning Beep
                      </Button>
                      <Button
                        size="small"
                        icon={<CloseCircleOutlined style={{ color: "#dc2626" }} />}
                        onClick={playErrorSound}
                      >
                        Error Alert
                      </Button>
                    </Space>
                  </div>
                ) : null}
              </Col>

              {/* Quick Barcode Scanner Shortcut */}
              <Col xs={24} md={12}>
                <div className={styles.preferenceRow}>
                  <div className={styles.preferenceMeta}>
                    <div className={styles.preferenceTitleRow}>
                      <ThunderboltOutlined className={styles.preferenceIcon} />
                      <span className={styles.preferenceTitle}>Quick Barcode & SKU Search Shortcut</span>
                    </div>
                    <span className={styles.preferenceDesc}>
                      Press <Tag style={{ margin: "0 2px" }}>Ctrl + K</Tag> or <Tag style={{ margin: "0 2px" }}>/</Tag> anywhere to instantly focus the diamond search bar without touching the mouse.
                    </span>
                  </div>
                  <Switch
                    checked={quickScanShortcut}
                    onChange={setQuickScanShortcut}
                    checkedChildren="ON"
                    unCheckedChildren="OFF"
                  />
                </div>
              </Col>
            </Row>
          </div>
        </div>

        {/* Bottom Notice Banner */}
        <div className={styles.infoBanner}>
          <InfoCircleOutlined style={{ color: "var(--color-primary, #1e3a8a)", fontSize: 16 }} />
          <span className={styles.infoBannerText}>
            Your visual, audio, and navigation preferences are saved in your browser session and apply instantly across all open ShreeHK ERP tabs.
          </span>
        </div>
      </div>
    </div>
  );
};

export default Settings;