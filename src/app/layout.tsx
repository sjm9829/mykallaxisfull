import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { GlobalLoadingOverlay } from "@/components/global-loading-overlay";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My KALLAX is Full",
  description: "나만의 앨범 컬렉션을 관리할 수 있는 웹 애플리케이션",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <LoadingProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <GlobalLoadingOverlay />
          <Toaster />
        </LoadingProvider>
      </body>
    </html>
  );
}
