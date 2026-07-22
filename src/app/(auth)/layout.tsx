import type { Metadata } from "next";
import { AuthTheme } from "@/components/integrations/auth-theme";

export const metadata: Metadata = {
  title: {
    template: "%s | BuildView",
    default: "BuildView",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthTheme />
      {children}
    </>
  );
}
