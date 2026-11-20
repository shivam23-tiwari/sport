import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Star } from 'lucide-react';
import { getSportPage } from '../services/api';
import { useFavorites } from '../hooks/useFavorites';
import { formatClockIST } from '../lib/time';
import { MatchGridSkeleton, StandingsSkeleton } from '../components/Skeletons';
import MatchCard from '../components/MatchCard';
import StandingsWidget from '../components/StandingsWidget';
import ArticleCard from '../components/ArticleCard';
import type { SportKey } from '../../services/sports/types';

const VALID_SPORTS: Record<string, { key: SportKey; title: string }> = {
  football: { key: 'football', title: 'Football' },
  cricket: { key: 'cricket', title: 'Cricket' },
  nba: { key: 'nba', title: 'NBA Basketball' },
  f1: { key: 'f1', title: 'Formula 1' },
};

type SubTab = 'scores' | 'standings' | 'news';

export default function SportCategory() {
  const { sport } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const normalized = VALID_SPORTS[(sport || 'football').toLowerCase()] || VALID_SPORTS.football;

  const selectedLeague = searchParams.get('league') || (normalized.key === 'football' ? 'eng.1' : normalized.key);
  const [activeTab, setActiveTab] = useState<SubTab>('scores');
  const { isFavorite, toggleFavorite } = useFavorites();

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['sport-page', normalized.key, selectedLeague],
    queryFn: () => getSportPage(normalized.key, selectedLeague, false),
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

  const matches = data?.matches || [];
  const standings = data?.standings || [];
  const articles = data?.articles || [];
  const leaguesAvailable = data?.leaguesAvailable || [];

  const filteredMatches =
    normalized.key === 'football' && selectedLeague && selectedLeague !== 'all'
      ? matches.filter((m) => m.leagueCode === selectedLeague)
      : matches;

  const liveMatches = filteredMatches.filter((m) => m.status === 'LIVE');
  const upcomingMatches = filteredMatches.filter((m) => m.status === 'UPCOMING');
  const finishedMatches = filteredMatches.filter((m) => m.status === 'FT');

  const leagueFavId = `league:${normalized.key}:${selectedLeague}`;
  const currentLeagueName =
    leaguesAvailable.find((l) => l.code === selectedLeague)?.name || normalized.title;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#121722] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
              Sport Hub
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Last updated: {data?.fetchedAt ? `${formatClockIST(data.fetchedAt)} IST` : '--:--:--'}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            {normalized.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              toggleFavorite({
                id: leagueFavId,
                name: currentLeagueName,
                type: 'league',
                sport: normalized.key,
              })
            }
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
              isFavorite(leagueFavId)
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <Star size={14} fill={isFavorite(leagueFavId) ? 'currentColor' : 'none'} />
            <span>{isFavorite(leagueFavId) ? 'Pinned' : 'Pin League'}</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin text-rose-500' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* League Switcher (when multiple competitions exist, e.g. Football) */}
      {leaguesAvailable.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {normalized.key === 'football' && (
            <button
              type="button"
              onClick={() => setSearchParams({ league: 'all' })}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedLeague === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                  : 'bg-white dark:bg-[#121722] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              All Top Leagues
            </button>
          )}
          {leaguesAvailable.map((lg) => {
            const active = selectedLeague === lg.code;
            return (
              <button
                key={lg.code}
                type="button"
                onClick={() => setSearchParams({ league: lg.code })}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                    : 'bg-white dark:bg-[#121722] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {lg.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Primary Section Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-[#121722] border border-slate-200 dark:border-slate-800 w-fit">
        {(
          [
            { id: 'scores', label: `Scores & Fixtures (${filteredMatches.length})` },
            { id: 'standings', label: `Standings (${standings.length})` },
            { id: 'news', label: `News (${articles.length})` },
          ] as { id: SubTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white dark:bg-[#1B2233] text-slate-950 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-sm text-rose-600 dark:text-rose-400">
          {(error as Error)?.message || 'Failed to load sport data.'}
        </div>
      )}

      {/* TAB: SCORES & FIXTURES */}
      {activeTab === 'scores' && (
        <div className="space-y-8">
          {isLoading ? (
            <MatchGridSkeleton count={6} />
          ) : filteredMatches.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-10 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No live or scheduled matches found right now for {currentLeagueName}.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Try another competition or check back closer to kickoff.
              </p>
            </div>
          ) : (
            <>
              {liveMatches.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                      Live Matches
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {liveMatches.map((m) => (
                      <MatchCard key={m.id} match={m} />
                    ))}
                  </div>
                </section>
              )}

              {upcomingMatches.length > 0 && (
                <section className="space-y-3">
                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                    Upcoming Schedule
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {upcomingMatches.map((m) => (
                      <MatchCard key={m.id} match={m} />
                    ))}
                  </div>
                </section>
              )}

              {finishedMatches.length > 0 && (
                <section className="space-y-3">
                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                    Recent Results
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {finishedMatches.map((m) => (
                      <MatchCard key={m.id} match={m} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: STANDINGS */}
      {activeTab === 'standings' && (
        <div className="space-y-6">
          {isLoading ? (
            <StandingsSkeleton />
          ) : standings.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-10 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No standings table currently available for {normalized.title}.
              </p>
              {normalized.key === 'cricket' && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configure GEMINI_API_KEY or CRICKETDATA_API_KEY in environment secrets for live tournament tables.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {standings.map((table) => (
                <StandingsWidget key={table.id} table={table} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: NEWS */}
      {activeTab === 'news' && (
        <div>
          {isLoading ? (
            <MatchGridSkeleton count={6} />
          ) : articles.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No recent news articles found for {normalized.title}.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {articles.map((art) => (
                <ArticleCard key={art.id} article={art} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
