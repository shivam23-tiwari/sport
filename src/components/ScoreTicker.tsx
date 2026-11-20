import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getLiveTicker } from '../services/api';
import { formatClockIST, formatMatchTimeIST } from '../lib/time';
import { TickerSkeleton } from './Skeletons';
import TeamLogo from './TeamLogo';
import ScoreFlash from './ScoreFlash';
import type { SportKey } from '../../services/sports/types';

type FilterKey = 'all' | 'live' | SportKey;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live' },
  { key: 'football', label: 'Football' },
  { key: 'cricket', label: 'Cricket' },
  { key: 'nba', label: 'NBA' },
  { key: 'f1', label: 'F1' },
];

export default function ScoreTicker() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['live-ticker'],
    queryFn: () => getLiveTicker(false),
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

  const matches = data?.matches || [];
  const liveCount = data?.liveCount || 0;

  const filtered = matches.filter((m) => {
    if (filter === 'all') return true;
    if (filter === 'live') return m.status === 'LIVE';
    return m.sport === filter;
  });

  const scrollBy = (offset: number) => {
    scrollRef.current?.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <section
      aria-label="Live Sports Scoreboard"
      className="border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D111A]"
    >
      {/* Controls & Real Live Status Bar */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const showDot = f.key === 'live' && liveCount > 0;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                {showDot && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                <span>{f.label}</span>
                {f.key === 'live' && (
                  <span className="font-mono tabular-nums text-[11px] opacity-80">
                    ({liveCount})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums ml-auto">
          <span>
            Last updated: {data?.fetchedAt ? `${formatClockIST(data.fetchedAt)} IST` : '--:--:--'}
          </span>
          <button
            type="button"
            onClick={() => refetch()}
            aria-label="Refresh live scores"
            title="Refresh scores"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin text-rose-500' : ''} />
          </button>
        </div>
      </div>

      {/* Horizontal Snap-Scroll Ticker Strip */}
      {isLoading ? (
        <TickerSkeleton />
      ) : filtered.length === 0 ? (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>
            {filter === 'live'
              ? 'No live matches right now across selected feeds.'
              : 'No matches available for this sport right now.'}
          </span>
          {filter !== 'all' && (
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
            >
              Show all sports
            </button>
          )}
        </div>
      ) : (
        <div className="relative max-w-[1440px] mx-auto flex items-center">
          <button
            type="button"
            onClick={() => scrollBy(-300)}
            aria-label="Scroll scores left"
            className="hidden sm:flex items-center justify-center w-8 h-[78px] shrink-0 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer border-r border-slate-100 dark:border-slate-800/60"
          >
            <ChevronLeft size={16} />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 sm:px-3 py-2.5 flex-1"
          >
            {filtered.map((m) => {
              const isLive = m.status === 'LIVE';
              const showScore = m.status === 'LIVE' || m.status === 'FT';
              const href = `/match/${m.sport}/${encodeURIComponent(m.id)}?league=${encodeURIComponent(m.leagueCode)}`;
              return (
                <Link
                  key={m.id}
                  to={href}
                  className="snap-start min-w-[218px] max-w-[238px] shrink-0 rounded-xl border border-slate-200 dark:border-slate-800/90 bg-slate-50/70 dark:bg-[#121722] hover:border-slate-300 dark:hover:border-slate-700 px-3 py-2 flex flex-col justify-between gap-1.5 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium truncate">
                      {m.league}
                    </span>
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-rose-600 dark:text-rose-400 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        {m.statusText || 'LIVE'}
                      </span>
                    ) : m.status === 'FT' ? (
                      <span className="font-mono text-slate-500 dark:text-slate-400 shrink-0">
                        {m.statusText || 'FT'}
                      </span>
                    ) : (
                      <span className="font-mono text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                        {formatMatchTimeIST(m.startTime).replace(' IST', '')}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TeamLogo src={m.home.logo} name={m.home.name} shortName={m.home.shortName} size="xs" />
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {m.home.shortName}
                        </span>
                      </div>
                      {showScore ? (
                        <ScoreFlash
                          value={m.home.score}
                          className="text-xs font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                          {m.home.record || ''}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TeamLogo src={m.away.logo} name={m.away.name} shortName={m.away.shortName} size="xs" />
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {m.away.shortName}
                        </span>
                      </div>
                      {showScore ? (
                        <ScoreFlash
                          value={m.away.score}
                          className="text-xs font-bold text-slate-900 dark:text-white"
                        />
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                          {m.away.record || ''}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollBy(300)}
            aria-label="Scroll scores right"
            className="hidden sm:flex items-center justify-center w-8 h-[78px] shrink-0 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer border-l border-slate-100 dark:border-slate-800/60"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}
