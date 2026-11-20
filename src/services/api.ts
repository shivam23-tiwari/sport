import type {
  Article,
  Match,
  MatchDetail,
  QuickLink,
  SearchResults,
  SportKey,
  SportPageResponse,
  SportsOverviewResponse,
} from '../../services/sports/types';

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export function getSportsOverview(force = false) {
  return fetchApi<SportsOverviewResponse>(`/api/sports/overview${force ? '?force=true' : ''}`);
}

export function getLiveTicker(force = false) {
  return fetchApi<{
    matches: Match[];
    liveCount: number;
    quickLinks: QuickLink[];
    fetchedAt: string;
  }>(`/api/sports/live${force ? '?force=true' : ''}`);
}

export function getSportPage(sport: SportKey, league?: string, force = false) {
  const params = new URLSearchParams();
  if (league) params.set('league', league);
  if (force) params.set('force', 'true');
  const qs = params.toString();
  return fetchApi<SportPageResponse>(`/api/sports/${sport}${qs ? `?${qs}` : ''}`);
}

export function getMatchDetail(sport: SportKey, id: string, league?: string) {
  const qs = league ? `?league=${encodeURIComponent(league)}` : '';
  return fetchApi<MatchDetail>(`/api/sports/${sport}/match/${encodeURIComponent(id)}${qs}`);
}

export function getNewsList(sport?: string) {
  const qs = sport ? `?sport=${encodeURIComponent(sport)}` : '';
  return fetchApi<{ articles: Article[]; fetchedAt: string }>(`/api/sports/news${qs}`);
}

export function getArticleDetail(id: string) {
  return fetchApi<{ article: Article }>(`/api/sports/news/${encodeURIComponent(id)}`);
}

export function searchAllSports(query: string) {
  return fetchApi<SearchResults>(`/api/sports/search?q=${encodeURIComponent(query)}`);
}

export async function submitContactMessage(payload: {
  name: string;
  email: string;
  message: string;
}) {
  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}
