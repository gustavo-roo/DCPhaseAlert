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

// Schedule reset at midnight every day
cron.schedule('0 0 * * *', () => {
  console.log('Midnight Reset: Resetting all communities to Green - Normal');
  communityState = getInitialState();
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
    }
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API: Get current state
  app.get("/api/communities", (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /api/communities - Returning state`);
    res.json(communityState);
  });

  // API: Update a community status
  app.post("/api/communities/update", (req, res) => {
    const { id, status } = req.body;
    console.log(`[${new Date().toISOString()}] POST /api/communities/update - ID: ${id}, Status: ${status}`);
    communityState = communityState.map(c => 
      c.id === id ? { ...c, status, isUpdated: true } : c
    );
    res.json({ success: true, state: communityState });
  });

  // API: Reset all updates
  app.post("/api/communities/reset", (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/communities/reset - Resetting updates`);
    communityState = communityState.map(c => ({ ...c, isUpdated: false }));
    res.json({ success: true, state: communityState });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log('Starting Vite in development mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running in production mode...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
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
