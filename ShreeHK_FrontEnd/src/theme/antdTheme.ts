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
      colorTextDisabled: t.colorTextHeading,
      colorBgContainer: t.colorBgCard,
      colorBgContainerDisabled: t.colorBgMuted,
      colorBgLayout: t.colorBgPage,
      colorBorder: t.colorBorder,
      // Border-only focus (no glow/shadow) — same as Input/Date project-wide
      controlOutline: "transparent",
      controlOutlineWidth: 0,
      borderRadius: parseInt(t.radiusControl, 10),
      borderRadiusLG: parseInt(t.radiusCard, 10),
      fontFamily: t.fontFamilyBase,
      fontSize: parseFloat(t.fontSizeMd) * 16,
    },
    components: {
      Button: {
        controlHeight: 32,
        controlHeightSM: 32,
        controlHeightLG: 40,
        paddingInline: 10,
        paddingInlineSM: 8,
        paddingInlineLG: 14,
        fontSize: 12,
        fontWeight: 600,
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
        activeShadow: "none",
        colorBgContainer: t.colorInputBg,
        colorBorder: t.colorInputBorder,
      },
      InputNumber: {
        borderRadius: parseInt(t.radiusControl, 10),
        activeBorderColor: t.colorInputFocusBorder,
        hoverBorderColor: t.colorInputFocusBorder,
        activeShadow: "none",
        colorBgContainer: t.colorInputBg,
        colorBgContainerDisabled: t.colorBgMuted,
        colorTextDisabled: t.colorTextHeading,
        colorBorder: t.colorInputBorder,
        // Hide +/- spin controls on hover/focus (project-wide)
        handleVisible: false,
        handleWidth: 0,
      },
      DatePicker: {
        borderRadius: parseInt(t.radiusControl, 10),
        activeBorderColor: t.colorInputFocusBorder,
        hoverBorderColor: t.colorInputFocusBorder,
        activeShadow: "none",
        colorBgContainer: t.colorInputBg,
        colorBgContainerDisabled: t.colorBgMuted,
        colorTextDisabled: t.colorTextHeading,
        colorBorder: t.colorInputBorder,
      },
      Select: {
        borderRadius: parseInt(t.radiusControl, 10),
        activeBorderColor: t.colorInputFocusBorder,
        hoverBorderColor: t.colorInputFocusBorder,
        activeOutlineColor: "transparent",
        colorBgContainer: t.colorSelectBg,
        colorBgContainerDisabled: t.colorBgMuted,
        colorTextDisabled: t.colorTextHeading,
      },
      Cascader: {
        borderRadius: parseInt(t.radiusControl, 10),
        colorBgContainer: t.colorSelectBg,
      },
      TreeSelect: {
        borderRadius: parseInt(t.radiusControl, 10),
        colorBgContainer: t.colorSelectBg,
      },
      Mentions: {
        borderRadius: parseInt(t.radiusControl, 10),
        activeBorderColor: t.colorInputFocusBorder,
        hoverBorderColor: t.colorInputFocusBorder,
        activeShadow: "none",
        colorBgContainer: t.colorInputBg,
        colorBorder: t.colorInputBorder,
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
      Tag: {
        borderRadiusSM: 3,
        fontSize: 11,
        lineHeight: 1.4,
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
