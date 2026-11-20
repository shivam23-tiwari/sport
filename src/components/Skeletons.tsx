export function TickerSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden px-4 sm:px-6 py-2.5 max-w-[1440px] mx-auto">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="min-w-[232px] h-[74px] rounded-xl bg-slate-200/70 dark:bg-[#161C2A] border border-slate-200 dark:border-slate-800/80 animate-pulse shrink-0 p-3 space-y-2"
        >
          <div className="h-2.5 w-24 rounded bg-slate-300 dark:bg-slate-700/70" />
          <div className="h-3.5 w-40 rounded bg-slate-300 dark:bg-slate-700/70" />
          <div className="h-3.5 w-36 rounded bg-slate-300 dark:bg-slate-700/70" />
        </div>
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] animate-pulse">
        <div className="aspect-[16/9] bg-slate-200 dark:bg-slate-800/70" />
        <div className="p-6 space-y-3">
          <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700/60" />
          <div className="h-7 w-4/5 rounded bg-slate-200 dark:bg-slate-700/60" />
          <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700/60" />
        </div>
      </div>
      <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-5 space-y-4 animate-pulse">
        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700/60" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="h-3.5 w-full rounded bg-slate-200 dark:bg-slate-700/60" />
            <div className="h-2.5 w-24 rounded bg-slate-200 dark:bg-slate-700/60" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MatchGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-4 space-y-3 animate-pulse"
        >
          <div className="flex justify-between">
            <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700/60" />
            <div className="h-3 w-14 rounded bg-slate-200 dark:bg-slate-700/60" />
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700/60" />
                <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700/60" />
              </div>
              <div className="h-4 w-10 rounded bg-slate-200 dark:bg-slate-700/60" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700/60" />
                <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700/60" />
              </div>
              <div className="h-4 w-10 rounded bg-slate-200 dark:bg-slate-700/60" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StandingsSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-4 space-y-3 animate-pulse">
      <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700/60" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <div className="h-3 w-4 rounded bg-slate-200 dark:bg-slate-700/60" />
            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700/60" />
            <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-700/60" />
          </div>
          <div className="h-3.5 w-16 rounded bg-slate-200 dark:bg-slate-700/60" />
        </div>
      ))}
    </div>
  );
}
