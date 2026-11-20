export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#121722] p-6 sm:p-8 space-y-6">
        <h1 className="font-display text-3xl font-extrabold text-slate-950 dark:text-white">
          Terms &amp; Data Sources
        </h1>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            1. Live Sports Data &amp; Feeds
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            SportsNetwork aggregates real-time scores, fixtures, standings, and news headlines from
            official and public sports data endpoints including ESPN, OpenF1, Jolpica-F1,
            ESPNCricinfo RSS, BBC Sport RSS, and Sky Sports RSS.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            2. Local Preferences
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Your theme preference and pinned favorite teams or leagues are stored locally in your
            browser via localStorage.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            3. Intellectual Property
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            All team crests, league trademarks, and syndicated news articles remain the property of
            their respective leagues and publishers and link back to their original sources.
          </p>
        </section>
      </div>
    </div>
  );
}
