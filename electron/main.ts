import { app, BrowserWindow, shell } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess, execSync } from 'child_process';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let isQuitting = false;

function findNode(): string {
  const isWin = process.platform === 'win32';
  if (isWin) {
    // Paths comuns do Node no Windows
    for (const p of [
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Program Files (x86)\\nodejs\\node.exe',
      join(process.env.APPDATA || '', '..\\Local\\Programs\\nodejs\\node.exe'),
    ]) {
      if (existsSync(p)) return p;
    }
    try { return execSync('where node').toString().trim().split('\n')[0]; } catch {}
    return 'node';
  }
  for (const p of [
    '/usr/local/bin/node',
    '/opt/homebrew/bin/node',
    '/usr/bin/node',
  ]) {
    if (existsSync(p)) return p;
  }
  try { return execSync('which node').toString().trim(); } catch {}
  return 'node';
}

function startServer(): Promise<void> {
  return new Promise((resolve) => {
    const serverPath = join(process.resourcesPath, 'server', 'dist', 'server.js');
    console.log(`Starting server at: ${serverPath}`);
    console.log(`Server path exists: ${existsSync(serverPath)}`);
    console.log(`process.execPath: ${process.execPath}`);

    // Tenta primeiro com ELECTRON_RUN_AS_NODE
    // Se falhar em 5s, tenta com node do sistema
    let resolved = false;
    const tryResolve = () => { if (!resolved) { resolved = true; resolve(); } };

    serverProcess = spawn(process.execPath, [serverPath], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: 'pipe'
    });

    serverProcess.stdout?.on('data', (d: Buffer) => {
      const msg = d.toString();
      console.log('[server stdout]', msg);
      if (msg.includes('running on port') || msg.includes('3001')) {
        tryResolve();
      }
    });

    serverProcess.stderr?.on('data', (d: Buffer) => {
      console.error('[server stderr]', d.toString());
    });

    serverProcess.on('error', (err) => {
      console.error('[server error]', err);
      tryResolve();
    });

    serverProcess.on('exit', (code, signal) => {
      console.log('[server exit]', code, signal);
    });

    // Timeout de segurança
    setTimeout(tryResolve, 5000);
  });
}

function createWindow() {
  if (mainWindow) return; // evita múltiplas janelas

  const iconPath = join(__dirname, '../public/icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'AWS Connect',
    icon: existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#0b1220',
    show: false,
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
    mainWindow.webContents.openDevTools(); // debug produção
  }

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (!isQuitting && process.platform !== 'darwin') app.quit();
  });
}

app.whenReady().then(async () => {
  // Ícone da dock no macOS
  if (process.platform === 'darwin') {
    const iconPath = join(__dirname, '../public/icon.png');
    if (existsSync(iconPath)) app.dock?.setIcon(iconPath);
  }

  if (!isDev) {
    await startServer();
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  serverProcess?.kill();
});

app.on('window-all-closed', () => {
  serverProcess?.kill();
  if (process.platform !== 'darwin') app.quit();
});
