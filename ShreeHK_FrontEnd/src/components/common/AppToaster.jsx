import { Toaster } from "sonner";
import {
  CircleCheck,
  CircleX,
  Info,
  TriangleAlert,
  Loader2,
  X,
} from "lucide-react";
import useUIStore from "../../store/Ui.Store";

const iconSize = 18;
const iconStroke = 2.25;

const toastIcons = {
  success: (
    <CircleCheck size={iconSize} strokeWidth={iconStroke} aria-hidden />
  ),
  error: <CircleX size={iconSize} strokeWidth={iconStroke} aria-hidden />,
  info: <Info size={iconSize} strokeWidth={iconStroke} aria-hidden />,
  warning: (
    <TriangleAlert size={iconSize} strokeWidth={iconStroke} aria-hidden />
  ),
  loading: (
    <Loader2
      size={iconSize}
      strokeWidth={iconStroke}
      className="shreehk-toast__spinner"
      aria-hidden
    />
  ),
  close: <X size={14} strokeWidth={2.5} aria-hidden />,
};

const toastClassNames = {
  toast: "shreehk-toast",
  title: "shreehk-toast__title",
  description: "shreehk-toast__description",
  closeButton: "shreehk-toast__close",
  icon: "shreehk-toast__icon",
  actionButton: "shreehk-toast__action",
  cancelButton: "shreehk-toast__cancel",
};

/**
 * Global Sonner toast host — styled via assets/scss/_toast.scss (ShreeHK design system).
 */
export default function AppToaster() {
  const isDarkMode = useUIStore((state) => state.isDarkMode);

  return (
    <Toaster
      theme={isDarkMode ? "dark" : "light"}
      position="top-right"
      richColors={false}
      closeButton
      expand={false}
      visibleToasts={4}
      gap={10}
      offset={{ top: 72, right: 16 }}
      mobileOffset={{ top: 64, right: 12, left: 12 }}
      duration={4000}
      toastOptions={{
        classNames: toastClassNames,
      }}
      icons={toastIcons}
    />
  );
}
