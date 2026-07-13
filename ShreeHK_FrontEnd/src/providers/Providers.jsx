import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp } from "antd";
import AntdThemeProvider from "./AntdThemeProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AntdThemeProvider>
        <AntApp message={{ top: 72, maxCount: 4, duration: 4 }}>
          {children}
        </AntApp>
      </AntdThemeProvider>
    </QueryClientProvider>
  );
}
