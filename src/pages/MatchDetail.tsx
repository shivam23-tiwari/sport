import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, MapPin, Star } from 'lucide-react';
import { getMatchDetail } from '../services/api';
import { useFavorites } from '../hooks/useFavorites';
import { formatMatchTimeIST } from '../lib/time';
import TeamLogo from '../components/TeamLogo';
import ScoreFlash from '../components/ScoreFlash';
import { MatchGridSkeleton } from '../components/Skeletons';
import type { SportKey } from '../../services/sports/types';

type DetailTab = 'timeline' | 'stats' | 'lineups';

export default function MatchDetail() {
  const { sport, id } = useParams();
  const [searchParams] = useSearchParams();
  const league = searchParams.get('league') || undefined;
  const sportKey = (sport || 'football') as SportKey;

  const [tab, setTab] = useState<DetailTab>('timeline');
  const { isFavorite, toggleFavorite } = useFavorites();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['match-detail', sportKey, id, league],
    queryFn: () => getMatchDetail(sportKey, id || '', league),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.match?.status === 'LIVE' ? 20_000 : false),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="h-44 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] animate-pulse" />
        <MatchGridSkeleton count={3} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-8 text-center">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Match Details Unavailable
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {(error as Error)?.message || 'Live details could not be retrieved for this match.'}
          </p>
          <Link
            to={`/sport/${sportKey}`}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors"
          >
            <ArrowLeft size={14} /> Back to {sportKey.toUpperCase()}
          </Link>
        </div>
      </div>
    );
  }

  const { match, timeline, stats, lineups, sessionRows, summary } = data;
  const isLive = match.status === 'LIVE';
  const showScore = match.status === 'LIVE' || match.status === 'FT';
  const homeFavId = `team:${match.sport}:${match.home.shortName}`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          to={`/sport/${match.sport}?league=${encodeURIComponent(match.leagueCode)}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to {match.league}
        </Link>

        {match.externalUrl && (
          <a
            href={match.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors"
          >
            <span>Source: {match.sourceProvider}</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Scoreboard Hero Card */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#121722] p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{match.league}</span>
            {match.venue && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} />
                  {match.venue}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                {match.statusText || 'LIVE'}
              </span>
            ) : (
              <span className="font-mono text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                {match.status === 'FT' ? match.statusText || 'Final' : formatMatchTimeIST(match.startTime)}
              </span>
            )}

            <button
              type="button"
              onClick={() =>
                toggleFavorite({
                  id: homeFavId,
                  name: match.home.name,
                  type: 'team',
                  sport: match.sport,
                  logo: match.home.logo,
                })
              }
              aria-label="Pin team to favorites"
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isFavorite(homeFavId)
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
                  : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Star size={14} fill={isFavorite(homeFavId) ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Main Matchup Score Grid */}
        <div className="grid grid-cols-3 items-center gap-4 py-2">
          <div className="flex flex-col items-center text-center gap-2.5">
            <TeamLogo src={match.home.logo} name={match.home.name} shortName={match.home.shortName} size="lg" />
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-950 dark:text-white leading-tight">
                {match.home.name}
              </h1>
              {match.home.subScore && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{match.home.subScore}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center text-center">
            {showScore ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <ScoreFlash
                  value={match.home.score}
                  className="text-3xl sm:text-5xl font-extrabold text-slate-950 dark:text-white"
                />
                <span className="text-xl text-slate-400 font-mono">-</span>
                <ScoreFlash
                  value={match.away.score}
                  className="text-3xl sm:text-5xl font-extrabold text-slate-950 dark:text-white"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <span className="font-display text-2xl sm:text-3xl font-bold text-slate-400 dark:text-slate-500">
                  VS
                </span>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatMatchTimeIST(match.startTime)}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center text-center gap-2.5">
            <TeamLogo src={match.away.logo} name={match.away.name} shortName={match.away.shortName} size="lg" />
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-950 dark:text-white leading-tight">
                {match.away.name}
              </h2>
              {match.away.subScore && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{match.away.subScore}</p>
              )}
            </div>
          </div>
        </div>

        {summary && (
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center border-t border-slate-100 dark:border-slate-800/80 pt-4">
            {summary}
          </p>
        )}
      </section>

      {/* F1 Session Classification Grid (if Formula 1) */}
      {sessionRows && sessionRows.length > 0 && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#121722] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Session Classification
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pl-5 pr-2 font-mono">POS</th>
                  <th className="py-2.5 px-3">Driver</th>
                  <th className="py-2.5 px-3">Constructor</th>
                  <th className="py-2.5 pr-5 text-right font-mono">TIME / STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {sessionRows.map((row) => (
                  <tr key={`${row.position}-${row.driverName}`} className="h-10">
                    <td className="py-2 pl-5 pr-2 font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                      {row.position}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {row.driverName}{' '}
                      {row.acronym && (
                        <span className="font-mono text-[11px] text-slate-400 ml-1">{row.acronym}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{row.teamName}</td>
                    <td className="py-2 pr-5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {row.gapOrTime || (row.driverNumber ? `#${row.driverNumber}` : '-')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Detail Tabs */}
      {(!sessionRows || sessionRows.length === 0) && (
        <>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-[#121722] border border-slate-200 dark:border-slate-800 w-fit">
            {(
              [
                { id: 'timeline', label: `Timeline (${timeline.length})` },
                { id: 'stats', label: `Team Stats (${stats.length})` },
                { id: 'lineups', label: `Lineups / Boxscore (${lineups.length})` },
              ] as { id: DetailTab; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  tab === t.id
                    ? 'bg-white dark:bg-[#1B2233] text-slate-950 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'timeline' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#121722] p-5">
              {timeline.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                  No timeline events available yet for this match.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {timeline.map((ev, idx) => (
                    <div key={idx} className="py-3 flex items-start gap-4 text-xs">
                      <span className="font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400 min-w-[64px] shrink-0">
                        {ev.time || '·'}
                      </span>
                      <div className="space-y-0.5">
                        {ev.team && (
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {ev.team}
                          </div>
                        )}
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{ev.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'stats' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#121722] p-5">
              {stats.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                  Match statistics are not available yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {stats.map((st, idx) => (
                    <div key={idx} className="py-3 grid grid-cols-3 items-center text-xs">
                      <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                        {st.homeValue}
                      </span>
                      <span className="text-center font-medium text-slate-500 dark:text-slate-400">
                        {st.label}
                      </span>
                      <span className="text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                        {st.awayValue}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'lineups' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {lineups.length === 0 ? (
                <div className="md:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  Lineups and boxscore have not been published yet.
                </div>
              ) : (
                lineups.map((teamBlock, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#121722] overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
                      <TeamLogo src={teamBlock.logo} name={teamBlock.team} size="xs" />
                      <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                        {teamBlock.team}
                      </h3>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                      {teamBlock.players.map((p, pIdx) => (
                        <div
                          key={pIdx}
                          className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {p.name}
                            </span>
                            {p.position && (
                              <span className="ml-2 text-[11px] font-mono text-slate-400">
                                {p.position}
                              </span>
                            )}
                          </div>
                          {p.stats && (
                            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 tabular-nums shrink-0">
                              {p.stats}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
