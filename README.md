# Samsara — Plateforme de location

Application web de gestion de locations saisonnières entre **propriétaires** et **samsars** (courtiers) : maisons, partage avec les samsars, calendriers de disponibilité, réservations, revenus et notifications.

Interface disponible en **français, anglais et arabe** (RTL), en mode clair et sombre.

## Fonctionnalités

| Domaine | Ce que l'application permet |
|---|---|
| Comptes | Inscription avec rôle (Propriétaire / Samsar), connexion JWT avec limite de tentatives, mot de passe oublié par email, profil, photo de profil |
| Maisons | Création et modification (équipements, contact, type), prix principal et prix par période chaque année, jusqu'à 10 photos avec couverture, liens externes, page publique partageable |
| Partage | Invitation d'un samsar sur une ou toutes les maisons, tarif de 10, 20 ou 30 TND par jour ou 10 % du total, retrait |
| Disponibilités | Calendriers par maison, blocage de dates par le propriétaire, recherche de maisons libres par période et par type |
| Réservations | Workflow `en attente → confirmée → en cours → terminée` (ou annulée) ; confirmation directe avec acompte ; une réservation en attente ne bloque pas les dates tant qu'une autre n'est pas confirmée ; prix négocié, fin anticipée, argent rendu |
| Suivi | Tableau de bord (argent acquis, gains du samsar par location, statuts, arrivées), notifications traduites |

## Stack technique

| Partie | Technologies |
|---|---|
| Frontend | Angular 17, Angular Material, TypeScript |
| Backend | Spring Boot 3.2 (Java 21), Spring Security + JWT, Spring Data JPA |
| Base de données | PostgreSQL (16 en développement) |
| Migrations | Flyway (`backend/src/main/resources/db/migration`) |
| Fichiers | Photos sur disque en développement (`backend/uploads/`), stockage compatible S3 en production |

## Prérequis

- **Java 21** et **Maven 3.9+**
- **Node.js 18+** et **npm**
- **PostgreSQL** avec une base nommée `Samsara`

## Installation et lancement

### 1. Base de données

Créer la base :

```sql
CREATE DATABASE "Samsara";
```

Les tables sont créées et mises à jour au démarrage du backend par les migrations Flyway. Pour changer le schéma, ajoutez un fichier `V3__description.sql` : Hibernate vérifie seulement que le schéma correspond aux entités (`ddl-auto: validate`).

### 2. Backend

Les secrets ne sont jamais dans le code. Copiez le modèle et remplissez-le :

```bash
cd backend
cp .env.example .env      # puis renseignez DB_PASSWORD et JWT_SECRET
mvn spring-boot:run
```

L'API écoute sur **http://localhost:3001/api**.

### 3. Frontend

```bash
cd frontend
npm install
npx ng serve
```

L'application est servie sur **http://localhost:4200** (utiliser `--port 4300` si le port est déjà pris). L'adresse de l'API se règle dans `frontend/src/environments/`.

## Configuration

Par variables d'environnement, ou dans `backend/.env` en local (ignoré par git, voir `backend/.env.example`) :

| Variable | Rôle |
|---|---|
| `DB_PASSWORD` (requis), `DB_URL`, `DB_USERNAME` | Connexion PostgreSQL |
| `JWT_SECRET` (requis) | Signature des jetons, 32 caractères au moins |
| `PORT` | Port de l'API (3001 par défaut) |
| `FRONTEND_URL` | Adresse du site, utilisée dans les liens envoyés par email |
| `CORS_ALLOWED_ORIGINS` | Origines autorisées à appeler l'API, séparées par des virgules |
| `spring.mail.*`, `MAIL_FROM` | Serveur d'envoi des emails. Sans serveur, le lien de réinitialisation est écrit dans les logs du backend |
| `STORAGE_TYPE`, `S3_*` | Photos dans un stockage compatible S3 (`STORAGE_TYPE=s3`) au lieu du disque |

## Tests

```bash
cd backend && mvn test        # règles métier via l'API, sur une base H2 en mémoire
cd frontend && npx ng test --watch=false --browsers=ChromeHeadless
```

## Déploiement

1. Définir les variables ci-dessus sur l'hébergeur, avec un nouveau `JWT_SECRET`.
2. Backend : `mvn package`, puis lancer le jar. Les migrations s'appliquent au démarrage.
3. Frontend : `npx ng build`, puis servir `dist/frontend/browser` en renvoyant les routes inconnues vers `index.html`. Il appelle l'API sur `/api` du même domaine (à changer dans `src/environments/environment.ts` si elle est ailleurs).
4. Si le disque de l'hébergeur n'est pas permanent, utiliser `STORAGE_TYPE=s3` pour les photos.

## Structure du projet

```
Samsara/
├── backend/                     API Spring Boot
│   └── src/main/java/com/samsara/
│       ├── config/              sécurité, CORS, JWT, erreurs traduites, service des fichiers
│       ├── controller/          endpoints REST
│       ├── service/             règles métier (accès, réservations, partage, photos…)
│       ├── entity/  repository/ dto/
│   └── src/main/resources/db/migration/   migrations Flyway
├── frontend/                    application Angular
│   └── src/app/
│       ├── layout/              barre latérale et barre supérieure
│       ├── pages/               écrans (tableau de bord, maisons, réservations, profil…)
│       ├── services/  models/   accès à l'API et types
│       └── shared/              composants réutilisables, traductions, utilitaires
└── RAPPORT_IMPLEMENTATION.md    rapport détaillé des fonctionnalités et des évolutions
```

## Rôles

- **Propriétaire** : gère ses maisons, leurs photos et leurs disponibilités, invite des samsars et fixe leur marge, voit toutes les réservations de ses maisons.
- **Samsar** : voit les maisons qui lui sont partagées, réserve pour ses clients (dans la limite prix + marge), gère ses propres réservations et consulte en lecture seule celles des autres sur ses maisons, sans voir leurs gains.

## Règles d'argent

- L'acompte revient au propriétaire et ne se rend pas, sauf s'il le décide (tout ou partie).
- Le gain du samsar est pris sur ce que le client paie après l'acompte : il arrive au début du séjour. Si un séjour en cours est annulé, il est limité à ce qui a été payé après l'acompte.
- Prix négocié : c'est ce que paie le client, le samsar garde son tarif (10 % du nouveau total, ou sa marge par jour), pris sur la part du propriétaire.
- Fin anticipée : le prix et le gain ne changent pas. Chacun peut rendre de l'argent sur sa propre part.
- Ces calculs sont faits par le serveur (`ReservationEarnings`).

## Notes

- Les photos téléversées en développement vont dans `backend/uploads/`, exclu de git.
- La limite de tentatives de connexion est gardée en mémoire : elle vaut pour une seule instance du backend.
- Le détail des fonctionnalités, des règles métier et de l'historique des évolutions se trouve dans [RAPPORT_IMPLEMENTATION.md](RAPPORT_IMPLEMENTATION.md).
