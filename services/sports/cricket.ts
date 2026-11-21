import { XMLParser } from 'fast-xml-parser';
import { CACHE_TTL, fetchJsonWithTimeout, fetchTextWithTimeout, getOrFetch } from './cache.js';
import { queryGroundedJson } from './gemini.js';
import type { Match, MatchDetail, MatchStatus, StandingRow, StandingsTable } from './types.js';

const xmlParser = new XMLParser({ ignoreAttributes: false, trimValues: true });

const COUNTRY_FLAG_MAP: Record<string, string> = {
  india: 'https://flagcdn.com/w80/in.png',
  australia: 'https://flagcdn.com/w80/au.png',
  england: 'https://flagcdn.com/w80/gb-eng.png',
  'new zealand': 'https://flagcdn.com/w80/nz.png',
  'south africa': 'https://flagcdn.com/w80/za.png',
  pakistan: 'https://flagcdn.com/w80/pk.png',
  'sri lanka': 'https://flagcdn.com/w80/lk.png',
  bangladesh: 'https://flagcdn.com/w80/bd.png',
  afghanistan: 'https://flagcdn.com/w80/af.png',
  ireland: 'https://flagcdn.com/w80/ie.png',
  zimbabwe: 'https://flagcdn.com/w80/zw.png',
  netherlands: 'https://flagcdn.com/w80/nl.png',
  scotland: 'https://flagcdn.com/w80/gb-sct.png',
  nepal: 'https://flagcdn.com/w80/np.png',
  usa: 'https://flagcdn.com/w80/us.png',
  'united states': 'https://flagcdn.com/w80/us.png',
  uae: 'https://flagcdn.com/w80/ae.png',
  oman: 'https://flagcdn.com/w80/om.png',
  namibia: 'https://flagcdn.com/w80/na.png',
};

function getCricketLogo(teamName: string): string | undefined {
  const lower = teamName.toLowerCase();
  for (const [country, url] of Object.entries(COUNTRY_FLAG_MAP)) {
    if (lower.includes(country)) return url;
  }
  return undefined;
}

function makeShortName(name: string): string {
  const clean = name.trim();
  const known: Record<string, string> = {
    india: 'IND',
    australia: 'AUS',
    england: 'ENG',
    'new zealand': 'NZ',
    'south africa': 'SA',
    pakistan: 'PAK',
    'sri lanka': 'SL',
    bangladesh: 'BAN',
    'west indies': 'WI',
    afghanistan: 'AFG',
    ireland: 'IRE',
    zimbabwe: 'ZIM',
    'india women': 'IND-W',
    'australia women': 'AUS-W',
    'england women': 'ENG-W',
  };
  const low = clean.toLowerCase();
  if (known[low]) return known[low];
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase();
}

function splitTeamAndScore(rawSide: string): { name: string; score?: string; batting: boolean } {
  const trimmed = rawSide.trim();
  const batting = trimmed.includes('*');
  const withoutStar = trimmed.replace(/\*/g, '').trim();
  const scoreMatch = withoutStar.match(/^(.*?)\s+(\d[\d/&\s.*()a-zA-Z]*)$/);
  if (scoreMatch && /\d+\/\d+|\d+\s+all|\d+$/.test(scoreMatch[2].trim())) {
    return {
      name: scoreMatch[1].trim(),
      score: scoreMatch[2].trim(),
      batting,
    };
  }
  return { name: withoutStar, batting };
}

function mapCricketDataMatch(m: any, seriesTitle?: string): Match {
  const t1 = m.teamInfo?.[0] || { name: m.teams?.[0] || 'Team 1' };
  const t2 = m.teamInfo?.[1] || { name: m.teams?.[1] || 'Team 2' };
  const s1 = m.score?.find((s: any) =>
    s.inning?.toLowerCase().includes((t1.name || '').toLowerCase())
  );
  const s2 = m.score?.find((s: any) =>
    s.inning?.toLowerCase().includes((t2.name || '').toLowerCase())
  );

  const formatScore = (s: any) => (s ? `${s.r}/${s.w} (${s.o} ov)` : undefined);
  const status: MatchStatus =
    m.matchStarted && !m.matchEnded ? 'LIVE' : m.matchEnded ? 'FT' : 'UPCOMING';

  const isIntl = Boolean(getCricketLogo(t1.name || '') || getCricketLogo(t2.name || ''));

  return {
    id: `cricapi_${m.id}`,
    sport: 'cricket',
    league:
      seriesTitle ||
      (m.matchType ? `Cricket · ${String(m.matchType).toUpperCase()}` : 'Cricket'),
    leagueCode: isIntl ? 'intl-cricket' : 'cricket',
    status,
    statusText:
      m.status || (status === 'LIVE' ? 'LIVE' : status === 'FT' ? 'Result' : 'Scheduled'),
    startTime: m.dateTimeGMT || m.date || new Date().toISOString(),
    venue: m.venue,
    home: {
      name: t1.name,
      shortName: t1.shortname || makeShortName(t1.name),
      logo: t1.img || getCricketLogo(t1.name),
      score: formatScore(s1),
    },
    away: {
      name: t2.name,
      shortName: t2.shortname || makeShortName(t2.name),
      logo: t2.img || getCricketLogo(t2.name),
      score: formatScore(s2),
    },
    detailNote: m.name || m.status,
    sourceProvider: 'CricketData.org',
  };
}

async function fetchFromCricketDataOrg(): Promise<Match[] | null> {
  const apiKey = process.env.CRICKETDATA_API_KEY?.trim();
  if (!apiKey) return null;

  const seriesId = process.env.CRICKETDATA_SERIES_ID?.trim();

  try {
    const requests: Promise<any>[] = [
      fetchJsonWithTimeout<any>(
        `https://api.cricapi.com/v1/currentMatches?apikey=${encodeURIComponent(apiKey)}&offset=0`,
        {},
        7000
      ).catch(() => null),
      fetchJsonWithTimeout<any>(
        `https://api.cricapi.com/v1/matches?apikey=${encodeURIComponent(apiKey)}&offset=0`,
        {},
        7000
      ).catch(() => null),
    ];

    if (seriesId) {
      requests.push(
        fetchJsonWithTimeout<any>(
          `https://api.cricapi.com/v1/series_info?apikey=${encodeURIComponent(apiKey)}&offset=0&id=${encodeURIComponent(seriesId)}`,
          {},
          7000
        ).catch(() => null)
      );
    }

    const [currentRes, matchesRes, seriesRes] = await Promise.all(requests);
    const merged: Match[] = [];
    const seen = new Set<string>();

    const addList = (items: any[], seriesName?: string) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (!item?.id || seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push(mapCricketDataMatch(item, seriesName));
      }
    };

    if (seriesRes?.status === 'success' && seriesRes?.data?.matchList) {
      addList(seriesRes.data.matchList, seriesRes.data.info?.name);
    }
    if (currentRes?.status === 'success') {
      addList(currentRes.data);
    }
    if (matchesRes?.status === 'success') {
      addList(matchesRes.data);
    }

    return merged.length > 0 ? merged.slice(0, 30) : null;
  } catch (err) {
    console.warn('[Cricket] CricketData.org failed:', (err as Error).message);
    return null;
  }
}

async function fetchFromSportmonksCricket(): Promise<Match[] | null> {
  const token = process.env.SPORTMONKS_CRICKET_TOKEN?.trim();
  if (!token) return null;

  try {
    const data = await fetchJsonWithTimeout<any>(
      `https://cricket.sportmonks.com/api/v2.0/livescores?api_token=${encodeURIComponent(token)}&include=localteam,visitorteam,runs,league,venue`,
      {},
      7000
    );
    const list = Array.isArray(data?.data) ? data.data : [];
    if (list.length === 0) return null;

    return list.map((m: any): Match => {
      const localRuns = (m.runs || []).filter((r: any) => r.team_id === m.localteam_id).pop();
      const visitRuns = (m.runs || []).filter((r: any) => r.team_id === m.visitorteam_id).pop();
      const status: MatchStatus = m.live ? 'LIVE' : m.status === 'Finished' ? 'FT' : 'UPCOMING';

      return {
        id: `sm_${m.id}`,
        sport: 'cricket',
        league: m.league?.name || 'Cricket',
        leagueCode: 'cricket',
        status,
        statusText: m.note || m.status || 'Live',
        startTime: m.starting_at || new Date().toISOString(),
        venue: m.venue?.name,
        home: {
          name: m.localteam?.name || 'Home',
          shortName: m.localteam?.code || makeShortName(m.localteam?.name || 'HOM'),
          logo: m.localteam?.image_path || getCricketLogo(m.localteam?.name || ''),
          score: localRuns ? `${localRuns.score}/${localRuns.wickets} (${localRuns.overs})` : undefined,
        },
        away: {
          name: m.visitorteam?.name || 'Away',
          shortName: m.visitorteam?.code || makeShortName(m.visitorteam?.name || 'AWY'),
          logo: m.visitorteam?.image_path || getCricketLogo(m.visitorteam?.name || ''),
          score: visitRuns ? `${visitRuns.score}/${visitRuns.wickets} (${visitRuns.overs})` : undefined,
        },
        detailNote: m.note,
        sourceProvider: 'Sportmonks',
      };
    });
  } catch (err) {
    console.warn('[Cricket] Sportmonks failed:', (err as Error).message);
    return null;
  }
}

async function fetchCricinfoLiveRss(): Promise<Match[]> {
  try {
    const xml = await fetchTextWithTimeout('https://static.cricinfo.com/rss/livescores.xml', {}, 7000);
    const parsed = xmlParser.parse(xml);
    const pubDateStr = parsed?.rss?.channel?.pubDate;
    const pubTime = pubDateStr ? new Date(pubDateStr).toISOString() : new Date().toISOString();
    const rawItems = parsed?.rss?.channel?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items
      .map((item: any, idx: number): Match | null => {
        const title = String(item.title || '').trim();
        if (!title.includes(' v ')) return null;
        const [leftRaw, rightRaw] = title.split(' v ');
        const left = splitTeamAndScore(leftRaw);
        const right = splitTeamAndScore(rightRaw);

        const link = String(item.link || item.guid || '').trim();
        const idMatch = link.match(/match\/(\d+)\.html/);
        const matchId = idMatch ? `ci_${idMatch[1]}` : `ci_rss_${idx}`;

        const hasLiveInnings = left.batting || right.batting;
        const hasAnyScore = Boolean(left.score || right.score);
        const status: MatchStatus = hasLiveInnings ? 'LIVE' : hasAnyScore ? 'FT' : 'UPCOMING';

        const isInternational = Boolean(getCricketLogo(left.name) || getCricketLogo(right.name));

        return {
          id: matchId,
          sport: 'cricket',
          league: isInternational ? 'International Cricket' : 'Domestic & Franchise Cricket',
          leagueCode: isInternational ? 'intl-cricket' : 'cricket',
          status,
          statusText: status === 'LIVE' ? 'In Progress' : status === 'FT' ? 'Result / Stumps' : 'Scheduled',
          startTime: pubTime,
          home: {
            name: left.name,
            shortName: makeShortName(left.name),
            logo: getCricketLogo(left.name),
            score: left.score ? (left.batting ? `${left.score} *` : left.score) : undefined,
          },
          away: {
            name: right.name,
            shortName: makeShortName(right.name),
            logo: getCricketLogo(right.name),
            score: right.score ? (right.batting ? `${right.score} *` : right.score) : undefined,
          },
          detailNote: title,
          sourceProvider: 'ESPNCricinfo RSS',
          externalUrl: link || undefined,
        };
      })
      .filter(Boolean) as Match[];
  } catch (err) {
    console.warn('[Cricket] Cricinfo RSS failed:', (err as Error).message);
    return [];
  }
}

export async function getCricketMatches(force = false): Promise<{ matches: Match[]; fetchedAt: string }> {
  const result = await getOrFetch(
    'cricket:matches',
    CACHE_TTL.LIVE,
    async () => {
      const [cricApi, sportmonks, cricinfoRss] = await Promise.all([
        fetchFromCricketDataOrg(),
        fetchFromSportmonksCricket(),
        fetchCricinfoLiveRss(),
      ]);

      const primary = cricApi || sportmonks || cricinfoRss;

      const order: Record<MatchStatus, number> = { LIVE: 0, UPCOMING: 1, FT: 2 };
      return [...primary].sort((a, b) => {
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        const aIntl = a.leagueCode === 'intl-cricket' ? 0 : 1;
        const bIntl = b.leagueCode === 'intl-cricket' ? 0 : 1;
        return aIntl - bIntl;
      });
    },
    force
  );
  return { matches: result.data, fetchedAt: result.fetchedAt };
}

export async function getCricketStandings(force = false): Promise<{ tables: StandingsTable[]; fetchedAt: string }> {
  const result = await getOrFetch<StandingsTable[]>(
    'cricket:standings',
    CACHE_TTL.STANDINGS,
    async (): Promise<StandingsTable[]> => {
      const apiKey = process.env.CRICKETDATA_API_KEY?.trim();
      const seriesId = process.env.CRICKETDATA_SERIES_ID?.trim();

      // 1. If CricketData API key & Series ID are set, try series_points first
      if (apiKey && seriesId) {
        try {
          const pts = await fetchJsonWithTimeout<any>(
            `https://api.cricapi.com/v1/series_points?apikey=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(seriesId)}`,
            {},
            7000
          );
          if (pts?.status === 'success' && Array.isArray(pts.data) && pts.data.length > 0) {
            const rows: StandingRow[] = pts.data.map((r: any, idx: number) => ({
              rank: idx + 1,
              team: r.teamname || r.shortname || 'Team',
              teamShort: r.shortname || makeShortName(r.teamname || 'TM'),
              logo: r.img || getCricketLogo(r.teamname || ''),
              played: Number(r.matches || 0),
              won: Number(r.wins || 0),
              lost: Number(r.loss || 0),
              goalDiff: String(r.nr ?? 0),
              points: Number(r.wins || 0) * 2 + Number(r.ties || 0) + Number(r.nr || 0),
            }));
            return [
              {
                id: `cricket_series_${seriesId}`,
                sport: 'cricket',
                leagueCode: 'intl-cricket',
                title: 'Series Points Table',
                columns: [
                  { key: 'played', label: 'P' },
                  { key: 'won', label: 'W' },
                  { key: 'lost', label: 'L' },
                  { key: 'points', label: 'PTS' },
                ],
                rows,
              },
            ];
          }
        } catch {
          // continue to grounded fallback
        }
      }

      // 2. Optional Gemini grounded ICC WTC standings
      const grounded = await queryGroundedJson<{
        title: string;
        rows: { rank: number; team: string; played: number; won: number; lost: number; points: string }[];
      }[]>(
        `Return the current ICC World Test Championship (2025-27 cycle) standings table as a JSON array with 1 item:
        [{"title": "ICC World Test Championship Standings", "rows": [{"rank": 1, "team": "India", "played": 10, "won": 7, "lost": 2, "points": "68.5%"}]}].
        Use verified live Google Search data only.`
      );

      if (Array.isArray(grounded) && grounded.length > 0 && Array.isArray(grounded[0]?.rows)) {
        return grounded
          .filter((g) => g.rows && g.rows.length > 0)
          .map((g, idx): StandingsTable => ({
            id: `cricket_grounded_${idx}`,
            sport: 'cricket',
            leagueCode: 'intl-cricket',
            title: g.title || 'ICC Championship Standings',
            columns: [
              { key: 'played', label: 'P' },
              { key: 'won', label: 'W' },
              { key: 'lost', label: 'L' },
              { key: 'points', label: 'PCT/PTS' },
            ],
            rows: g.rows.map((r) => ({
              rank: r.rank,
              team: r.team,
              teamShort: makeShortName(r.team),
              logo: getCricketLogo(r.team),
              played: r.played || 0,
              won: r.won || 0,
              lost: r.lost || 0,
              points: r.points ?? 0,
            })),
          }));
      }

      return [];
    },
    force
  );
  return { tables: result.data, fetchedAt: result.fetchedAt };
}

export async function getCricketMatchDetail(id: string): Promise<MatchDetail | null> {
  const { matches } = await getCricketMatches();
  let match = matches.find((m) => m.id === id);

  const apiKey = process.env.CRICKETDATA_API_KEY?.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const rawId = id.startsWith('cricapi_') ? id.replace('cricapi_', '') : isUuid ? id : null;

  if (apiKey && rawId) {
    try {
      const [scorecardRes, infoRes] = await Promise.all([
        fetchJsonWithTimeout<any>(
          `https://api.cricapi.com/v1/match_scorecard?apikey=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(rawId)}`,
          {},
          7000
        ).catch(() => null),
        fetchJsonWithTimeout<any>(
          `https://api.cricapi.com/v1/match_info?apikey=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(rawId)}`,
          {},
          7000
        ).catch(() => null),
      ]);

      const sc = scorecardRes?.data || infoRes?.data;
      if (sc) {
        if (!match) {
          match = mapCricketDataMatch(sc);
        }

        const lineups = Array.isArray(sc.scorecard)
          ? sc.scorecard.map((inn: any) => ({
              team: inn.inning || 'Innings',
              players: (inn.batting || []).map((b: any) => ({
                name: b.batsman?.name || 'Batter',
                position: b['dismissal-text'] || 'not out',
                stats: `${b.r ?? 0} (${b.b ?? 0}b · 4s:${b['4s'] ?? 0} 6s:${b['6s'] ?? 0})`,
              })),
            }))
          : [];

        return {
          match,
          summary: sc.status || match.detailNote,
          timeline: [],
          stats: [
            {
              label: 'Format',
              homeValue: String(sc.matchType || '-').toUpperCase(),
              awayValue: sc.venue || '-',
            },
            ...(sc.tossWinner
              ? [{ label: 'Toss', homeValue: sc.tossWinner, awayValue: sc.tossChoice || '-' }]
              : []),
          ],
          lineups,
        };
      }
    } catch {
      // fall through to cached match summary
    }
  }

  if (!match) return null;

  return {
    match,
    summary: match.detailNote || `${match.home.name} vs ${match.away.name}`,
    timeline: [],
    stats: [
      { label: 'League / Series', homeValue: match.league, awayValue: match.statusText },
      { label: 'Source', homeValue: match.sourceProvider, awayValue: match.venue || 'International' },
    ],
    lineups: [],
  };
}
