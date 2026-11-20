import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Newspaper } from 'lucide-react';
import { getArticleDetail } from '../services/api';
import { formatMatchTimeIST } from '../lib/time';
import type { Article } from '../../services/sports/types';

export default function NewsDetail() {
  const { id } = useParams();
  const location = useLocation();
  const stateArticle = (location.state as { article?: Article } | null)?.article;
  const [imgFailed, setImgFailed] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['article-detail', id],
    queryFn: () => getArticleDetail(id || ''),
    enabled: Boolean(id) && !stateArticle,
  });

  const article = stateArticle || data?.article;

  if (isLoading && !article) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
        <div className="h-6 w-32 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-12 w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="aspect-[16/9] rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if ((isError && !article) || !article) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121722] p-8 text-center">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Article Not Found
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            This story may have cycled out of the live RSS feed cache.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors"
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Headlines
      </Link>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#121722] overflow-hidden">
        <div className="aspect-[16/9] w-full bg-slate-100 dark:bg-[#161D2C] overflow-hidden">
          {article.image && !imgFailed ? (
            <img
              src={article.image}
              alt={article.title}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <Newspaper size={36} strokeWidth={1.5} />
              <span className="text-xs mt-2 font-medium">{article.source}</span>
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wide">
              {article.sport === 'nba' || article.sport === 'f1'
                ? article.sport.toUpperCase()
                : article.sport}
            </span>
            <span aria-hidden="true">·</span>
            <span>{article.source}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{formatMatchTimeIST(article.publishedAt)}</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-slate-950 dark:text-white leading-[1.08] tracking-tight text-balance">
            {article.title}
          </h1>

          {article.summary && (
            <p className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
              {article.summary}
            </p>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Syndicated live via {article.source}
            </span>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
            >
              <span>Read Full Report on {article.source}</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
