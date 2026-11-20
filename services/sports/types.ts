export type SportKey = 'football' | 'cricket' | 'nba' | 'f1';

export type MatchStatus = 'LIVE' | 'FT' | 'UPCOMING';

export interface TeamSide {
  id?: string;
  name: string;
  shortName: string;
  logo?: string;
  score?: string;
  subScore?: string;
  record?: string;
  isWinner?: boolean;
}

export interface Match {
  id: string;
  sport: SportKey;
  league: string;
  leagueCode: string;
  status: MatchStatus;
  statusText: string;
  startTime: string; // ISO timestamp
  venue?: string;
  home: TeamSide;
  away: TeamSide;
  detailNote?: string;
  sourceProvider: string;
  externalUrl?: string;
}

export interface Article {
  id: string;
  sport: SportKey | 'general';
  title: string;
  summary: string;
  image?: string;
  source: string;
  url: string;
  publishedAt: string; // ISO timestamp
}

export interface StandingRow {
  rank: number;
  id?: string;
  team: string;
  teamShort?: string;
  logo?: string;
  played: number;
  won: number;
  drawn?: number;
  lost: number;
  goalDiff?: string;
  points: string | number;
  note?: string;
}

export interface StandingsTable {
  id: string;
  sport: SportKey;
  leagueCode: string;
  title: string;
  columns: {
    key: 'played' | 'won' | 'drawn' | 'lost' | 'goalDiff' | 'points';
    label: string;
  }[];
  rows: StandingRow[];
}

export interface TimelineEvent {
  time: string;
  text: string;
  team?: string;
  type?: string;
}

export interface MatchStatRow {
  label: string;
  homeValue: string;
  awayValue: string;
}

export interface LineupPlayer {
  name: string;
  jersey?: string;
  position?: string;
  stats?: string;
  starter?: boolean;
}

export interface MatchLineup {
  team: string;
  logo?: string;
  players: LineupPlayer[];
}

export interface MatchDetail {
  match: Match;
  summary?: string;
  timeline: TimelineEvent[];
  stats: MatchStatRow[];
  lineups: MatchLineup[];
  sessionRows?: {
    position: number;
    driverNumber?: number;
    driverName: string;
    acronym?: string;
    teamName: string;
    teamColor?: string;
    headshot?: string;
    gapOrTime?: string;
  }[];
}

export interface QuickLink {
  id: string;
  label: string;
  sport: SportKey;
  leagueCode?: string;
  liveCount: number;
  matchCount: number;
}

export interface SearchEntity {
  id: string;
  name: string;
  sport: string;
  subtitle?: string;
  image?: string;
  url?: string;
  type: 'player' | 'team' | 'league';
}

export interface SearchResults {
  players: SearchEntity[];
  teams: SearchEntity[];
  leagues: SearchEntity[];
  matches: Match[];
  articles: Article[];
}

export interface SportsOverviewResponse {
  matches: Match[];
  liveCount: number;
  quickLinks: QuickLink[];
  articles: Article[];
  standings: StandingsTable[];
  fetchedAt: string;
}

export interface SportPageResponse {
  sport: SportKey;
  matches: Match[];
  standings: StandingsTable[];
  articles: Article[];
  leaguesAvailable: { code: string; name: string }[];
  fetchedAt: string;
}
