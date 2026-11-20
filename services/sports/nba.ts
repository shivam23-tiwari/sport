import { CACHE_TTL, fetchJsonWithTimeout, getOrFetch } from './cache.js';
import type { Match, MatchDetail, MatchStatus, StandingRow, StandingsTable } from './types.js';

function mapEspnStatus(state?: string): MatchStatus {
  if (state === 'in') return 'LIVE';
  if (state === 'post') return 'FT';
  return 'UPCOMING';
}

export async function getNbaMatches(force = false): Promise<{ matches: Match[]; fetchedAt: string }> {
  const result = await getOrFetch(
    'nba:matches',
    CACHE_TTL.LIVE,
    async () => {
      // Optional BallDontLie support if BALLDONTLIE_API_KEY is configured
      const bdlKey = process.env.BALLDONTLIE_API_KEY?.trim();
      let espnMatches: Match[] = [];

      try {
        const data = await fetchJsonWithTimeout<any>(
          'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
          {},
          7000
        );
        const events = Array.isArray(data?.events) ? data.events : [];
        espnMatches = events
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
              sport: 'nba',
              league: 'NBA',
              leagueCode: 'nba',
              status,
              statusText: e.status?.type?.shortDetail || (status === 'FT' ? 'Final' : 'Scheduled'),
              startTime: e.date || new Date().toISOString(),
              venue: comp?.venue?.fullName,
              home: {
                id: homeComp.team?.id,
                name: homeComp.team?.displayName || homeComp.team?.name || 'Home',
                shortName: homeComp.team?.abbreviation || 'HOM',
                logo: homeComp.team?.logo,
                score: showScore ? String(homeComp.score ?? '0') : undefined,
                record: homeComp.records?.[0]?.summary,
                isWinner: homeComp.winner === true,
              },
              away: {
                id: awayComp.team?.id,
                name: awayComp.team?.displayName || awayComp.team?.name || 'Away',
                shortName: awayComp.team?.abbreviation || 'AWY',
                logo: awayComp.team?.logo,
                score: showScore ? String(awayComp.score ?? '0') : undefined,
                record: awayComp.records?.[0]?.summary,
                isWinner: awayComp.winner === true,
              },
              detailNote: comp?.headlines?.[0]?.shortLinkText || comp?.notes?.[0]?.headline,
              sourceProvider: 'ESPN',
              externalUrl: e.links?.[0]?.href,
            };
          })
          .filter(Boolean) as Match[];
      } catch (err) {
        console.warn('[NBA] ESPN scoreboard error:', (err as Error).message);
      }

      if (espnMatches.length > 0) {
        const order: Record<MatchStatus, number> = { LIVE: 0, UPCOMING: 1, FT: 2 };
        return espnMatches.sort((a, b) => {
          if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        });
      }

      if (bdlKey) {
        try {
          const today = new Date().toISOString().slice(0, 10);
          const bdl = await fetchJsonWithTimeout<any>(
            `https://api.balldontlie.io/v1/games?dates[]=${today}`,
            { Authorization: bdlKey },
            7000
          );
          const games = Array.isArray(bdl?.data) ? bdl.data : [];
          return games.map((g: any): Match => {
            const isFt = g.status === 'Final';
            const isLive = g.period > 0 && !isFt;
            const status: MatchStatus = isLive ? 'LIVE' : isFt ? 'FT' : 'UPCOMING';
            return {
              id: `bdl_${g.id}`,
              sport: 'nba',
              league: 'NBA',
              leagueCode: 'nba',
              status,
              statusText: g.time || g.status || 'Scheduled',
              startTime: g.datetime || g.date,
              home: {
                id: String(g.home_team?.id || ''),
                name: g.home_team?.full_name || 'Home',
                shortName: g.home_team?.abbreviation || 'HOM',
                score: status !== 'UPCOMING' ? String(g.home_team_score ?? 0) : undefined,
              },
              away: {
                id: String(g.visitor_team?.id || ''),
                name: g.visitor_team?.full_name || 'Away',
                shortName: g.visitor_team?.abbreviation || 'AWY',
                score: status !== 'UPCOMING' ? String(g.visitor_team_score ?? 0) : undefined,
              },
              sourceProvider: 'balldontlie',
            };
          });
        } catch {
          return [];
        }
      }

      return [];
    },
    force
  );

  return { matches: result.data, fetchedAt: result.fetchedAt };
}

export async function getNbaStandings(force = false): Promise<{ tables: StandingsTable[]; fetchedAt: string }> {
  const result = await getOrFetch(
    'nba:standings',
    CACHE_TTL.STANDINGS,
    async () => {
      try {
        const data = await fetchJsonWithTimeout<any>(
          'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings',
          {},
          7000
        );
        const conferences = Array.isArray(data?.children) ? data.children : [];
        return conferences
          .map((conf: any, idx: number): StandingsTable => {
            const entries = conf?.standings?.entries || [];
            const rows: StandingRow[] = entries
              .map((entry: any, i: number): StandingRow => {
                const statMap: Record<string, string> = {};
                for (const s of entry.stats || []) {
                  statMap[s.name] = s.displayValue ?? String(s.value ?? '');
                }
                const wins = Number(statMap.wins || 0);
                const losses = Number(statMap.losses || 0);
                return {
                  rank: Number(statMap.playoffSeed || i + 1),
                  id: entry.team?.id,
                  team: entry.team?.displayName || entry.team?.name || 'Team',
                  teamShort: entry.team?.abbreviation,
                  logo: entry.team?.logos?.[0]?.href,
                  played: wins + losses,
                  won: wins,
                  lost: losses,
                  goalDiff: statMap.differential || '0',
                  points: statMap.winPercent || '.000',
                  note: statMap.gamesBehind && statMap.gamesBehind !== '-' ? `GB ${statMap.gamesBehind}` : undefined,
                };
              })
              .sort((a: StandingRow, b: StandingRow) => a.rank - b.rank);

            return {
              id: `nba_conf_${conf.id || idx}`,
              sport: 'nba',
              leagueCode: 'nba',
              title: conf.name || 'NBA Standings',
              columns: [
                { key: 'won', label: 'W' },
                { key: 'lost', label: 'L' },
                { key: 'goalDiff', label: 'DIFF' },
                { key: 'points', label: 'PCT' },
              ],
              rows,
            };
          })
          .filter((t: StandingsTable) => t.rows.length > 0);
      } catch {
        return [];
      }
    },
    force
  );
  return { tables: result.data, fetchedAt: result.fetchedAt };
}

export async function getNbaMatchDetail(eventId: string): Promise<MatchDetail | null> {
  const { data } = await getOrFetch(
    `nba:detail:${eventId}`,
    CACHE_TTL.DETAIL,
    async () => {
      try {
        const summary = await fetchJsonWithTimeout<any>(
          `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${encodeURIComponent(eventId)}`,
          {},
          7000
        );
        const comp = summary?.header?.competitions?.[0];
        if (!comp) return null;

        const competitors = comp.competitors || [];
        const homeComp = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
        const awayComp = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];
        const status = mapEspnStatus(comp.status?.type?.state);
        const showScore = status === 'LIVE' || status === 'FT';

        const match: Match = {
          id: eventId,
          sport: 'nba',
          league: 'NBA',
          leagueCode: 'nba',
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

        const plays = Array.isArray(summary?.plays) ? summary.plays : [];
        const timeline = plays
          .filter((p: any) => p.scoringPlay || p.scoreValue > 0)
          .slice(-15)
          .reverse()
          .map((p: any) => ({
            time: `Q${p.period?.number || ''} ${p.clock?.displayValue || ''}`.trim(),
            text: p.text || '',
            type: p.type?.text,
          }));

        const boxTeams = Array.isArray(summary?.boxscore?.teams) ? summary.boxscore.teams : [];
        const homeBox = boxTeams.find((t: any) => t.team?.id === homeComp?.team?.id) || boxTeams[0];
        const awayBox = boxTeams.find((t: any) => t.team?.id === awayComp?.team?.id) || boxTeams[1];
        const stats = (homeBox?.statistics || []).slice(0, 14).map((st: any, i: number) => ({
          label: st.label || st.name,
          homeValue: st.displayValue || '-',
          awayValue: awayBox?.statistics?.[i]?.displayValue || '-',
        }));

        const boxPlayers = Array.isArray(summary?.boxscore?.players) ? summary.boxscore.players : [];
        const lineups = boxPlayers.map((teamBlock: any) => {
          const statGroup = teamBlock?.statistics?.[0];
          const labels: string[] = statGroup?.labels || [];
          const ptsIdx = labels.indexOf('PTS');
          const rebIdx = labels.indexOf('REB');
          const astIdx = labels.indexOf('AST');
          const players = (statGroup?.athletes || []).slice(0, 12).map((a: any) => {
            const vals = a.stats || [];
            const lineStats =
              ptsIdx >= 0
                ? `${vals[ptsIdx] ?? 0} PTS · ${vals[rebIdx] ?? 0} REB · ${vals[astIdx] ?? 0} AST`
                : vals.slice(0, 3).join(' / ');
            return {
              name: a.athlete?.displayName || 'Player',
              jersey: a.athlete?.jersey,
              position: a.athlete?.position?.abbreviation,
              stats: a.didNotPlay ? 'DNP' : lineStats,
              starter: a.starter === true,
            };
          });
          return {
            team: teamBlock.team?.displayName || 'Team',
            logo: teamBlock.team?.logo,
            players,
          };
        });

        return {
          match,
          summary: summary?.article?.headline || summary?.gameInfo?.attendance ? `Attendance: ${summary.gameInfo.attendance}` : undefined,
          timeline,
          stats,
          lineups,
        } satisfies MatchDetail;
      } catch {
        return null;
      }
    }
  );
  return data;
}
