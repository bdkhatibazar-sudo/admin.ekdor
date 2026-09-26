import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { getStoreData, syncStoreData } from './src/db/repository.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }
  // Cloud Run sets PORT=8080 which is reserved for the Nginx ingress.
  // The Node application server behind Nginx must always listen on port 3000.
  return 3000;
}

const port = getPort();

app.use(express.json({ limit: '10mb' }));

// Steadfast / Packzy Courier Proxy Route
app.all('/api/steadfast/*', async (req, res) => {
  try {
    const targetPath = req.path.replace('/api/steadfast', '');
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const apiKey = (req.headers['api-key'] as string) || process.env.STEADFAST_API_KEY || '';
    const secretKey = (req.headers['secret-key'] as string) || process.env.STEADFAST_SECRET_KEY || '';

    // Primary: https://portal.packzy.com/api/v1 (Official modern Steadfast API)
    // Fallback: https://portal.steadfast.com.bd/api/v1
    const baseHosts = ['https://portal.packzy.com/api/v1', 'https://portal.steadfast.com.bd/api/v1'];
    let lastError: any = null;

    for (const baseHost of baseHosts) {
      try {
        const url = `${baseHost}${targetPath}${queryString}`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (apiKey) headers['Api-Key'] = apiKey;
        if (secretKey) headers['Secret-Key'] = secretKey;

        const response = await fetch(url, {
          method: req.method,
          headers,
          body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
        });

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          return res.status(response.status).json(data);
        } else {
          const text = await response.text();
          return res.status(response.status).send(text);
        }
      } catch (err: any) {
        lastError = err;
        // Try next baseHost
      }
    }

    res.status(502).json({ error: lastError?.message || 'Failed to contact Steadfast/Packzy Courier API' });
  } catch (error: any) {
    console.error('Steadfast proxy error:', error);
    res.status(502).json({ error: error.message || 'Failed to contact Steadfast/Packzy Courier API' });
  }
});

// GitHub Customer Site Sync Proxy Route
app.post('/api/github/sync', async (req, res) => {
  try {
    const { repo, token, branch = 'main', commitMessage, files } = req.body;
    if (!repo || !token || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Missing required parameters: repo, token, files' });
    }

    const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    const results = [];

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${token.trim()}`,
      'User-Agent': 'Ekdor-Admin-POS',
      'Content-Type': 'application/json',
    };

    for (const file of files) {
      const filePath = file.path;
      const contentStr = file.content;
      const apiUrl = `https://api.github.com/repos/${cleanRepo}/contents/${filePath}`;

      let existingSha: string | undefined = undefined;
      try {
        const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
          method: 'GET',
          headers,
        });
        if (getRes.ok) {
          const getData = await getRes.json();
          existingSha = getData.sha;
        }
      } catch (err) {
        console.warn(`Error getting file sha for ${filePath}:`, err);
      }

      const base64Content = Buffer.from(contentStr, 'utf-8').toString('base64');
      const putBody: any = {
        message: commitMessage || `Update ${filePath} from Ekdor Admin POS`,
        content: base64Content,
        branch,
      };
      if (existingSha) {
        putBody.sha = existingSha;
      }

      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(putBody),
      });

      if (!putRes.ok) {
        const errData = await putRes.json().catch(() => ({ message: putRes.statusText }));
        results.push({
          filename: filePath,
          success: false,
          message: errData.message || `HTTP ${putRes.status}`,
        });
      } else {
        const resData = await putRes.json();
        results.push({
          filename: filePath,
          success: true,
          message: 'সফলভাবে পুশ হয়েছে',
          sha: resData.content?.sha,
          htmlUrl: resData.content?.html_url,
        });
      }
    }

    const allSuccess = results.every((r) => r.success);
    res.json({
      success: allSuccess,
      message: allSuccess
        ? '৩টি ফাইলই (products.json, categories.json, bundle.json) সফলভাবে গিটহাবে আপডেট হয়েছে!'
        : 'কিছু ফাইল আপডেট করতে সমস্যা হয়েছে।',
      results,
    });
  } catch (error: any) {
    console.error('GitHub Sync error:', error);
    res.status(500).json({ error: error.message || 'GitHub Sync failed' });
  }
});

// User Sync API
app.post('/api/auth/sync-user', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const email = req.user!.email || `${uid}@guest.shop`;
    const name = (req.user as any).name || (req.body.name as string);

    const user = await getOrCreateUser(uid, email, name);
    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Failed to sync user:', error);
    res.status(500).json({ error: error.message || 'Failed to sync user profile' });
  }
});

// Get all Store Data from Cloud SQL
app.get('/api/store-data', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const data = await getStoreData(uid);
    res.json(data);
  } catch (error: any) {
    console.error('Failed to get store data:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch store data' });
  }
});

// Sync / Save Store Data to Cloud SQL
app.post('/api/store-data/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user!.uid;
    const result = await syncStoreData(uid, req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Failed to sync store data:', error);
    res.status(500).json({ error: error.message || 'Failed to sync store data' });
  }
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Global Multi-device Supabase & Store Config API
const SERVER_CONFIG_PATH = path.join(__dirname, 'server-config.json');

function getServerConfig() {
  let saved: any = {};
  try {
    if (fs.existsSync(SERVER_CONFIG_PATH)) {
      const data = fs.readFileSync(SERVER_CONFIG_PATH, 'utf-8');
      saved = JSON.parse(data);
    }
  } catch (err) {
    console.warn('Could not read server-config.json:', err);
  }

  return {
    supabaseUrl: saved.supabaseUrl || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    supabaseAnonKey: saved.supabaseAnonKey || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
    autoSyncSupabase: saved.autoSyncSupabase !== false,
    updatedAt: saved.updatedAt || null,
  };
}

app.get('/api/server-config', (req, res) => {
  res.json(getServerConfig());
});

app.post('/api/server-config', (req, res) => {
  try {
    const current = getServerConfig();
    const updated = {
      ...current,
      supabaseUrl: req.body.supabaseUrl !== undefined ? String(req.body.supabaseUrl).trim() : current.supabaseUrl,
      supabaseAnonKey: req.body.supabaseAnonKey !== undefined ? String(req.body.supabaseAnonKey).trim() : current.supabaseAnonKey,
      autoSyncSupabase: req.body.autoSyncSupabase !== undefined ? Boolean(req.body.autoSyncSupabase) : current.autoSyncSupabase,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(SERVER_CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    res.json({ success: true, config: updated });
  } catch (err: any) {
    console.error('Error saving server-config.json:', err);
    res.status(500).json({ error: err.message || 'Failed to save server config' });
  }
});

// Vite or Static Serving
async function setupViteOrStatic() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isProd = process.env.NODE_ENV === 'production' && hasDist;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in development mode');
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Static files served from dist directory');
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening at http://0.0.0.0:${port}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
