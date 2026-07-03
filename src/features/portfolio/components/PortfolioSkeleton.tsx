export function PortfolioSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando carteira">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[68px] animate-pulse rounded-lg border bg-muted/50" />
        ))}
      </div>
      <div className="h-9 w-64 animate-pulse rounded-lg bg-muted/50" />
      <div className="h-72 animate-pulse rounded-lg border bg-muted/50" />
    </div>
  );
}
