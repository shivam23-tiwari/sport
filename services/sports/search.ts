import { CACHE_TTL, fetchJsonWithTimeout, getOrFetch } from './cache.js';
import { getFootballMatches } from './football.js';
import { getNbaMatches } from './nba.js';
import { getCricketMatches } from './cricket.js';
import { getF1Matches } from './f1.js';
import { getAllNews } from './news.js';
import type { SearchEntity, SearchResults } from './types.js';

export async function searchSports(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (!q) {
    return { players: [], teams: [], leagues: [], matches: [], articles: [] };
  }

  const { data } = await getOrFetch(
    `search:${q.toLowerCase()}`,
    CACHE_TTL.SEARCH,
    async () => {
      const lowerQ = q.toLowerCase();

      const [espnRes, fb, nba, crik, f1, newsRes] = await Promise.all([
        fetchJsonWithTimeout<any>(
          `https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(q)}&limit=12`,
          {},
          6000
        ).catch(() => null),
        getFootballMatches().catch(() => ({ matches: [] })),
        getNbaMatches().catch(() => ({ matches: [] })),
        getCricketMatches().catch(() => ({ matches: [] })),
        getF1Matches().catch(() => ({ matches: [] })),
        getAllNews().catch(() => ({ articles: [] })),
      ]);

      const players: SearchEntity[] = [];
      const teams: SearchEntity[] = [];
      const leagues: SearchEntity[] = [];

      const groups = Array.isArray(espnRes?.results) ? espnRes.results : [];
      for (const group of groups) {
        const contents = Array.isArray(group?.contents) ? group.contents : [];
        if (group.type === 'player') {
          for (const p of contents.slice(0, 8)) {
            players.push({
              id: String(p.id || p.uid || p.displayName),
              name: p.displayName || p.title || 'Player',
              sport: p.sport || p.defaultLeagueSlug || 'sports',
              subtitle: p.subtitle || p.description || '',
              image: p.image?.default || p.image?.url,
              url: p.link?.web,
              type: 'player',
            });
          }
        } else if (group.type === 'team') {
          for (const t of contents.slice(0, 8)) {
            teams.push({
              id: String(t.id || t.uid || t.displayName),
              name: t.displayName || 'Team',
              sport: t.sport || 'sports',
              subtitle: t.subtitle || '',
              image: t.image?.default || t.image?.url,
              url: t.link?.web,
              type: 'team',
            });
          }
        } else if (group.type === 'league') {
          for (const l of contents.slice(0, 6)) {
            leagues.push({
              id: String(l.id || l.uid || l.displayName),
              name: l.displayName || 'League',
              sport: l.sport || 'sports',
              subtitle: l.subtitle || '',
              image: l.image?.default || l.image?.url,
              url: l.link?.web,
              type: 'league',
            });
          }
        }
      }

      const allMatches = [...fb.matches, ...nba.matches, ...crik.matches, ...f1.matches];
      const matches = allMatches
        .filter(
          (m) =>
            m.home.name.toLowerCase().includes(lowerQ) ||
            m.away.name.toLowerCase().includes(lowerQ) ||
            m.league.toLowerCase().includes(lowerQ) ||
            m.sport.toLowerCase().includes(lowerQ)
        )
        .slice(0, 12);

      const articles = newsRes.articles
        .filter(
          (a) =>
            a.title.toLowerCase().includes(lowerQ) ||
            a.summary.toLowerCase().includes(lowerQ) ||
            a.sport.toLowerCase().includes(lowerQ)
        )
        .slice(0, 12);

      return { players, teams, leagues, matches, articles } satisfies SearchResults;
    }
  );

  return data;
}
