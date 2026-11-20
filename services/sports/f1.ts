import { CACHE_TTL, fetchJsonWithTimeout, getOrFetch } from './cache.js';
import type { Match, MatchDetail, MatchStatus, StandingRow, StandingsTable } from './types.js';

const F1_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/3/33/F1.svg';

export async function getF1Matches(force = false): Promise<{ matches: Match[]; fetchedAt: string }> {
  const result = await getOrFetch(
    'f1:matches',
    CACHE_TTL.LIVE,
    async () => {
      const now = Date.now();
      const year = new Date().getUTCFullYear();
      const matches: Match[] = [];

      // 1. OpenF1: Latest / Active Session & Live Positions
      try {
        const [sessions, drivers, positions] = await Promise.all([
          fetchJsonWithTimeout<any[]>(`https://api.openf1.org/v1/sessions?year=${year}`, {}, 7000),
          fetchJsonWithTimeout<any[]>('https://api.openf1.org/v1/drivers?session_key=latest', {}, 7000).catch(() => []),
          fetchJsonWithTimeout<any[]>('https://api.openf1.org/v1/position?session_key=latest', {}, 7000).catch(() => []),
        ]);

        if (Array.isArray(sessions) && sessions.length > 0) {
          // Find current live session or most recent session within 48h
          const latestPosByDriver = new Map<number, number>();
          if (Array.isArray(positions)) {
            for (const p of positions) {
              latestPosByDriver.set(p.driver_number, p.position);
            }
          }

          const driverMap = new Map<number, any>();
          if (Array.isArray(drivers)) {
            for (const d of drivers) {
              driverMap.set(d.driver_number, d);
            }
          }

          const leaderboard = Array.from(latestPosByDriver.entries())
            .sort((a, b) => a[1] - b[1])
            .slice(0, 3)
            .map(([num, pos]) => {
              const drv = driverMap.get(num);
              return { pos, drv };
            });

          const sortedSessions = [...sessions]
            .filter((s) => !s.is_cancelled)
            .sort((a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime());

          const liveSession = sortedSessions.find((s) => {
            const start = new Date(s.date_start).getTime();
            const end = new Date(s.date_end).getTime();
            return now >= start - 5 * 60_000 && now <= end + 15 * 60_000;
          });

          const latestCompleted = sortedSessions.find((s) => new Date(s.date_end).getTime() < now);
          const featuredSession = liveSession || latestCompleted;

          if (featuredSession) {
            const p1 = leaderboard[0];
            const p2 = leaderboard[1];
            const isLive = Boolean(liveSession);
            matches.push({
              id: `openf1_${featuredSession.session_key}`,
              sport: 'f1',
              league: `${featuredSession.location || featuredSession.country_name} GP`,
              leagueCode: 'f1',
              status: isLive ? 'LIVE' : 'FT',
              statusText: isLive
                ? `${featuredSession.session_name} · LIVE`
                : `${featuredSession.session_name} · Complete`,
              startTime: featuredSession.date_start,
              venue: `${featuredSession.circuit_short_name}, ${featuredSession.country_name}`,
              home: {
                name: p1?.drv?.full_name || p1?.drv?.broadcast_name || `${featuredSession.location} GP`,
                shortName: p1?.drv?.name_acronym || 'P1',
                logo: F1_LOGO,
                score: p1 ? 'P1' : undefined,
                subScore: p1?.drv?.team_name,
                isWinner: !isLive && Boolean(p1),
              },
              away: {
                name: p2?.drv?.full_name || p2?.drv?.broadcast_name || featuredSession.session_name,
                shortName: p2?.drv?.name_acronym || 'P2',
                logo: F1_LOGO,
                score: p2 ? 'P2' : undefined,
                subScore: p2?.drv?.team_name,
              },
              detailNote:
                leaderboard.length > 0
                  ? leaderboard.map((l) => `P${l.pos} ${l.drv?.name_acronym || l.drv?.last_name || ''}`).join(' · ')
                  : `${featuredSession.session_name} at ${featuredSession.circuit_short_name}`,
              sourceProvider: 'OpenF1',
            });
          }
        }
      } catch (err) {
        console.warn('[F1] OpenF1 fetch note:', (err as Error).message);
      }

      // 2. Jolpica-F1: Season Calendar (Upcoming Races & Recent Grand Prix Results)
      try {
        const calendar = await fetchJsonWithTimeout<any>(
          `https://api.jolpi.ca/ergast/f1/${year}.json`,
          {},
          7000
        );
        const races: any[] = calendar?.MRData?.RaceTable?.Races || [];

        for (const r of races) {
          const raceIso = `${r.date}T${r.time || '14:00:00Z'}`;
          const raceStart = new Date(raceIso).getTime();
          const raceEnd = raceStart + 2.5 * 3600_000;

          // Include upcoming races in next 45 days or recently completed races within last 21 days
          const diffDays = (raceStart - now) / (1000 * 3600 * 24);
          if (diffDays < -21 || diffDays > 45) continue;

          const status: MatchStatus =
            now >= raceStart && now <= raceEnd ? 'LIVE' : now > raceEnd ? 'FT' : 'UPCOMING';

          // Check if this race weekend already has OpenF1 entry at top for exact same location if LIVE
          matches.push({
            id: `jolpica_${r.season}_${r.round}`,
            sport: 'f1',
            league: `Round ${r.round} · Formula 1`,
            leagueCode: 'f1',
            status,
            statusText: status === 'LIVE' ? 'RACE LIVE' : status === 'FT' ? 'Race Complete' : 'Grand Prix',
            startTime: raceIso,
            venue: `${r.Circuit?.circuitName || ''}, ${r.Circuit?.Location?.country || ''}`,
            home: {
              name: r.raceName,
              shortName: (r.Circuit?.Location?.country || 'F1').slice(0, 3).toUpperCase(),
              logo: F1_LOGO,
            },
            away: {
              name: r.Circuit?.circuitName || 'Circuit',
              shortName: `R${r.round}`,
              logo: F1_LOGO,
            },
            detailNote: `${r.Circuit?.Location?.locality || ''}, ${r.Circuit?.Location?.country || ''}`,
            sourceProvider: 'Jolpica F1',
            externalUrl: r.url,
          });
        }
      } catch (err) {
        console.warn('[F1] Jolpica calendar note:', (err as Error).message);
      }

      const order: Record<MatchStatus, number> = { LIVE: 0, UPCOMING: 1, FT: 2 };
      return matches.sort((a, b) => {
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
        return Math.abs(new Date(a.startTime).getTime() - now) - Math.abs(new Date(b.startTime).getTime() - now);
      });
    },
    force
  );
  return { matches: result.data, fetchedAt: result.fetchedAt };
}

export async function getF1Standings(force = false): Promise<{ tables: StandingsTable[]; fetchedAt: string }> {
  const result = await getOrFetch(
    'f1:standings',
    CACHE_TTL.STANDINGS,
    async () => {
      const year = new Date().getUTCFullYear();
      const tables: StandingsTable[] = [];

      const [driversRes, constructorsRes] = await Promise.all([
        fetchJsonWithTimeout<any>(`https://api.jolpi.ca/ergast/f1/${year}/driverstandings.json`, {}, 7000).catch(
          () => null
        ),
        fetchJsonWithTimeout<any>(`https://api.jolpi.ca/ergast/f1/${year}/constructorstandings.json`, {}, 7000).catch(
          () => null
        ),
      ]);

      const driverList =
        driversRes?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
      if (driverList.length > 0) {
        const rows: StandingRow[] = driverList.map((d: any): StandingRow => ({
          rank: Number(d.position || 0),
          id: d.Driver?.driverId,
          team: `${d.Driver?.givenName || ''} ${d.Driver?.familyName || ''}`.trim(),
          teamShort: d.Driver?.code,
          played: Number(driversRes?.MRData?.StandingsTable?.StandingsLists?.[0]?.round || 0),
          won: Number(d.wins || 0),
          lost: 0,
          goalDiff: d.Constructors?.[0]?.name || '',
          points: d.points || '0',
          note: d.Constructors?.[0]?.name,
        }));
        tables.push({
          id: `f1_drivers_${year}`,
          sport: 'f1',
          leagueCode: 'f1',
          title: `${year} Drivers' Championship`,
          columns: [
            { key: 'won', label: 'WINS' },
            { key: 'goalDiff', label: 'TEAM' },
            { key: 'points', label: 'PTS' },
          ],
          rows,
        });
      }

      const constructorList =
        constructorsRes?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];
      if (constructorList.length > 0) {
        const rows: StandingRow[] = constructorList.map((c: any): StandingRow => ({
          rank: Number(c.position || 0),
          id: c.Constructor?.constructorId,
          team: c.Constructor?.name || 'Constructor',
          teamShort: c.Constructor?.nationality,
          played: Number(constructorsRes?.MRData?.StandingsTable?.StandingsLists?.[0]?.round || 0),
          won: Number(c.wins || 0),
          lost: 0,
          points: c.points || '0',
        }));
        tables.push({
          id: `f1_constructors_${year}`,
          sport: 'f1',
          leagueCode: 'f1',
          title: `${year} Constructors' Championship`,
          columns: [
            { key: 'won', label: 'WINS' },
            { key: 'points', label: 'PTS' },
          ],
          rows,
        });
      }

      return tables;
    },
    force
  );
  return { tables: result.data, fetchedAt: result.fetchedAt };
}

export async function getF1MatchDetail(id: string): Promise<MatchDetail | null> {
  const { data } = await getOrFetch(`f1:detail:${id}`, CACHE_TTL.DETAIL, async () => {
    if (id.startsWith('openf1_')) {
      const sessionKey = id.replace('openf1_', '');
      const [sessions, drivers, positions] = await Promise.all([
        fetchJsonWithTimeout<any[]>(`https://api.openf1.org/v1/sessions?session_key=${sessionKey}`, {}, 7000),
        fetchJsonWithTimeout<any[]>(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`, {}, 7000).catch(
          () => []
        ),
        fetchJsonWithTimeout<any[]>(`https://api.openf1.org/v1/position?session_key=${sessionKey}`, {}, 7000).catch(
          () => []
        ),
      ]);
      const session = sessions?.[0];
      if (!session) return null;

      const latestPos = new Map<number, number>();
      for (const p of positions || []) {
        latestPos.set(p.driver_number, p.position);
      }
      const drvMap = new Map<number, any>();
      for (const d of drivers || []) {
        drvMap.set(d.driver_number, d);
      }

      const sessionRows = Array.from(latestPos.entries())
        .sort((a, b) => a[1] - b[1])
        .map(([num, pos]) => {
          const drv = drvMap.get(num);
          return {
            position: pos,
            driverNumber: num,
            driverName: drv?.full_name || drv?.broadcast_name || `Driver #${num}`,
            acronym: drv?.name_acronym,
            teamName: drv?.team_name || 'F1 Team',
            teamColor: drv?.team_colour ? `#${drv.team_colour}` : undefined,
            headshot: drv?.headshot_url,
          };
        });

      const now = Date.now();
      const isLive =
        now >= new Date(session.date_start).getTime() &&
        now <= new Date(session.date_end).getTime() + 15 * 60_000;

      const match: Match = {
        id,
        sport: 'f1',
        league: `${session.location} Grand Prix`,
        leagueCode: 'f1',
        status: isLive ? 'LIVE' : 'FT',
        statusText: `${session.session_name}`,
        startTime: session.date_start,
        venue: `${session.circuit_short_name}, ${session.country_name}`,
        home: {
          name: sessionRows[0]?.driverName || session.location,
          shortName: sessionRows[0]?.acronym || 'P1',
          logo: F1_LOGO,
          score: sessionRows[0] ? 'P1' : undefined,
        },
        away: {
          name: sessionRows[1]?.driverName || session.session_name,
          shortName: sessionRows[1]?.acronym || 'P2',
          logo: F1_LOGO,
          score: sessionRows[1] ? 'P2' : undefined,
        },
        sourceProvider: 'OpenF1',
      };

      return {
        match,
        summary: `${session.session_name} · ${session.circuit_short_name}, ${session.country_name}`,
        timeline: [],
        stats: [
          { label: 'Session Type', homeValue: session.session_type, awayValue: session.session_name },
          { label: 'Circuit', homeValue: session.circuit_short_name, awayValue: session.country_name },
        ],
        lineups: [],
        sessionRows,
      } satisfies MatchDetail;
    }

    if (id.startsWith('jolpica_')) {
      const [, season, round] = id.split('_');
      const [raceJson, resultsJson] = await Promise.all([
        fetchJsonWithTimeout<any>(`https://api.jolpi.ca/ergast/f1/${season}/${round}.json`, {}, 7000),
        fetchJsonWithTimeout<any>(`https://api.jolpi.ca/ergast/f1/${season}/${round}/results.json`, {}, 7000).catch(
          () => null
        ),
      ]);
      const race = raceJson?.MRData?.RaceTable?.Races?.[0];
      if (!race) return null;

      const results = resultsJson?.MRData?.RaceTable?.Races?.[0]?.Results || [];
      const raceIso = `${race.date}T${race.time || '14:00:00Z'}`;
      const status: MatchStatus = Date.now() > new Date(raceIso).getTime() + 3 * 3600_000 ? 'FT' : 'UPCOMING';

      const sessionRows = results.map((r: any) => ({
        position: Number(r.position),
        driverNumber: Number(r.number),
        driverName: `${r.Driver?.givenName || ''} ${r.Driver?.familyName || ''}`.trim(),
        acronym: r.Driver?.code,
        teamName: r.Constructor?.name || '',
        gapOrTime: r.Time?.time || r.status || '',
      }));

      const match: Match = {
        id,
        sport: 'f1',
        league: `Round ${race.round} · Formula 1`,
        leagueCode: 'f1',
        status,
        statusText: status === 'FT' ? 'Race Results' : 'Scheduled',
        startTime: raceIso,
        venue: `${race.Circuit?.circuitName || ''}, ${race.Circuit?.Location?.country || ''}`,
        home: {
          name: sessionRows[0]?.driverName || race.raceName,
          shortName: sessionRows[0]?.acronym || `R${race.round}`,
          logo: F1_LOGO,
          score: sessionRows[0] ? 'P1' : undefined,
        },
        away: {
          name: race.Circuit?.circuitName || 'Circuit',
          shortName: (race.Circuit?.Location?.country || 'GP').slice(0, 3).toUpperCase(),
          logo: F1_LOGO,
        },
        sourceProvider: 'Jolpica F1',
      };

      return {
        match,
        summary: `${race.raceName} at ${race.Circuit?.circuitName || ''}`,
        timeline: [],
        stats: [
          { label: 'Round', homeValue: `Round ${race.round}`, awayValue: race.season },
          {
            label: 'Location',
            homeValue: race.Circuit?.Location?.locality || '-',
            awayValue: race.Circuit?.Location?.country || '-',
          },
        ],
        lineups: [],
        sessionRows,
      } satisfies MatchDetail;
    }

    return null;
  });

  return data;
}
