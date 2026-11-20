import express from 'express';
import { createServer as createViteServer } from 'vite';
import * as path from 'path';
import * as url from 'url';
import 'dotenv/config';
import {
  getAllNews,
  getArticleById,
  getLiveTickerData,
  getMatchDetail,
  getSportPageData,
  getSportsOverview,
  searchSports,
  type SportKey,
} from './services/sports/index.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_SPORTS = new Set<SportKey>(['football', 'cricket', 'nba', 'f1']);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS & JSON middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Home overview: live matches, dynamic quick links, news, standings
  app.get('/api/sports/overview', async (req, res) => {
    try {
      const force = req.query.force === 'true';
      const data = await getSportsOverview(force);
      res.json(data);
    } catch (err) {
      console.error('/api/sports/overview error:', err);
      res.status(502).json({ error: 'Unable to fetch live sports overview right now.' });
    }
  });

  // Lightweight live ticker polling endpoint (25s server cache)
  app.get('/api/sports/live', async (req, res) => {
    try {
      const force = req.query.force === 'true';
      const data = await getLiveTickerData(force);
      res.json(data);
    } catch (err) {
      console.error('/api/sports/live error:', err);
      res.status(502).json({ error: 'Unable to fetch live ticker scores.' });
    }
  });

  // News endpoints
  app.get('/api/sports/news', async (req, res) => {
    try {
      const sport = typeof req.query.sport === 'string' ? req.query.sport : undefined;
      const force = req.query.force === 'true';
      const data = await getAllNews(sport, force);
      res.json(data);
    } catch (err) {
      console.error('/api/sports/news error:', err);
      res.status(502).json({ error: 'Unable to fetch news feeds.' });
    }
  });

  app.get('/api/sports/news/:id', async (req, res) => {
    try {
      const article = await getArticleById(req.params.id);
      if (!article) {
        res.status(404).json({ error: 'Article not found in current feed' });
        return;
      }
      res.json({ article });
    } catch (err) {
      console.error('/api/sports/news/:id error:', err);
      res.status(502).json({ error: 'Unable to load article.' });
    }
  });

  // Live search across teams, players, leagues, matches, news
  app.get('/api/sports/search', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const results = await searchSports(q);
      res.json(results);
    } catch (err) {
      console.error('/api/sports/search error:', err);
      res.status(502).json({ error: 'Search temporarily unavailable.' });
    }
  });

  // Match detail endpoint (scoreboard, timeline, boxscore/lineups, team stats)
  app.get('/api/sports/:sport/match/:id', async (req, res) => {
    const sport = req.params.sport as SportKey;
    if (!VALID_SPORTS.has(sport)) {
      res.status(400).json({ error: 'Invalid sport key' });
      return;
    }
    try {
      const league = typeof req.query.league === 'string' ? req.query.league : undefined;
      const detail = await getMatchDetail(sport, req.params.id, league);
      if (!detail) {
        res.status(404).json({ error: 'Match details not found' });
        return;
      }
      res.json(detail);
    } catch (err) {
      console.error(`/api/sports/${sport}/match/${req.params.id} error:`, err);
      res.status(502).json({ error: 'Unable to fetch match details.' });
    }
  });

  // Dedicated sport hub endpoint
  app.get('/api/sports/:sport', async (req, res) => {
    const sport = req.params.sport as SportKey;
    if (!VALID_SPORTS.has(sport)) {
      res.status(400).json({ error: 'Unsupported sport' });
      return;
    }
    try {
      const league = typeof req.query.league === 'string' ? req.query.league : undefined;
      const force = req.query.force === 'true';
      const data = await getSportPageData(sport, league, force);
      res.json(data);
    } catch (err) {
      console.error(`/api/sports/${sport} error:`, err);
      res.status(502).json({ error: `Unable to fetch ${sport} data.` });
    }
  });

  // Contact form acknowledgement (stateless, no fake DB claims)
  app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) {
      res.status(400).json({ error: 'Name, email, and message are required.' });
      return;
    }
    console.log(`[Contact Form] From ${name} <${email}>: ${message}`);
    res.status(201).json({ success: true, message: 'Message received.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, '../dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SportsNetwork server running on http://localhost:${PORT}`);
  });
}

startServer();
