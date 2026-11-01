# Samsara — Plateforme de location

Application web de gestion de locations saisonnières entre **propriétaires** et **samsars** (courtiers) : maisons, partage avec les samsars, calendriers de disponibilité, réservations, revenus et notifications.

Interface disponible en **français, anglais et arabe** (RTL), en mode clair et sombre.

## Fonctionnalités

| Domaine | Ce que l'application permet |
|---|---|
| Comptes | Inscription avec rôle (Propriétaire / Samsar), connexion JWT, profil, mot de passe, photo de profil |
| Maisons | Création et modification (prix, équipements, contact), jusqu'à 10 photos avec couverture, page publique partageable |
| Partage | Invitation d'un samsar sur une ou toutes les maisons, marge de 10, 20 ou 30 TND par jour, retrait |
| Disponibilités | Calendriers par maison, blocage de dates par le propriétaire, recherche de maisons libres sur une période |
| Réservations | Création, modification, workflow `en attente → confirmée → en cours → terminée` (ou annulée) ; confirmation directe avec acompte ; une réservation en attente ne bloque pas les dates tant qu'une autre n'est pas confirmée |
| Suivi | Tableau de bord (revenus, statuts, arrivées à venir), historique des revenus, notifications |

## Stack technique

| Partie | Technologies |
|---|---|
| Frontend | Angular 17, Angular Material, TypeScript |
| Backend | Spring Boot 3.2 (Java 21), Spring Security + JWT, Spring Data JPA |
| Base de données | PostgreSQL (16 en développement) |
| Fichiers | Photos stockées sur disque en développement (`backend/uploads/`) |

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

Les tables sont créées et mises à jour automatiquement au démarrage du backend (`spring.jpa.hibernate.ddl-auto: update`).

### 2. Backend

Renseigner l'accès à la base dans `backend/src/main/resources/application.yml` (`spring.datasource.url`, `username`, `password`), puis :

```bash
cd backend
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

Dans `backend/src/main/resources/application.yml` :

| Clé | Rôle |
|---|---|
| `server.port`, `server.servlet.context-path` | Port (3001) et préfixe (`/api`) de l'API |
| `spring.datasource.*` | Connexion PostgreSQL |
| `spring.servlet.multipart.*` | Taille maximale des envois de photos (5 Mo par fichier) |
| `application.jwt.secret`, `application.jwt.expiration` | Signature et durée des jetons (**changer le secret en production**) |
| `application.storage.local-dir` | Dossier des photos téléversées (`uploads` par défaut) |

## Structure du projet

```
Samsara/
├── backend/                     API Spring Boot
│   └── src/main/java/com/samsara/
│       ├── config/              sécurité, CORS, JWT, gestion d'erreurs, service des fichiers
│       ├── controller/          endpoints REST
│       ├── service/             règles métier (accès, réservations, partage, photos…)
│       ├── entity/  repository/ dto/
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
- **Samsar** : voit les maisons qui lui sont partagées, réserve pour ses clients (dans la limite prix + marge), gère ses propres réservations et consulte en lecture seule celles des autres sur ses maisons.

## Notes

- Les photos téléversées en développement vont dans `backend/uploads/`, exclu de git. Avant un déploiement, prévoir un stockage cloud (l'interface `ImageStorage` le permet) et des migrations versionnées (Flyway) à la place de `ddl-auto: update`.
- Le détail des fonctionnalités, des règles métier et de l'historique des évolutions se trouve dans [RAPPORT_IMPLEMENTATION.md](RAPPORT_IMPLEMENTATION.md).
