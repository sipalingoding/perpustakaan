import type { Metadata } from "next";
import { AuthBackdrop } from "@/components/auth/AuthBackdrop";
import { AuthBook } from "@/components/auth/AuthBook";

export const metadata: Metadata = { title: "Masuk" };

export default function MasukPage() {
  return (
    <AuthBackdrop>
      <AuthBook />
    </AuthBackdrop>
  );
}
