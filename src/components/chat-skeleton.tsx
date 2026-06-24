export function ChatSkeleton() {
  const widths = ["w-40", "w-56", "w-32", "w-48", "w-60", "w-36"];
  return (
    <div className="flex flex-col gap-3">
      {widths.map((w, i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
        >
          <div className={`h-9 ${w} animate-pulse rounded-2xl bg-muted`} />
        </div>
      ))}
    </div>
  );
}
