import { getCricketMatches, getCricketMatchDetail, getCricketStandings } from './cricket.js';
import { getF1Matches, getF1MatchDetail, getF1Standings } from './f1.js';
import {
  FOOTBALL_LEAGUES,
  getFootballMatches,
  getFootballMatchDetail,
  getFootballStandings,
} from './football.js';
import { getNbaMatches, getNbaMatchDetail, getNbaStandings } from './nba.js';
import { getAllNews, getArticleById } from './news.js';
import { searchSports } from './search.js';
import type {
  Match,
  MatchDetail,
  QuickLink,
  SportKey,
  SportPageResponse,
  SportsOverviewResponse,
} from './types.js';

export * from './types.js';
export { getAllNews, getArticleById, searchSports };

function buildDynamicQuickLinks(matches: Match[]): QuickLink[] {
  const map = new Map<string, QuickLink>();

  for (const m of matches) {
    const key = `${m.sport}:${m.leagueCode}:${m.league}`;
    const existing = map.get(key);
    if (existing) {
      existing.matchCount += 1;
      if (m.status === 'LIVE') existing.liveCount += 1;
    } else {
      map.set(key, {
        id: key,
        label: m.league,
        sport: m.sport,
        leagueCode: m.leagueCode,
        liveCount: m.status === 'LIVE' ? 1 : 0,
        matchCount: 1,
      });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => {
      if (b.liveCount !== a.liveCount) return b.liveCount - a.liveCount;
      return b.matchCount - a.matchCount;
    })
    .slice(0, 8);
}

function mergeAndSortMatches(lists: Match[][]): Match[] {
  const combined = lists.flat();
  const order = { LIVE: 0, UPCOMING: 1, FT: 2 };
  return combined.sort((a, b) => {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    if (a.status === 'UPCOMING') {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    }
    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
  });
}

export async function getLiveTickerData(force = false) {
  const [fb, nba, crik, f1] = await Promise.all([
    getFootballMatches(force),
    getNbaMatches(force),
    getCricketMatches(force),
    getF1Matches(force),
  ]);

  const matches = mergeAndSortMatches([crik.matches, fb.matches, nba.matches, f1.matches]);
  const liveCount = matches.filter((m) => m.status === 'LIVE').length;
  const quickLinks = buildDynamicQuickLinks(matches);

  return {
    matches,
    liveCount,
    quickLinks,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getSportsOverview(force = false): Promise<SportsOverviewResponse> {
  const [ticker, newsRes, fbStandings, nbaStandings, f1Standings] = await Promise.all([
    getLiveTickerData(force),
    getAllNews(undefined, force),
    getFootballStandings('eng.1', force),
    getNbaStandings(force),
    getF1Standings(force),
  ]);

  const standings = [
    ...fbStandings.tables.slice(0, 1),
    ...nbaStandings.tables.slice(0, 2),
    ...f1Standings.tables.slice(0, 1),
  ];

  return {
    matches: ticker.matches,
    liveCount: ticker.liveCount,
    quickLinks: ticker.quickLinks,
    articles: newsRes.articles,
    standings,
    fetchedAt: ticker.fetchedAt,
  };
}

export async function getSportPageData(
  sport: SportKey,
  leagueCode?: string,
  force = false
): Promise<SportPageResponse> {
  const newsRes = await getAllNews(sport, force);

  if (sport === 'football') {
    const activeLeague = leagueCode || 'eng.1';
    const [matchesRes, standingsRes] = await Promise.all([
      getFootballMatches(force),
      getFootballStandings(activeLeague, force),
    ]);
    return {
      sport,
      matches: matchesRes.matches,
      standings: standingsRes.tables,
      articles: newsRes.articles,
      leaguesAvailable: FOOTBALL_LEAGUES.map((l) => ({ code: l.code, name: l.name })),
      fetchedAt: matchesRes.fetchedAt,
    };
  }

  if (sport === 'nba') {
    const [matchesRes, standingsRes] = await Promise.all([
      getNbaMatches(force),
      getNbaStandings(force),
    ]);
    return {
      sport,
      matches: matchesRes.matches,
      standings: standingsRes.tables,
      articles: newsRes.articles,
      leaguesAvailable: [{ code: 'nba', name: 'NBA' }],
      fetchedAt: matchesRes.fetchedAt,
    };
  }

  if (sport === 'f1') {
    const [matchesRes, standingsRes] = await Promise.all([
      getF1Matches(force),
      getF1Standings(force),
    ]);
    return {
      sport,
      matches: matchesRes.matches,
      standings: standingsRes.tables,
      articles: newsRes.articles,
      leaguesAvailable: [{ code: 'f1', name: 'Formula 1 World Championship' }],
      fetchedAt: matchesRes.fetchedAt,
    };
  }

  // cricket
  const [matchesRes, standingsRes] = await Promise.all([
    getCricketMatches(force),
    getCricketStandings(force),
  ]);
  return {
    sport: 'cricket',
    matches: matchesRes.matches,
    standings: standingsRes.tables,
    articles: newsRes.articles,
    leaguesAvailable: [
      { code: 'intl-cricket', name: 'International' },
      { code: 'cricket', name: 'Domestic & Leagues' },
    ],
    fetchedAt: matchesRes.fetchedAt,
  };
}

export async function getMatchDetail(
  sport: SportKey,
  id: string,
  leagueCode?: string
): Promise<MatchDetail | null> {
  if (sport === 'football') return getFootballMatchDetail(id, leagueCode || 'eng.1');
  if (sport === 'nba') return getNbaMatchDetail(id);
  if (sport === 'f1') return getF1MatchDetail(id);
  if (sport === 'cricket') return getCricketMatchDetail(id);
  return null;
}
