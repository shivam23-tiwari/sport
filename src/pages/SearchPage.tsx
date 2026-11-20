import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Search, User } from 'lucide-react';
import { searchAllSports } from '../services/api';
import MatchCard from '../components/MatchCard';
import ArticleCard from '../components/ArticleCard';
import TeamLogo from '../components/TeamLogo';
import { MatchGridSkeleton } from '../components/Skeletons';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [input, setInput] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(urlQuery);

  useEffect(() => {
    setInput(urlQuery);
    setDebouncedQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = input.trim();
      setDebouncedQuery(trimmed);
      if (trimmed !== urlQuery) {
        setSearchParams(trimmed ? { q: trimmed } : {}, { replace: true });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [input, urlQuery, setSearchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchAllSports(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 60_000,
  });

  const hasResults =
    Boolean(data?.teams.length) ||
    Boolean(data?.players.length) ||
    Boolean(data?.leagues.length) ||
    Boolean(data?.matches.length) ||
    Boolean(data?.articles.length);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-8">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#121722] p-5 sm:p-6">
        <div className="relative flex items-center">
          <Search
            size={18}
            className="absolute left-4 text-slate-400 dark:text-slate-500 pointer-events-none"
          />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search live teams, players, leagues, or news..."
            aria-label="Search sports database"
            autoFocus
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-100 dark:bg-[#0D111A] border border-slate-200 dark:border-slate-800 text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>
      </div>

      {debouncedQuery.length < 2 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Enter at least 2 characters to search live players, teams, leagues, fixtures, and news.
        </div>
      ) : isLoading ? (
        <MatchGridSkeleton count={6} />
      ) : !hasResults ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-10 text-center">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            No Matching Results
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Nothing found for &ldquo;{debouncedQuery}&rdquo; in current feeds.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Teams & Leagues */}
          {(data!.teams.length > 0 || data!.leagues.length > 0) && (
            <section className="space-y-3">
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Teams &amp; Leagues
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[...data!.teams, ...data!.leagues].map((item) => (
                  <a
                    key={`${item.type}-${item.id}`}
                    href={item.url || '#'}
                    target={item.url ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] hover:border-slate-300 dark:hover:border-slate-700 p-3.5 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <TeamLogo src={item.image} name={item.name} size="md" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase">
                          {item.sport} · {item.type}
                        </div>
                      </div>
                    </div>
                    {item.url && <ExternalLink size={14} className="text-slate-400 shrink-0" />}
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Players */}
          {data!.players.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Athletes
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {data!.players.map((p) => (
                  <a
                    key={p.id}
                    href={p.url || '#'}
                    target={p.url ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] hover:border-slate-300 dark:hover:border-slate-700 p-3.5 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover bg-slate-100 dark:bg-slate-800 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                          <User size={18} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {p.subtitle || p.sport}
                        </div>
                      </div>
                    </div>
                    {p.url && <ExternalLink size={14} className="text-slate-400 shrink-0" />}
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Matches */}
          {data!.matches.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Matches
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data!.matches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </section>
          )}

          {/* Articles */}
          {data!.articles.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Headlines
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data!.articles.map((art) => (
                  <ArticleCard key={art.id} article={art} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
