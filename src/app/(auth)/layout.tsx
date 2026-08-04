import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-zinc-100">
      <AuthBrandPanel />
      <div className="relative flex flex-1 items-center justify-center px-6 py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.08),_transparent_40%)]" />
        <div className="relative z-10 w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
