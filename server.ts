import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initial status for all communities
const INITIAL_COMMUNITIES = [
  'Associates', 'Specialists', 'Travel Trade', 'Spanish', 'Portuguese',
  'Latin America (LACD)', 'WDTC UK', 'Guest Services', 'Internet Helpdesk',
  'IHD Spanish', 'Ticket Helpdesk', 'Passholder Helpdesk', 'Messaging',
  'DAS Video Chat', 'Avengers', 'PhotoPass (DPI)',
];

// Helper to create initial state
const getInitialState = () => INITIAL_COMMUNITIES.map(name => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  status: 'Green - Normal',
  isUpdated: false
}));

// In-memory state shared across all users
let communityState = getInitialState();

interface ServerPhaseLog {
  id: string;
  communityId: string;
  communityName: string;
  status: string;
  calledBy: string;
  calledById?: string;
  calledAt: string;
  timestamp: number;
  dateStr: string;
}

let dailyPhaseLogs: ServerPhaseLog[] = [];

// Helper to get today's date string in Eastern Time
const getTodayDateStr = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

// Schedule reset at midnight every day
cron.schedule('0 0 * * *', () => {
  console.log('Midnight Reset: Resetting all communities to Green - Normal and clearing daily phase logs');
  communityState = getInitialState();
  dailyPhaseLogs = [];
}, {
  timezone: "America/New_York" // Eastern Time for Florida
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to log all requests for debugging
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[${new Date().toISOString()}] Incoming Request: ${req.method} ${req.url}`);
      // Ensure we don't cache API responses that might be erroring
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API: Get current state
  app.get(["/api/communities", "/api/communities/"], (req, res) => {
    try {
      console.log(`[${new Date().toISOString()}] GET ${req.originalUrl} - Returning state`);
      res.json(communityState);
    } catch (error) {
      console.error('Error in GET /api/communities:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // API: Update a community status
  app.post(["/api/communities/update", "/api/communities/update/"], (req, res) => {
    try {
      const { id, status } = req.body;
      console.log(`[${new Date().toISOString()}] POST ${req.originalUrl} - ID: ${id}, Status: ${status}`);
      if (!id || !status) {
        return res.status(400).json({ error: 'Missing ID or Status' });
      }
      
      communityState = communityState.map(c => 
        c.id === id ? { ...c, status, isUpdated: true } : c
      );

      res.json({ success: true, state: communityState });
    } catch (error) {
      console.error('Error in POST /api/communities/update:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // API: Get daily phase logs
  app.get(["/api/phase-logs", "/api/phase-logs/"], (req, res) => {
    try {
      const today = getTodayDateStr();
      // Ensure only today's logs are returned
      dailyPhaseLogs = dailyPhaseLogs.filter(l => l.dateStr === today);
      res.json(dailyPhaseLogs);
    } catch (error) {
      console.error('Error in GET /api/phase-logs:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // API: Log a phase change directly
  app.post(["/api/phase-logs", "/api/phase-logs/"], (req, res) => {
    try {
      const { communityId, communityName, status, calledBy, calledById } = req.body;
      if (!communityName || !status) {
        return res.status(400).json({ error: 'Missing required log fields' });
      }
      const now = new Date();
      const today = getTodayDateStr();
      const newLog: ServerPhaseLog = {
        id: `${communityId || 'cm'}-${now.getTime()}`,
        communityId: communityId || 'unknown',
        communityName,
        status,
        calledBy: calledBy || 'Coordinator',
        calledById,
        calledAt: now.toISOString(),
        timestamp: now.getTime(),
        dateStr: today
      };

      dailyPhaseLogs = dailyPhaseLogs.filter(l => l.dateStr === today);
      dailyPhaseLogs.unshift(newLog);

      res.json({ success: true, log: newLog, logs: dailyPhaseLogs });
    } catch (error) {
      console.error('Error in POST /api/phase-logs:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // API: Reset all updates
  app.post(["/api/communities/reset", "/api/communities/reset/"], (req, res) => {
    try {
      console.log(`[${new Date().toISOString()}] POST ${req.originalUrl} - Resetting updates`);
      communityState = communityState.map(c => ({ ...c, isUpdated: false }));
      res.json({ success: true, state: communityState });
    } catch (error) {
      console.error('Error in POST /api/communities/reset:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Fallback for any other /api routes to avoid returning HTML
  app.all("/api/*", (req, res) => {
    console.warn(`[${new Date().toISOString()}] 404 for API route: ${req.originalUrl}`);
    res.status(404).json({ 
      error: `API route not found: ${req.originalUrl}`,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log('Starting Vite in development mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Add a middleware before vite to check for missed API calls
    app.use((req, res, next) => {
      if (req.url.startsWith('/api')) {
        console.error(`[CRITICAL] API request reached Vite fallback: ${req.method} ${req.url}`);
        return res.status(404).json({ error: 'API route missed handlers and reached Vite' });
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    console.log('Running in production mode...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      if (req.url.startsWith('/api')) {
        console.error(`[CRITICAL] API request reached Production fallback: ${req.method} ${req.url}`);
        return res.status(404).json({ error: 'API route missed handlers and reached Production fallback' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[${new Date().toISOString()}] Server running on http://0.0.0.0:${PORT}`);
    console.log(`Available APIs: /api/communities, /api/communities/update, /api/communities/reset, /api/health`);
  });
}

startServer().catch(err => {
  console.error("Critical error during server startup:", err);
  process.exit(1);
});
