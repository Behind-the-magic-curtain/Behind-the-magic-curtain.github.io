import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Serve static assets from root directory with automatic .html extension resolution
app.use(express.static(__dirname, {
  extensions: ['html', 'htm']
}));

// Route fallback: return index.html for extension-less URLs, 404 for missing static assets
app.get('*', (req, res) => {
  if (path.extname(req.path)) {
    return res.status(404).send('Not Found');
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Behind the Magic Curtain running on http://${HOST}:${PORT}`);
});
