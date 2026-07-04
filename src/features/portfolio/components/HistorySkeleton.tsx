export function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Carregando extrato">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-11 animate-pulse rounded-lg border bg-muted/50" />
      ))}
    </div>
  );
}
