import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp } from "antd";
import AntdThemeProvider from "./AntdThemeProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
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
