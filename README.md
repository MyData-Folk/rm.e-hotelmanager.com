# RM e-HotelManager

> Système de Revenue Management hôtelier multi-module — Express/TypeScript · PostgreSQL · React 19 · Vite · Docker

---

## Architecture

```
/
├── apps/
│   ├── admin-web/     → Interface d'administration  (React 19 + Tailwind v4 + Vite)
│   └── user-web/      → Interface utilisateur       (React + Vite)
├── backend/           → API REST                    (Express + TypeScript + PostgreSQL)
├── docker-compose.yml          ← Stack locale (développement)
├── docker-compose.prod.yml     ← Stack production  (Traefik + SSL)
└── .env.example                ← Template de configuration
```

| Service    | Dev URL                    | Production URL                       |
|------------|----------------------------|--------------------------------------|
| API        | http://localhost:8000      | https://api.hotelmanager.fr          |
| Admin      | http://localhost:8080      | https://admin.hotelmanager.fr        |
| User       | http://localhost:8081      | https://hotel.hotelmanager.fr        |
| PostgreSQL | localhost:5432             | interne (non exposé en prod)         |

---

## Démarrage rapide — Docker (recommandé)

```bash
# 1. Copier le template d'environnement
cp .env.example .env

# 2. Lancer tous les services
docker compose up --build
```

Les 4 services démarrent dans l'ordre :  
`hotel-db` → `backend` (attend healthcheck DB) → `admin-web` + `user-web`

---

## Démarrage rapide — Sans Docker (développement)

**Prérequis :** Node.js 22+, PostgreSQL 17 local

```bash
# Terminal 1 — API Backend
cd backend
npm install
npm run dev        # écoute sur http://localhost:8000

# Terminal 2 — Admin UI
cd apps/admin-web
npm install
npm run dev        # écoute sur http://localhost:5173

# Terminal 3 — User UI
cd apps/user-web
npm install
npm run dev        # écoute sur http://localhost:5174
```

Créer la base locale :
```sql
CREATE DATABASE hoteldb;
```

---

## Déploiement en production (Traefik)

```bash
# 1. Créer le réseau Traefik (une seule fois sur le serveur)
docker network create traefik-public

# 2. Configurer les secrets
cp .env.example .env
# → Renseigner : POSTGRES_PASSWORD, ADMIN_API_KEY, DATABASE_URL

# 3. Déployer
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

> **Important :** Ne jamais commiter le fichier `.env` — il contient des secrets sensibles.

---

## Variables d'environnement principales

| Variable                  | Description                                  |
|---------------------------|----------------------------------------------|
| `DATABASE_URL`            | URL de connexion PostgreSQL                  |
| `ADMIN_API_KEY`           | Clé secrète pour les routes admin            |
| `VITE_API_URL`            | URL de l'API backend (bakée au build Vite)   |
| `USER_WEB_ORIGIN`         | Origine CORS autorisée pour le user-web      |
| `ADMIN_WEB_ORIGIN`        | Origine CORS autorisée pour l'admin-web      |
| `DEFAULT_RATE_SOURCE_MODE`| Mode de calcul : `hybrid` / `calculated` / `excel` |

Voir [.env.example](.env.example) pour toutes les valeurs.

---

## Structure du backend

Le backend expose deux groupes de routes :

- **`/api/*`** — Routes complètes pour l'interface d'administration
- **`/hotels`, `/partners`, `/availability`, `/rates/grid`, `/simulate`, …** — Routes de compatibilité pour l'interface utilisateur

La persistance utilise PostgreSQL avec stockage **JSONB** : chaque hôtel est un document JSON versionné. Les calculs tarifaires (règles, plans, commissions OTA) s'exécutent en mémoire pour une réponse synchrone, puis sont persistés asynchroniquement.
