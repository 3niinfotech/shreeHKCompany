import { theme as antdThemeAlgo } from "antd";
import { resolveTheme, type ThemeMode, type ViewMode } from "./theme";

export function getAntdThemeConfig(mode: ThemeMode, viewMode: ViewMode = "web") {
  const t = resolveTheme(mode, viewMode);

  return {
    algorithm:
      mode === "dark"
        ? antdThemeAlgo.darkAlgorithm
        : antdThemeAlgo.defaultAlgorithm,
    token: {
      colorPrimary: t.colorPrimary,
      colorPrimaryHover: t.colorPrimaryDark,
      colorSuccess: t.colorSuccess,
      colorWarning: t.colorWarning,
      colorError: t.colorError,
      colorInfo: t.colorInfo,
      colorText: t.colorTextHeading,
      colorTextSecondary: t.colorTextMuted,
      colorBgContainer: t.colorBgCard,
      colorBgLayout: t.colorBgPage,
      colorBorder: t.colorBorder,
      borderRadius: parseInt(t.radiusControl, 10),
      borderRadiusLG: parseInt(t.radiusCard, 10),
      fontFamily: t.fontFamilyBase,
      fontSize: parseFloat(t.fontSizeMd) * 16,
    },
    components: {
      Button: {
        borderRadius: parseInt(t.radiusControl, 10),
        colorPrimary: t.colorBtnPrimaryBg,
        colorPrimaryHover: t.colorBtnPrimaryHover,
        defaultColor: t.colorBtnSecondaryText,
        colorError: t.colorBtnDangerBg,
        colorErrorHover: t.colorBtnDangerHover,
        colorErrorActive: t.colorErrorDark,
        dangerColor: t.colorBtnDangerText,
      },
      Card: {
        borderRadiusLG: parseInt(t.radiusCard, 10),
      },
      Input: {
        borderRadius: parseInt(t.radiusControl, 10),
        activeBorderColor: t.colorInputFocusBorder,
        hoverBorderColor: t.colorInputFocusBorder,
        colorBgContainer: t.colorInputBg,
        colorBorder: t.colorInputBorder,
      },
      Select: {
        borderRadius: parseInt(t.radiusControl, 10),
        colorBgContainer: t.colorSelectBg,
      },
      Modal: {
        borderRadiusLG: parseInt(t.radiusCard, 10),
        contentBg: t.colorModalBg,
        headerBg: t.colorModalBg,
      },
      Pagination: {
        borderRadius: parseInt(t.radiusControl, 10),
        itemActiveBg: t.colorBtnPrimaryBg,
      },
      Menu: {
        itemSelectedColor: t.colorNavActive,
        itemHoverColor: t.colorNavActive,
        horizontalItemSelectedColor: t.colorNavActive,
        horizontalItemHoverColor: t.colorNavActive,
      },
      Table: {
        headerBg: t.colorTableHeaderBg,
        headerColor: t.colorTableHeaderText,
        rowHoverBg: t.colorTableRowHover,
        borderColor: t.colorTableBorder,
      },
      Layout: {
        siderBg: t.colorSidebarBg,
        triggerBg: t.colorSidebarFooterBg,
        triggerColor: t.colorTextMuted,
      },
      Notification: {
        borderRadiusLG: parseInt(t.radiusCard, 10),
        colorBgElevated: t.colorBgCard,
      },
      Message: {
        contentBg: t.colorBgCard,
        colorText: t.colorTextHeading,
      },
    },
  };
}

/** Dashboard sidebar menu — extra Ant Design Menu token overrides */
export function getDashboardMenuTheme(mode: ThemeMode) {
  const t = resolveTheme(mode, "dashboard");
  const isDark = mode === "dark";

  return {
    components: {
      Menu: isDark
        ? {
            itemColor: t.colorTextOnPrimary,
            itemSelectedColor: t.colorSidebarAccent,
            itemHoverColor: t.colorSidebarAccent,
            subMenuItemSelectedColor: t.colorSidebarAccent,
            itemActiveBg: t.colorSidebarActiveBg,
            itemSelectedBg: t.colorSidebarActiveBg,
            itemHoverBg: t.colorSidebarHoverBg,
            subMenuItemBg: t.colorSidebarFooterBg,
            groupTitleColor: t.colorTextMuted,
            popupBg: t.colorPopoverBg,
            darkItemBg: t.colorSidebarBg,
            darkSubMenuItemBg: t.colorPopoverBg,
          }
        : {
            itemColor: t.colorTextMuted,
            itemSelectedColor: t.colorSidebarAccent,
            itemHoverColor: t.colorSidebarAccent,
            subMenuItemSelectedColor: t.colorSidebarAccent,
            itemActiveBg: t.colorSidebarActiveBg,
            itemSelectedBg: t.colorSidebarActiveBg,
            itemHoverBg: t.colorSidebarHoverBg,
            subMenuItemBg: t.colorSidebarBg,
            groupTitleColor: t.colorTextMuted,
            popupBg: t.colorBgCard,
          },
      Layout: {
        siderBg: t.colorSidebarBg,
        triggerBg: t.colorSidebarFooterBg,
        triggerColor: t.colorTextMuted,
      },
    },
  };
}
