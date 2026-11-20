import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Newspaper, Star, X } from 'lucide-react';
import { getSportsOverview } from '../services/api';
import { useFavorites } from '../hooks/useFavorites';
import { formatRelativeTime } from '../lib/time';
import { HeroSkeleton, MatchGridSkeleton, StandingsSkeleton } from '../components/Skeletons';
import MatchCard from '../components/MatchCard';
import ArticleCard from '../components/ArticleCard';
import StandingsWidget from '../components/StandingsWidget';
import type { Match } from '../../services/sports/types';

export default function Home() {
  const { favorites, toggleFavorite } = useFavorites();
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['sports-overview'],
    queryFn: () => getSportsOverview(false),
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

  const matches = data?.matches || [];
  const articles = data?.articles || [];
  const standings = data?.standings || [];
  const quickLinks = data?.quickLinks || [];

  const liveMatches = useMemo(
    () => matches.filter((m) => m.status === 'LIVE'),
    [matches]
  );

  // Favorite matches filtered dynamically by pinned teams or leagues
  const favoriteMatches = useMemo(() => {
    if (favorites.length === 0) return [];
    const names = favorites.map((f) => f.name.toLowerCase());
    return matches.filter(
      (m) =>
        names.some((n) => m.home.name.toLowerCase().includes(n)) ||
        names.some((n) => m.away.name.toLowerCase().includes(n)) ||
        names.some((n) => m.league.toLowerCase().includes(n))
    );
  }, [matches, favorites]);

  // Group non-live (or all current) fixtures by league cleanly
  const groupedLeagues = useMemo(() => {
    const groups = new Map<string, { league: string; sport: string; leagueCode: string; items: Match[] }>();
    for (const m of matches) {
      const key = `${m.sport}:${m.league}`;
      const existing = groups.get(key);
      if (existing) {
        if (existing.items.length < 6) existing.items.push(m);
      } else {
        groups.set(key, {
          league: m.league,
          sport: m.sport,
          leagueCode: m.leagueCode,
          items: [m],
        });
      }
    }
    return Array.from(groups.values()).slice(0, 6);
  }, [matches]);

  const featuredArticle = articles.find((a) => a.image) || articles[0];
  const topHeadlines = articles
    .filter((a) => a.id !== featuredArticle?.id)
    .slice(0, 5);
  const gridArticles = articles
    .filter((a) => a.id !== featuredArticle?.id && !topHeadlines.some((h) => h.id === a.id))
    .slice(0, 6);

  if (isError) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-8 text-center">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Unable to Load Live Feeds
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {(error as Error)?.message || 'Upstream sports data sources are temporarily unreachable.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-10">
      {/* 1. Hero Featured Story + Top Headlines */}
      {isLoading ? (
        <HeroSkeleton />
      ) : (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-8">
            {featuredArticle ? (
              <Link
                to={`/news/${encodeURIComponent(featuredArticle.id)}`}
                state={{ article: featuredArticle }}
                className="group relative block rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800/90 bg-slate-900 h-full min-h-[320px] sm:min-h-[420px]"
              >
                {featuredArticle.image && !heroImgFailed ? (
                  <img
                    src={featuredArticle.image}
                    alt={featuredArticle.title}
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover aspect-[16/9] group-hover:scale-[1.02] transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full min-h-[360px] flex flex-col items-center justify-center bg-slate-900 text-slate-500">
                    <Newspaper size={40} strokeWidth={1.5} />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

                <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                    <span className="text-rose-400 font-semibold uppercase tracking-wide">
                      {featuredArticle.sport === 'nba' || featuredArticle.sport === 'f1'
                        ? featuredArticle.sport.toUpperCase()
                        : featuredArticle.sport}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{featuredArticle.source}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatRelativeTime(featuredArticle.publishedAt)}</span>
                  </div>
                  <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-white leading-[1.06] tracking-tight max-w-3xl text-balance">
                    {featuredArticle.title}
                  </h1>
                  {featuredArticle.summary && (
                    <p className="text-sm text-slate-200 line-clamp-2 max-w-2xl leading-relaxed">
                      {featuredArticle.summary}
                    </p>
                  )}
                </div>
              </Link>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-8 text-center h-full flex items-center justify-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No headlines available right now.
                </p>
              </div>
            )}
          </div>

          {/* Top Headlines Sidebar */}
          <aside className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#121722] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Top Headlines
                </h2>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Live RSS Feeds
                </span>
              </div>

              {topHeadlines.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
                  No additional headlines available.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {topHeadlines.map((art) => (
                    <Link
                      key={art.id}
                      to={`/news/${encodeURIComponent(art.id)}`}
                      state={{ article: art }}
                      className="group py-3.5 block"
                    >
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        <span className="text-rose-600 dark:text-rose-400 font-semibold uppercase">
                          {art.sport}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{art.source}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatRelativeTime(art.publishedAt)}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors leading-snug line-clamp-2">
                        {art.title}
                      </h3>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Dynamic Quick Links built strictly from live tournaments */}
            {quickLinks.length > 0 && (
              <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                  Active Tournaments
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quickLinks.map((ql) => (
                    <Link
                      key={ql.id}
                      to={`/sport/${ql.sport}${ql.leagueCode ? `?league=${encodeURIComponent(ql.leagueCode)}` : ''}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#181F2E] text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors"
                    >
                      {ql.liveCount > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      )}
                      <span>{ql.label}</span>
                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        {ql.matchCount}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>
      )}

      {/* 2. Pinned Favorites Strip (if any saved in localStorage) */}
      {favorites.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-amber-500" fill="currentColor" />
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                My Favorites
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {favorites.map((fav) => (
                <button
                  key={fav.id}
                  type="button"
                  onClick={() => toggleFavorite(fav)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-[#121722] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-rose-500 cursor-pointer"
                  title="Remove from Favorites"
                >
                  <span>{fav.name}</span>
                  <X size={12} className="text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          {favoriteMatches.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteMatches.map((m) => (
                <MatchCard key={`fav-${m.id}`} match={m} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
              No active matches right now for your pinned teams.
            </div>
          )}
        </section>
      )}

      {/* 3. Live Now Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {liveMatches.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Live Now
            </h2>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              {liveMatches.length} {liveMatches.length === 1 ? 'event' : 'events'}
            </span>
          </div>
        </div>

        {isLoading ? (
          <MatchGridSkeleton count={3} />
        ) : liveMatches.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#121722] px-5 py-6 text-sm text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>No live matches right now across Football, Cricket, NBA, or Formula 1.</span>
            <Link
              to="/sport/football"
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1"
            >
              Browse upcoming fixtures <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Today's Fixtures Grouped by League */}
      <section className="space-y-6">
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Scoreboard &amp; Today&apos;s Schedule
        </h2>

        {isLoading ? (
          <MatchGridSkeleton count={6} />
        ) : groupedLeagues.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No scheduled fixtures returned right now.
          </div>
        ) : (
          <div className="space-y-8">
            {groupedLeagues.map((group) => (
              <div key={`${group.sport}-${group.league}`} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                      {group.league}
                    </h3>
                    <span className="text-xs text-slate-400 dark:text-slate-500 uppercase font-medium">
                      · {group.sport}
                    </span>
                  </div>
                  <Link
                    to={`/sport/${group.sport}?league=${encodeURIComponent(group.leagueCode)}`}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1 transition-colors"
                  >
                    Full Hub <ArrowRight size={12} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.items.map((m) => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Standings Widgets & Latest Stories */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Latest Stories
          </h2>
          {gridArticles.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-6 text-sm text-slate-500 dark:text-slate-400">
              No additional stories available.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gridArticles.map((art) => (
                <ArticleCard key={art.id} article={art} />
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-4">
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Live Standings
          </h2>
          {isLoading ? (
            <div className="space-y-4">
              <StandingsSkeleton />
              <StandingsSkeleton />
            </div>
          ) : standings.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-6 text-sm text-slate-500 dark:text-slate-400">
              Standings unavailable right now.
            </div>
          ) : (
            <div className="space-y-5">
              {standings.map((table) => (
                <StandingsWidget key={table.id} table={table} limit={6} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
