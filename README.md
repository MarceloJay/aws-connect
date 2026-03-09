# AWS SSM Manager

Aplicação desktop para gerenciar conexões AWS SSM com suporte a perfis SSO e Access Keys.

## Requisitos

- Node.js 18+
- AWS CLI instalado e configurado
- npm

## Instalação

```bash
# 1. Instalar dependências do frontend
npm install

# 2. Instalar dependências do backend
cd server && npm install && cd ..
```

## Rodar localmente (modo web)

Abra **dois terminais**:

```bash
# Terminal 1 - Backend (porta 3001)
cd server
npm run dev

# Terminal 2 - Frontend (porta 3000)
npm run dev
```

Acesse: http://localhost:3000

---

## Rodar localmente (modo Electron)

Com o backend e frontend já rodando (passos acima), abra um **terceiro terminal**:

```bash
# Compila o Electron e abre a janela desktop
npx tsc -p electron/tsconfig.json
NODE_ENV=development npx electron .

npm run dev
Terminal 2 (backend):

cd server && npm run dev
Terminal 3 (Electron, só depois dos dois acima estarem rodando):

NODE_ENV=development npx electron .
```

---

## Gerar executável

```bash
# Mac (gera .dmg em /release)
npm run dist:mac

# Windows (gera .exe em /release)
npm run dist:win

# Linux (gera .AppImage em /release)
npm run dist:linux
```

> O executável inclui o servidor backend embutido, não precisa de terminais abertos.

---

## Estrutura

```
├── src/              # Frontend React + TypeScript
├── server/src/       # Backend Express
├── electron/         # Electron main process
├── dist/             # Frontend compilado
├── dist-electron/    # Electron compilado
└── release/          # Executáveis gerados
```
