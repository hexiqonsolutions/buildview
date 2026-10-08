import type { Metadata } from "next";
import { AuthTheme } from "@/components/integrations/auth-theme";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...privateMetadata,
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
