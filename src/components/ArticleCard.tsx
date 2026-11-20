import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper } from 'lucide-react';
import type { Article } from '../../services/sports/types';
import { formatRelativeTime } from '../lib/time';

interface ArticleCardProps {
  article: Article;
  compact?: boolean;
}

export default function ArticleCard({ article, compact = false }: ArticleCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Link
      to={`/news/${encodeURIComponent(article.id)}`}
      state={{ article }}
      className="group rounded-xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#121722] hover:border-slate-300 dark:hover:border-slate-700 transition-colors overflow-hidden flex flex-col h-full"
    >
      {!compact && (
        <div className="aspect-[16/9] w-full bg-slate-100 dark:bg-[#161D2C] overflow-hidden relative">
          {article.image && !imgFailed ? (
            <img
              src={article.image}
              alt={article.title}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800/70 dark:to-[#121722] text-slate-400 dark:text-slate-500 p-4">
              <Newspaper size={28} strokeWidth={1.5} />
              <span className="text-[11px] font-medium mt-2 uppercase tracking-wider">
                {article.source}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-4 flex flex-col justify-between flex-grow gap-2.5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span className="text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wide">
              {article.sport === 'nba' || article.sport === 'f1'
                ? article.sport.toUpperCase()
                : article.sport}
            </span>
            <span aria-hidden="true">·</span>
            <span>{article.source}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{formatRelativeTime(article.publishedAt)}</span>
          </div>

          <h3 className="font-display text-xl font-bold leading-tight text-slate-900 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors line-clamp-2 text-balance">
            {article.title}
          </h3>

          {!compact && article.summary && (
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {article.summary}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
