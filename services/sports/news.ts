import { XMLParser } from 'fast-xml-parser';
import { CACHE_TTL, fetchJsonWithTimeout, fetchTextWithTimeout, getOrFetch } from './cache.js';
import type { Article, SportKey } from './types.js';

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', trimValues: true });

function hashId(prefix: string, str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return `${prefix}_${Math.abs(h).toString(36)}`;
}

function stripHtml(text?: string): string {
  if (!text) return '';
  return String(text)
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferSportFromText(text: string, fallback: SportKey | 'general' = 'general'): SportKey | 'general' {
  const lower = text.toLowerCase();
  if (/\b(nba|lakers|celtics|warriors|bucks|nuggets|knicks|spurs|wembanyama|lebron|curry|basketball)\b/.test(lower))
    return 'nba';
  if (/\b(f1|formula 1|formula one|grand prix|verstappen|hamilton|norris|leclerc|ferrari|mclaren|red bull|las vegas gp)\b/.test(lower))
    return 'f1';
  if (/\b(cricket|test match|odi|t20|wicket|innings|bcci|ipl|ashes|kohli|rohit|bumrah|cricinfo)\b/.test(lower))
    return 'cricket';
  if (/\b(premier league|champions league|la liga|serie a|bundesliga|arsenal|liverpool|man city|man utd|chelsea|real madrid|barcelona|football|soccer|fifa|uefa)\b/.test(lower))
    return 'football';
  return fallback;
}

async function fetchEspnSportNews(path: string, sport: SportKey): Promise<Article[]> {
  try {
    const data = await fetchJsonWithTimeout<any>(
      `https://site.api.espn.com/apis/site/v2/sports/${path}/news`,
      {},
      6500
    );
    const items = Array.isArray(data?.articles) ? data.articles : [];
    return items.slice(0, 12).map((a: any): Article => {
      const url = a.links?.web?.href || a.links?.mobile?.href || 'https://www.espn.com';
      const img =
        a.images?.find((im: any) => im.width >= 600)?.url ||
        a.images?.[0]?.url ||
        undefined;
      return {
        id: hashId(`espn_${sport}`, String(a.id || a.headline || url)),
        sport,
        title: a.headline || 'Sports Update',
        summary: stripHtml(a.description || a.story || ''),
        image: img,
        source: 'ESPN',
        url,
        publishedAt: a.published || a.lastModified || new Date().toISOString(),
      };
    });
  } catch {
    return [];
  }
}

async function fetchRssFeed(
  feedUrl: string,
  sourceName: string,
  defaultSport: SportKey | 'general'
): Promise<Article[]> {
  try {
    const xml = await fetchTextWithTimeout(feedUrl, {}, 6500);
    const parsed = xmlParser.parse(xml);
    const rawItems = parsed?.rss?.channel?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items.slice(0, 15).map((item: any): Article => {
      const title = stripHtml(item.title);
      const summary = stripHtml(item.description);
      const link = String(item.link || item.guid?.['#text'] || item.guid || '').trim();

      let image: string | undefined;
      const mediaThumb = item['media:thumbnail'];
      const mediaContent = item['media:content'];
      const enclosure = item.enclosure;

      if (Array.isArray(mediaThumb) && mediaThumb[0]?.['@_url']) {
        image = mediaThumb[0]['@_url'];
      } else if (mediaThumb?.['@_url']) {
        image = mediaThumb['@_url'];
      } else if (Array.isArray(mediaContent) && mediaContent[0]?.['@_url']) {
        image = mediaContent[0]['@_url'];
      } else if (mediaContent?.['@_url']) {
        image = mediaContent['@_url'];
      } else if (enclosure?.['@_url']) {
        image = enclosure['@_url'];
      }

      // BBC sport thumbnails often return /240/ -> upgrade safely or keep valid URL
      if (image && image.includes('ichef.bbci.co.uk/ace/standard/240/')) {
        image = image.replace('/240/', '/800/');
      }

      const publishedRaw = item.pubDate || item['dc:date'];
      const publishedAt = publishedRaw && !Number.isNaN(Date.parse(publishedRaw))
        ? new Date(publishedRaw).toISOString()
        : new Date().toISOString();

      return {
        id: hashId(sourceName.toLowerCase().replace(/\s+/g, ''), link || title),
        sport: defaultSport === 'general' ? inferSportFromText(`${title} ${summary}`) : defaultSport,
        title,
        summary,
        image,
        source: sourceName,
        url: link,
        publishedAt,
      };
    });
  } catch (err) {
    console.warn(`[News] Failed RSS ${sourceName}:`, (err as Error).message);
    return [];
  }
}

export async function getAllNews(sportFilter?: string, force = false): Promise<{ articles: Article[]; fetchedAt: string }> {
  const result = await getOrFetch(
    'news:all',
    CACHE_TTL.NEWS,
    async () => {
      const feeds = await Promise.all([
        fetchEspnSportNews('basketball/nba', 'nba'),
        fetchEspnSportNews('soccer/eng.1', 'football'),
        fetchEspnSportNews('racing/f1', 'f1'),
        fetchEspnSportNews('cricket/8676', 'cricket'),
        fetchRssFeed('https://feeds.bbci.co.uk/sport/rss.xml', 'BBC Sport', 'general'),
        fetchRssFeed('https://www.skysports.com/rss/12040', 'Sky Sports', 'general'),
        fetchRssFeed('https://www.espncricinfo.com/rss/content/story/feeds/0.xml', 'ESPNCricinfo', 'cricket'),
      ]);

      const combined = feeds.flat().filter((a) => a.title && a.url);

      // Deduplicate by normalized title prefix
      const seen = new Set<string>();
      const unique: Article[] = [];
      for (const art of combined) {
        const key = art.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 45);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        unique.push(art);
      }

      // Prioritize articles that have real images and sort newest first
      return unique.sort((a, b) => {
        const tDiff = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        // Keep newest first within reasonable window
        return tDiff;
      });
    },
    force
  );

  const articles = sportFilter && sportFilter !== 'all'
    ? result.data.filter((a) => a.sport === sportFilter.toLowerCase())
    : result.data;

  return { articles, fetchedAt: result.fetchedAt };
}

export async function getArticleById(id: string): Promise<Article | null> {
  const { articles } = await getAllNews();
  return articles.find((a) => a.id === id) || null;
}
