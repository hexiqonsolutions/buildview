import type { Metadata } from "next";
import { privateMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...privateMetadata,
  title: "Contact BuildView Team | Portal Access",
  description:
    "You're signed in to BuildView. Contact the team to get your project dashboard assigned — Construction Intelligence, Real Estate Showcase, and Interior Showcase.",
  robots: { index: false, follow: false },
};

export default function WelcomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
