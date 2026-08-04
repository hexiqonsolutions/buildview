type AppTopbarProps = {
  title: string;
  description?: string;
};

export function AppTopbar({ title, description }: AppTopbarProps) {
  return (
    <header className="border-b border-zinc-800/80 px-6 py-5 md:px-8">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white">
        {title}
      </h1>
      {description ? (
        <p className="mt-1 text-sm text-zinc-400">{description}</p>
      ) : null}
    </header>
  );
}
