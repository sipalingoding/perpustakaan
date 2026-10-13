import type { Metadata } from "next";
import { AuthBackdrop } from "@/components/auth/AuthBackdrop";
import { ResetPassword } from "@/components/auth/ResetPassword";

export const metadata: Metadata = { title: "Lupa kata sandi", robots: { index: false } };

export default function LupaSandiPage() {
  return (
    <AuthBackdrop>
      <ResetPassword />
    </AuthBackdrop>
  );
}
