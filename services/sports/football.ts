import { CACHE_TTL, fetchJsonWithTimeout, getOrFetch } from './cache.js';
import type { Match, MatchDetail, MatchStatus, StandingRow, StandingsTable } from './types.js';

export const FOOTBALL_LEAGUES = [
  { code: 'eng.1', fdCode: 'PL', apiId: 39, name: 'Premier League' },
  { code: 'uefa.champions', fdCode: 'CL', apiId: 2, name: 'UEFA Champions League' },
  { code: 'esp.1', fdCode: 'PD', apiId: 140, name: 'La Liga' },
  { code: 'ita.1', fdCode: 'SA', apiId: 135, name: 'Serie A' },
  { code: 'ger.1', fdCode: 'BL1', apiId: 78, name: 'Bundesliga' },
  { code: 'fra.1', fdCode: 'FL1', apiId: 61, name: 'Ligue 1' },
];

function mapEspnStatus(state?: string): MatchStatus {
  if (state === 'in') return 'LIVE';
  if (state === 'post') return 'FT';
  return 'UPCOMING';
}

function mapFdStatus(status?: string): MatchStatus {
  if (status === 'IN_PLAY' || status === 'PAUSED' || status === 'LIVE') return 'LIVE';
  if (status === 'FINISHED' || status === 'AWARDED') return 'FT';
  return 'UPCOMING';
}

async function fetchFromFootballDataApi(): Promise<Match[] | null> {
  const key = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!key) return null;

  try {
    const data = await fetchJsonWithTimeout<any>(
      'https://api.football-data.org/v4/matches',
      { 'X-Auth-Token': key },
      7000
    );
    const list = Array.isArray(data?.matches) ? data.matches : [];
    if (list.length === 0) return null;

    return list.map((m: any): Match => {
      const status = mapFdStatus(m.status);
      const hScore = m.score?.fullTime?.home ?? m.score?.halfTime?.home;
      const aScore = m.score?.fullTime?.away ?? m.score?.halfTime?.away;
      const matchedLeague = FOOTBALL_LEAGUES.find((l) => l.fdCode === m.competition?.code);
      return {
        id: `fd_${m.id}`,
        sport: 'football',
        league: m.competition?.name || 'Football',
        leagueCode: matchedLeague?.code || m.competition?.code || 'soccer',
        status,
        statusText:
          status === 'LIVE'
            ? m.minute
              ? `${m.minute}'`
              : 'LIVE'
            : status === 'FT'
              ? 'FT'
              : new Date(m.utcDate).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Kolkata',
                }),
        startTime: m.utcDate,
        venue: m.venue || undefined,
        home: {
          id: String(m.homeTeam?.id || ''),
          name: m.homeTeam?.name || m.homeTeam?.shortName || 'Home',
          shortName: m.homeTeam?.tla || m.homeTeam?.shortName || 'HOM',
          logo: m.homeTeam?.crest,
          score: hScore !== null && hScore !== undefined ? String(hScore) : undefined,
        },
        away: {
          id: String(m.awayTeam?.id || ''),
          name: m.awayTeam?.name || m.awayTeam?.shortName || 'Away',
          shortName: m.awayTeam?.tla || m.awayTeam?.shortName || 'AWY',
          logo: m.awayTeam?.crest,
          score: aScore !== null && aScore !== undefined ? String(aScore) : undefined,
        },
        sourceProvider: 'football-data.org',
      };
    });
  } catch (err) {
    console.warn('[Football] football-data.org failed, falling back to ESPN:', (err as Error).message);
    return null;
  }
}

async function fetchFromApiFootball(): Promise<Match[] | null> {
  const key = process.env.API_FOOTBALL_KEY?.trim();
  if (!key) return null;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const data = await fetchJsonWithTimeout<any>(
      `https://v3.football.api-sports.io/fixtures?date=${today}`,
      { 'x-apisports-key': key },
      7000
    );
    const list = Array.isArray(data?.response) ? data.response : [];
    if (list.length === 0) return null;

    const topIds = new Set(FOOTBALL_LEAGUES.map((l) => l.apiId));
    const filtered = list.filter((f: any) => topIds.has(f.league?.id)).slice(0, 30);
    const useList = filtered.length > 0 ? filtered : list.slice(0, 20);

    return useList.map((f: any): Match => {
      const short = f.fixture?.status?.short || '';
      const isLive = ['1H', 'HT', '2H', 'ET', 'P', 'LIVE'].includes(short);
      const isFt = ['FT', 'AET', 'PEN'].includes(short);
      const status: MatchStatus = isLive ? 'LIVE' : isFt ? 'FT' : 'UPCOMING';
      const matchedLeague = FOOTBALL_LEAGUES.find((l) => l.apiId === f.league?.id);
      return {
        id: `af_${f.fixture?.id}`,
        sport: 'football',
        league: f.league?.name || 'Football',
        leagueCode: matchedLeague?.code || String(f.league?.id || 'soccer'),
        status,
        statusText: isLive
          ? f.fixture?.status?.elapsed
            ? `${f.fixture.status.elapsed}'`
            : short
          : isFt
            ? short
            : 'Scheduled',
        startTime: f.fixture?.date,
        venue: f.fixture?.venue?.name,
        home: {
          id: String(f.teams?.home?.id || ''),
          name: f.teams?.home?.name || 'Home',
          shortName: (f.teams?.home?.name || 'HOM').slice(0, 3).toUpperCase(),
          logo: f.teams?.home?.logo,
          score: f.goals?.home !== null && f.goals?.home !== undefined ? String(f.goals.home) : undefined,
          isWinner: f.teams?.home?.winner === true,
        },
        away: {
          id: String(f.teams?.away?.id || ''),
          name: f.teams?.away?.name || 'Away',
          shortName: (f.teams?.away?.name || 'AWY').slice(0, 3).toUpperCase(),
          logo: f.teams?.away?.logo,
          score: f.goals?.away !== null && f.goals?.away !== undefined ? String(f.goals.away) : undefined,
          isWinner: f.teams?.away?.winner === true,
        },
        sourceProvider: 'API-Football',
      };
    });
  } catch (err) {
    console.warn('[Football] API-Football failed, falling back to ESPN:', (err as Error).message);
    return null;
  }
}

async function fetchEspnLeagueScoreboard(league: { code: string; name: string }): Promise<Match[]> {
  try {
    const data = await fetchJsonWithTimeout<any>(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.code}/scoreboard`,
      {},
      6500
    );
    const events = Array.isArray(data?.events) ? data.events : [];
    const leagueName = data?.leagues?.[0]?.name || league.name;

    return events
      .map((e: any): Match | null => {
        const comp = e.competitions?.[0];
        const competitors = comp?.competitors || [];
        const homeComp = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
        const awayComp = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];
        if (!homeComp || !awayComp) return null;

        const status = mapEspnStatus(e.status?.type?.state);
        const showScore = status === 'LIVE' || status === 'FT';

        return {
          id: e.id,
          sport: 'football',
          league: leagueName,
          leagueCode: league.code,
          status,
          statusText:
            status === 'LIVE'
              ? e.status?.displayClock || e.status?.type?.shortDetail || 'LIVE'
              : e.status?.type?.shortDetail || (status === 'FT' ? 'FT' : 'Scheduled'),
          startTime: e.date || new Date().toISOString(),
          venue: comp?.venue?.fullName,
          home: {
            id: homeComp.team?.id,
            name: homeComp.team?.displayName || homeComp.team?.name || 'Home',
            shortName: homeComp.team?.abbreviation || homeComp.team?.shortDisplayName || 'HOM',
            logo: homeComp.team?.logo,
            score: showScore ? String(homeComp.score ?? '0') : undefined,
            isWinner: homeComp.winner === true,
          },
          away: {
            id: awayComp.team?.id,
            name: awayComp.team?.displayName || awayComp.team?.name || 'Away',
            shortName: awayComp.team?.abbreviation || awayComp.team?.shortDisplayName || 'AWY',
            logo: awayComp.team?.logo,
            score: showScore ? String(awayComp.score ?? '0') : undefined,
            isWinner: awayComp.winner === true,
          },
          detailNote: comp?.headlines?.[0]?.shortLinkText || e.status?.type?.detail,
          sourceProvider: 'ESPN',
          externalUrl: e.links?.[0]?.href,
        };
      })
      .filter(Boolean) as Match[];
  } catch {
    return [];
  }
}

export async function getFootballMatches(force = false): Promise<{ matches: Match[]; fetchedAt: string }> {
  const result = await getOrFetch(
    'football:matches',
    CACHE_TTL.LIVE,
    async () => {
      const fd = await fetchFromFootballDataApi();
      if (fd && fd.length > 0) return fd;

      const af = await fetchFromApiFootball();
      if (af && af.length > 0) return af;

      const leagueResults = await Promise.all(
        FOOTBALL_LEAGUES.map((league) => fetchEspnLeagueScoreboard(league))
      );
      const merged = leagueResults.flat();

      // Sort: LIVE first, then UPCOMING soonest first, then FT most recent first
      const order: Record<MatchStatus, number> = { LIVE: 0, UPCOMING: 1, FT: 2 };
      return merged.sort((a, b) => {
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
    },
    force
  );
  return { matches: result.data, fetchedAt: result.fetchedAt };
}

export async function getFootballStandings(
  leagueCode = 'eng.1',
  force = false
): Promise<{ tables: StandingsTable[]; fetchedAt: string }> {
  const result = await getOrFetch(
    `football:standings:${leagueCode}`,
    CACHE_TTL.STANDINGS,
    async () => {
      try {
        const data = await fetchJsonWithTimeout<any>(
          `https://site.api.espn.com/apis/v2/sports/soccer/${leagueCode}/standings`,
          {},
          7000
        );
        const groups = Array.isArray(data?.children) ? data.children : [];
        const tables: StandingsTable[] = [];

        for (const group of groups) {
          const entries = group?.standings?.entries || [];
          const rows: StandingRow[] = entries
            .map((entry: any, idx: number): StandingRow => {
              const statMap: Record<string, string> = {};
              for (const s of entry.stats || []) {
                statMap[s.name] = s.displayValue ?? String(s.value ?? '');
              }
              return {
                rank: Number(statMap.rank || idx + 1),
                id: entry.team?.id,
                team: entry.team?.displayName || entry.team?.name || 'Team',
                teamShort: entry.team?.abbreviation,
                logo: entry.team?.logos?.[0]?.href,
                played: Number(statMap.gamesPlayed || 0),
                won: Number(statMap.wins || 0),
                drawn: Number(statMap.ties || 0),
                lost: Number(statMap.losses || 0),
                goalDiff: statMap.pointDifferential || '0',
                points: statMap.points || '0',
                note: entry.note?.description,
              };
            })
            .sort((a: StandingRow, b: StandingRow) => a.rank - b.rank);

          if (rows.length > 0) {
            const leagueMeta = FOOTBALL_LEAGUES.find((l) => l.code === leagueCode);
            tables.push({
              id: `football_${leagueCode}_${group.id || tables.length}`,
              sport: 'football',
              leagueCode,
              title: groups.length > 1 ? `${leagueMeta?.name || ''} · ${group.name}` : leagueMeta?.name || group.name || 'Standings',
              columns: [
                { key: 'played', label: 'P' },
                { key: 'won', label: 'W' },
                { key: 'drawn', label: 'D' },
                { key: 'lost', label: 'L' },
                { key: 'goalDiff', label: 'GD' },
                { key: 'points', label: 'PTS' },
              ],
              rows,
            });
          }
        }
        return tables;
      } catch {
        return [];
      }
    },
    force
  );
  return { tables: result.data, fetchedAt: result.fetchedAt };
}

export async function getFootballMatchDetail(
  eventId: string,
  leagueCode = 'eng.1'
): Promise<MatchDetail | null> {
  const { data } = await getOrFetch(
    `football:detail:${leagueCode}:${eventId}`,
    CACHE_TTL.DETAIL,
    async () => {
      // Try specified league, else scan leagues
      const leaguesToTry = [leagueCode, ...FOOTBALL_LEAGUES.map((l) => l.code).filter((c) => c !== leagueCode)];
      for (const code of leaguesToTry) {
        try {
          const summary = await fetchJsonWithTimeout<any>(
            `https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/summary?event=${encodeURIComponent(eventId)}`,
            {},
            6500
          );
          const comp = summary?.header?.competitions?.[0];
          if (!comp) continue;

          const competitors = comp.competitors || [];
          const homeComp = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
          const awayComp = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];
          const status = mapEspnStatus(comp.status?.type?.state);
          const showScore = status === 'LIVE' || status === 'FT';
          const leagueObj = FOOTBALL_LEAGUES.find((l) => l.code === code);

          const match: Match = {
            id: eventId,
            sport: 'football',
            league: summary?.header?.league?.name || leagueObj?.name || 'Football',
            leagueCode: code,
            status,
            statusText: comp.status?.type?.shortDetail || 'Scheduled',
            startTime: comp.date || new Date().toISOString(),
            venue: summary?.gameInfo?.venue?.fullName,
            home: {
              id: homeComp?.team?.id,
              name: homeComp?.team?.displayName || 'Home',
              shortName: homeComp?.team?.abbreviation || 'HOM',
              logo: homeComp?.team?.logos?.[0]?.href,
              score: showScore ? String(homeComp?.score ?? '0') : undefined,
              isWinner: homeComp?.winner === true,
            },
            away: {
              id: awayComp?.team?.id,
              name: awayComp?.team?.displayName || 'Away',
              shortName: awayComp?.team?.abbreviation || 'AWY',
              logo: awayComp?.team?.logos?.[0]?.href,
              score: showScore ? String(awayComp?.score ?? '0') : undefined,
              isWinner: awayComp?.winner === true,
            },
            sourceProvider: 'ESPN',
          };

          const keyEvents = Array.isArray(summary?.keyEvents) ? summary.keyEvents : [];
          const timeline = keyEvents.map((ev: any) => ({
            time: ev.clock?.displayValue || '',
            text: ev.text || ev.shortText || ev.type?.text || '',
            team: ev.team?.displayName,
            type: ev.type?.text,
          }));

          const boxTeams = Array.isArray(summary?.boxscore?.teams) ? summary.boxscore.teams : [];
          const homeBox = boxTeams.find((t: any) => t.team?.id === homeComp?.team?.id) || boxTeams[0];
          const awayBox = boxTeams.find((t: any) => t.team?.id === awayComp?.team?.id) || boxTeams[1];
          const stats = (homeBox?.statistics || []).map((st: any, i: number) => ({
            label: st.label || st.name,
            homeValue: st.displayValue || '-',
            awayValue: awayBox?.statistics?.[i]?.displayValue || '-',
          }));

          const rosters = Array.isArray(summary?.rosters) ? summary.rosters : [];
          const lineups = rosters.map((r: any) => ({
            team: r.team?.displayName || 'Team',
            logo: r.team?.logos?.[0]?.href,
            players: (r.roster || []).slice(0, 18).map((p: any) => ({
              name: p.athlete?.displayName || p.athlete?.shortName || 'Player',
              jersey: p.jersey,
              position: p.position?.abbreviation || p.position?.name,
              starter: p.starter === true,
            })),
          }));

          return {
            match,
            summary: summary?.article?.headline || summary?.notes?.[0]?.text,
            timeline,
            stats,
            lineups,
          } satisfies MatchDetail;
        } catch {
          // try next league
        }
      }
      return null;
    }
  );
  return data;
}
