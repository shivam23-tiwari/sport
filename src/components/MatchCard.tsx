import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import type { Match } from '../../services/sports/types';
import { useFavorites } from '../hooks/useFavorites';
import { formatMatchTimeIST } from '../lib/time';
import TeamLogo from './TeamLogo';
import ScoreFlash from './ScoreFlash';

interface MatchCardProps {
  match: Match;
}

export default function MatchCard({ match }: MatchCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favId = `team:${match.sport}:${match.home.shortName}`;
  const isHomeFav = isFavorite(favId);
  const awayFavId = `team:${match.sport}:${match.away.shortName}`;
  const isAwayFav = isFavorite(awayFavId);

  const isLive = match.status === 'LIVE';
  const showScore = match.status === 'LIVE' || match.status === 'FT';
  const matchHref = `/match/${match.sport}/${encodeURIComponent(match.id)}?league=${encodeURIComponent(match.leagueCode)}`;

  return (
    <div className="group relative rounded-xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#121722] hover:border-slate-300 dark:hover:border-slate-700 transition-colors p-4 flex flex-col justify-between gap-3">
      {/* Unboxed Header Metadata */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium truncate">
          {match.league}
        </span>

        {isLive ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            {match.statusText || 'LIVE'}
          </span>
        ) : match.status === 'FT' ? (
          <span className="font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
            {match.statusText || 'FT'}
          </span>
        ) : (
          <span className="font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0 tabular-nums">
            {formatMatchTimeIST(match.startTime)}
          </span>
        )}
      </div>

      {/* Teams & Scores */}
      <Link to={matchHref} className="space-y-2.5 block focus:outline-none">
        {[
          { side: match.home, favId, isFav: isHomeFav },
          { side: match.away, favId: awayFavId, isFav: isAwayFav },
        ].map(({ side }, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <TeamLogo src={side.logo} name={side.name} shortName={side.shortName} size="sm" />
              <div className="min-w-0">
                <span
                  className={`text-sm font-semibold truncate block ${
                    side.isWinner
                      ? 'text-slate-950 dark:text-white'
                      : 'text-slate-800 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors'
                  }`}
                >
                  {side.name}
                </span>
                {side.record && (
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 tabular-nums">
                    {side.record}
                  </span>
                )}
              </div>
            </div>

            {showScore ? (
              <ScoreFlash
                value={side.score}
                className={`text-base font-bold ${
                  side.isWinner
                    ? 'text-slate-950 dark:text-white'
                    : isLive
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-600 dark:text-slate-300'
                }`}
              />
            ) : (
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 uppercase">
                {side.subScore || side.shortName}
              </span>
            )}
          </div>
        ))}
      </Link>

      {/* Footer Note + Favorite Quick Action */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="truncate">{match.detailNote || match.venue || match.sourceProvider}</span>
        <button
          type="button"
          onClick={() =>
            toggleFavorite({
              id: favId,
              name: match.home.name,
              type: 'team',
              sport: match.sport,
              logo: match.home.logo,
            })
          }
          aria-label={`Favorite ${match.home.name}`}
          title={`Pin ${match.home.name} to Favorites`}
          className={`p-1 rounded-md transition-colors shrink-0 cursor-pointer ${
            isHomeFav || isAwayFav
              ? 'text-amber-500 hover:text-amber-400'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
          }`}
        >
          <Star size={13} fill={isHomeFav || isAwayFav ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  );
}
