import express from 'express';
import cors from 'cors';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { platform, homedir } from 'os';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';

const execAsync = promisify(exec);
const app = express();
app.use(cors());
app.use(express.json());

const isWindows = platform() === 'win32';

function getHome(): string {
  // No Windows prioriza USERPROFILE (C:\Users\marcelo.ferreira)
  if (isWindows) {
    return process.env.USERPROFILE || process.env.HOMEDRIVE && process.env.HOMEPATH
      ? `${process.env.HOMEDRIVE}${process.env.HOMEPATH}`
      : homedir();
  }
  return process.env.HOME || homedir();
}

const HOME = getHome();
console.log(`HOME: ${HOME}`);
const AWS_DIR = join(HOME, '.aws');
const CONFIG_PATH = join(AWS_DIR, 'config');
const CREDENTIALS_PATH = join(AWS_DIR, 'credentials');
const SERVICES_FILE = join(AWS_DIR, 'ssm-services.json');

function getAwsPath(): string {
  try {
    const cmd = isWindows ? 'where aws' : 'which aws';
    const result = execSync(cmd, { env: process.env }).toString().trim().split('\n')[0];
    return result;
  } catch {
    if (isWindows) {
      // Paths comuns do AWS CLI no Windows
      for (const p of [
        'C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe',
        'C:\\Program Files (x86)\\Amazon\\AWSCLIV2\\aws.exe',
        join(HOME, 'AppData\\Local\\Programs\\Amazon\\AWSCLIV2\\aws.exe'),
      ]) {
        if (existsSync(p)) return p;
      }
      return 'aws';
    }
    for (const p of ['/opt/homebrew/bin/aws', '/usr/local/bin/aws', '/usr/bin/aws']) {
      if (existsSync(p)) return p;
    }
    return 'aws';
  }
}

const AWS_PATH = getAwsPath();
console.log(`AWS CLI: ${AWS_PATH}`);

// Env com PATH completo para exec no Windows
const execEnv = isWindows
  ? { ...process.env, PATH: `${process.env.PATH};C:\\Program Files\\Amazon\\AWSCLIV2` }
  : { ...process.env };

// ── Debug ──────────────────────────────────────────────────────────────────────
app.get('/api/debug', (req, res) => {
  res.json({
    platform: platform(),
    HOME,
    AWS_DIR,
    CONFIG_PATH,
    configExists: existsSync(CONFIG_PATH),
    credentialsExists: existsSync(CREDENTIALS_PATH),
    AWS_PATH,
    env_USERPROFILE: process.env.USERPROFILE,
    env_HOME: process.env.HOME,
    homedir: homedir(),
  });
});

// ── Connection Status ──────────────────────────────────────────────────────────
app.get('/api/connection-status', async (req, res) => {
  try {
    const profile = req.query.profile as string;
    const cmd = profile
      ? `"${AWS_PATH}" sts get-caller-identity --profile "${profile}"`
      : `"${AWS_PATH}" sts get-caller-identity`;
    const { stdout } = await execAsync(cmd, { env: execEnv });
    const identity = JSON.parse(stdout);
    res.json({ connected: true, profile: profile || 'default', accountId: identity.Account });
  } catch {
    res.json({ connected: false });
  }
});

// ── Profiles ───────────────────────────────────────────────────────────────────
app.get('/api/profiles', (req, res) => {
  try {
    if (!existsSync(CONFIG_PATH)) return res.json([]);
    res.json(parseAWSConfig(readFileSync(CONFIG_PATH, 'utf-8')));
  } catch {
    res.json([]);
  }
});

app.post('/api/login', async (req, res) => {
  const { profile } = req.body;
  try {
    if (!existsSync(CONFIG_PATH))
      return res.status(400).json({ success: false, error: 'Arquivo ~/.aws/config não encontrado' });

    const configContent = readFileSync(CONFIG_PATH, 'utf-8');
    if (!configContent.includes(`[profile ${profile}]`))
      return res.status(400).json({ success: false, error: `Perfil "${profile}" não encontrado` });

    const blockMatch = configContent.match(new RegExp(`\\[profile ${profile}\\]([\\s\\S]*?)(?=\\[profile |$)`));
    const isSSOProfile = blockMatch ? blockMatch[1].includes('sso_start_url') : false;

    if (isSSOProfile) {
      let loginUrl = '', loginCode = '';
      const child = exec(`"${AWS_PATH}" sso login --profile "${profile}" --no-browser`, { env: execEnv });
      child.stderr?.on('data', (d: string) => {
        const u = d.match(/https:\/\/[^\s]+/); if (u) loginUrl = u[0];
        const c = d.match(/code[:\s]+([A-Z0-9-]+)/i); if (c) loginCode = c[1];
      });
      child.stdout?.on('data', (d: string) => {
        const u = d.match(/https:\/\/[^\s]+/); if (u) loginUrl = u[0];
        const c = d.match(/code[:\s]+([A-Z0-9-]+)/i); if (c) loginCode = c[1];
      });
      await new Promise(r => setTimeout(r, 4000));
      res.json({ success: true, type: 'sso', loginUrl: loginUrl || null, loginCode: loginCode || null });
    } else {
      try {
        const { stdout } = await execAsync(`"${AWS_PATH}" sts get-caller-identity --profile "${profile}"`, { env: execEnv });
        const identity = JSON.parse(stdout);
        res.json({ success: true, type: 'keys', accountId: identity.Account, userId: identity.UserId });
      } catch (err: any) {
        res.json({ success: false, type: 'keys', error: err.stderr || err.message });
      }
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/configure-profile', (req, res) => {
  const { profileName, ssoStartUrl, ssoRegion, ssoAccountId, ssoRoleName, region, outputFormat, configType, accessKeyId, secretAccessKey, credentialsText } = req.body;
  try {
    if (!existsSync(AWS_DIR)) mkdirSync(AWS_DIR, { recursive: true });

    if (configType === 'credentials-only') {
      appendFileSync(CREDENTIALS_PATH, `\n# profile: ${profileName}\n${credentialsText}\n`);
      return res.json({ success: true });
    }

    if (ssoStartUrl && ssoRegion && ssoAccountId && ssoRoleName) {
      appendFileSync(CONFIG_PATH, `\n[profile ${profileName}]\nsso_start_url = ${ssoStartUrl}\nsso_region = ${ssoRegion}\nsso_account_id = ${ssoAccountId}\nsso_role_name = ${ssoRoleName}\nregion = ${region}\noutput = ${outputFormat}\n`);
    } else {
      appendFileSync(CONFIG_PATH, `\n[profile ${profileName}]\nregion = ${region}\noutput = ${outputFormat}\n`);
      appendFileSync(CREDENTIALS_PATH, `\n[${profileName}]\naws_access_key_id = ${accessKeyId}\naws_secret_access_key = ${secretAccessKey}\n`);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.post('/api/delete-profile', (req, res) => {
  const { profileName } = req.body;
  try {
    if (existsSync(CONFIG_PATH)) {
      const content = readFileSync(CONFIG_PATH, 'utf-8');
      writeFileSync(CONFIG_PATH, content.replace(new RegExp(`\\[profile ${profileName}\\][\\s\\S]*?(?=\\[profile |$)`, 'g'), '').trim() + '\n');
    }
    if (existsSync(CREDENTIALS_PATH)) {
      const content = readFileSync(CREDENTIALS_PATH, 'utf-8');
      const escaped = profileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      writeFileSync(CREDENTIALS_PATH, content.replace(new RegExp(`\\n?# profile: ${escaped}\\n[\\s\\S]*?(?=\\n# profile:|\\n\\[|$)`, 'g'), '').trim() + '\n');
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ── Services (persisted) ───────────────────────────────────────────────────────
function loadServices() {
  try { return existsSync(SERVICES_FILE) ? JSON.parse(readFileSync(SERVICES_FILE, 'utf-8')) : []; } catch { return []; }
}
function saveServices(s: any[]) { writeFileSync(SERVICES_FILE, JSON.stringify(s, null, 2)); }

app.get('/api/services', (req, res) => res.json(loadServices()));

app.post('/api/services', (req, res) => {
  const services = loadServices();
  const s = { ...req.body, id: Date.now().toString(), status: 'disconnected' };
  services.push(s);
  saveServices(services);
  res.json(s);
});

app.delete('/api/services/:id', (req, res) => {
  saveServices(loadServices().filter((s: any) => s.id !== req.params.id));
  res.json({ success: true });
});

// ── SSM Connections ────────────────────────────────────────────────────────────
const activeConnections = new Map<string, any>();

app.post('/api/ssm-connect', async (req, res) => {
  const { serviceId, localPort, remotePort, instanceId, profile } = req.body;
  try {
    if (activeConnections.has(serviceId)) {
      activeConnections.get(serviceId)?.process?.kill();
      activeConnections.delete(serviceId);
    }

    const profileFlag = profile ? `--profile "${profile}"` : '';
    const command = `"${AWS_PATH}" ssm start-session --target ${instanceId} --document-name AWS-StartPortForwardingSession --parameters "portNumber=${remotePort},localPortNumber=${localPort}" ${profileFlag}`;
    console.log(`SSM Connect: ${command}`);

    let lastError = '', connected = false;
    const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      const child = exec(command, { env: execEnv });
      child.stderr?.on('data', (d: string) => { lastError += d; });
      child.stdout?.on('data', (d: string) => {
        console.log('SSM:', d);
        if (d.includes('Waiting for connections') || d.includes('Port')) {
          connected = true;
          activeConnections.set(serviceId, { id: serviceId, localPort, remotePort, instanceId, profile, status: 'connected', process: child });
          resolve({ success: true });
        }
      });
      child.on('exit', (code) => { if (!connected) resolve({ success: false, error: lastError || `Exited: ${code}` }); });
      setTimeout(() => { if (!connected) { child.kill(); resolve({ success: false, error: lastError || 'Timeout: 5s' }); } }, 5000);
    });

    if (!result.success) return res.status(500).json(result);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.post('/api/ssm-disconnect', (req, res) => {
  const { serviceId } = req.body;
  if (activeConnections.has(serviceId)) {
    // SIGINT = equivalente ao Ctrl+C, encerra o túnel SSM corretamente
    activeConnections.get(serviceId)?.process?.kill('SIGINT');
    activeConnections.delete(serviceId);
  }
  res.json({ success: true });
});

// ── Settings Export/Import ─────────────────────────────────────────────────────
app.get('/api/settings/export', (req, res) => {
  try {
    const config = existsSync(CONFIG_PATH) ? readFileSync(CONFIG_PATH, 'utf-8') : '';
    const credentials = existsSync(CREDENTIALS_PATH) ? readFileSync(CREDENTIALS_PATH, 'utf-8') : '';
    const services = loadServices();
    res.setHeader('Content-Type', 'application/json');
    res.json({ config, credentials, services });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.post('/api/settings/import', (req, res) => {
  try {
    const { config, credentials, services } = req.body;
    if (!existsSync(AWS_DIR)) mkdirSync(AWS_DIR, { recursive: true });
    if (config !== undefined) writeFileSync(CONFIG_PATH, config, 'utf-8');
    if (credentials !== undefined) writeFileSync(CREDENTIALS_PATH, credentials, 'utf-8');
    if (services !== undefined) saveServices(services);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ── Utilities ──────────────────────────────────────────────────────────────────
app.post('/api/open-url', (req, res) => {
  const { url } = req.body;
  exec(isWindows ? `start "${url}"` : `open "${url}"`);
  res.json({ success: true });
});

function parseAWSConfig(content: string) {
  const profiles: any[] = [];
  let current: any = null;
  for (const line of content.split('\n')) {
    const m = line.match(/\[profile (.+)\]/);
    if (m) { if (current) profiles.push(current); current = { name: m[1] }; }
    else if (current) {
      const [k, v] = line.split('=').map(s => s.trim());
      if (k === 'sso_start_url') current.ssoStartUrl = v;
      if (k === 'sso_region') current.ssoRegion = v;
      if (k === 'region') current.region = v;
    }
  }
  if (current) profiles.push(current);
  return profiles;
}

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
