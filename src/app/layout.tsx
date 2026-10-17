import type { Metadata } from "next";
import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-600.css";
import "@fontsource/poppins/latin-700.css";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: {
    default: "Lembar · perpustakaan yang tenang",
    template: "%s · Lembar",
  },
  description:
    "Pinjam buku, atur jadwal pengembalian, lihat rak para anggota, dan sumbangkan bukumu ke perpustakaan Lembar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full">
      <body className="min-h-full">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
