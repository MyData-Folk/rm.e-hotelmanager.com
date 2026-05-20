# Guide de Déploiement Coolify & Configuration PostgreSQL

Ce guide explique étape par étape comment créer une base de données PostgreSQL dans Coolify, configurer les variables d'environnement, et déployer l'application multi-services **RM e-HotelManager** (backend, admin-web, user-web) à partir du fichier `docker-compose.prod.yml`.

---

## 1. Création de la Base de Données PostgreSQL dans Coolify

Coolify permet de déployer des bases de données managées en un clic.

### Étape A : Créer la ressource PostgreSQL
1. Connectez-vous à votre console **Coolify**.
2. Allez dans le **Projet** et l'**Environnement** de votre choix (ex: `production`).
3. Cliquez sur **New Resource** (ou **Add Resource**) en haut à droite.
4. Sélectionnez **PostgreSQL** dans la liste des bases de données.
5. Renseignez les informations de base :
   - **Destination/Server** : Sélectionnez votre serveur (ex: `localhost`).
   - **Database Name** : `hotelmanager` (ou le nom de votre choix).
   - **Username** : `postgres` (ou un utilisateur personnalisé).
   - **Password** : Laissez Coolify générer un mot de passe fort ou saisissez-le.
6. Cliquez sur **Deploy**.

### Étape B : Récupérer les informations de connexion
Une fois la base de données déployée avec succès (statut *Running*) :
1. Allez dans l'onglet **Configurations** de la base de données.
2. Notez l'**URL de connexion interne** (Internal Connection String). Elle ressemble généralement à :
   `postgresql://postgres:votre_mot_de_passe@<nom-du-conteneur-db>:5432/hotelmanager`
   *Note : Utilisez cette URL interne pour les communications de conteneur à conteneur au sein du réseau Coolify Docker.*
3. Si vous devez y accéder depuis l'extérieur (ex: pour des migrations locales), notez l'**URL de connexion externe** (External Connection String) en activant la redirection de port public dans Coolify.

---

## 2. Déploiement de la Stack Multi-Services

L'application utilise un fichier `docker-compose.prod.yml` contenant 3 services :
1. **`hotel-rm-backend`** (Express + PostgreSQL)
2. **`hotel-rm-admin-web`** (Interface Administrateur)
3. **`hotel-rm-user-web`** (Interface Utilisateur Hôtel)

### Étape A : Créer l'application Docker Compose dans Coolify
1. Dans votre projet Coolify, cliquez à nouveau sur **New Resource**.
2. Choisissez **Docker Compose** (ou **Public/Private Repository** en spécifiant que vous utilisez un Docker Compose).
3. Connectez votre dépôt GitHub `MyData-Folk/rm.e-hotelmanager.com`.
4. Sélectionnez la branche `main`.
5. Indiquez le chemin du fichier Compose : `docker-compose.prod.yml`.
6. Cliquez sur **Load / Import**.

---

## 3. Configuration des Variables d'Environnement

Dans l'onglet **Environment Variables** de votre application Docker Compose dans Coolify, configurez les variables requises par le fichier Compose :

| Variable | Description / Valeur | Exemple |
| :--- | :--- | :--- |
| `DATABASE_URL` | L'URL de connexion interne PostgreSQL récupérée à l'étape 1.B. | `postgresql://postgres:motdepasse@hotel-postgres:5432/hotelmanager` |
| `ADMIN_API_KEY` | Clé secrète d'administration pour sécuriser les routes privées. | `SuperSecretAdminKey123!` |
| `DEFAULT_RATE_SOURCE_MODE` | Mode de calcul par défaut (`hybrid`, `calculated`, ou `excel`). | `hybrid` |

*Note : Coolify injectera automatiquement ces variables d'environnement dans le conteneur du backend lors du démarrage.*

---

## 4. Configuration des Domaines et Réseau Traefik

Le fichier `docker-compose.prod.yml` utilise des labels Traefik pour mapper automatiquement les domaines HTTPS avec certificats SSL Let's Encrypt :

- **Portail Utilisateur** : `https://hotel.hotelmanager.fr`
- **Portail Administrateur** : `https://admin.hotelmanager.fr`
- **API Backend** : `https://api.hotelmanager.fr`

### Point important pour Coolify :
1. Assurez-vous que le réseau Docker `coolify` est bien configuré sur votre serveur. Le compose y fait référence en réseau externe :
   ```yaml
   networks:
     coolify:
       external: true
   ```
2. Configurez vos enregistrements **DNS A** chez votre registrar (ex: OVH, Cloudflare) pour pointer vers l'adresse IP publique de votre serveur Coolify :
   - `hotel.hotelmanager.fr` → `IP_DU_SERVEUR`
   - `admin.hotelmanager.fr` → `IP_DU_SERVEUR`
   - `api.hotelmanager.fr` → `IP_DU_SERVEUR`

---

## 5. Lancement et Suivi du Déploiement

1. Dans Coolify, cliquez sur **Deploy** sur l'application Docker Compose.
2. Coolify va :
   - Cloner le dépôt.
   - Builder les images Docker pour chaque service (backend, admin-web, user-web) en injectant les arguments d'API.
   - Lancer les conteneurs et les lier au reverse proxy Traefik.
3. Suivez les logs de build en direct.
4. Une fois déployé, visitez `https://hotel.hotelmanager.fr` pour tester l'accès utilisateur et `https://admin.hotelmanager.fr` pour le portail d'administration globale.
