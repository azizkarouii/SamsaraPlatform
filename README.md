# Samsara — Plateforme de location

Application web de gestion de locations saisonnières entre **propriétaires** et **samsars** (courtiers) : maisons, partage avec les samsars, calendriers de disponibilité, réservations, revenus et notifications.

Interface disponible en **français, anglais et arabe** (RTL), en mode clair et sombre.

## Fonctionnalités

| Domaine | Ce que l'application permet |
|---|---|
| Comptes | Inscription avec rôle (Propriétaire / Samsar) et confirmation de l'adresse email, session dans un cookie sécurisé avec limite de tentatives, mot de passe oublié par email, déconnexion de tous les appareils, profil, photo de profil |
| Maisons | Création et modification (équipements, contact, type), prix principal et prix par période chaque année, jusqu'à 10 photos avec couverture, liens externes, page publique partageable |
| Partage | Invitation d'un samsar sur une ou toutes les maisons, tarif de 10, 20 ou 30 TND par jour ou 10 % du total, retrait |
| Disponibilités | Calendriers par maison, blocage de dates par le propriétaire, recherche de maisons libres par période et par type |
| Réservations | Workflow `en attente → confirmée → en cours → terminée` (ou annulée) ; confirmation directe avec acompte ; une réservation en attente ne bloque pas les dates tant qu'une autre n'est pas confirmée ; prix négocié, fin anticipée, argent rendu ; chaque paiement du client est enregistré ; historique de qui a fait quoi ; deux séjours confirmés ne peuvent pas se chevaucher (contrainte en base) |
| Suivi | Tableau de bord calculé par le serveur (argent reçu, à venir, reste à encaisser, gains par location), rapports par période en Excel ou PDF, notifications traduites |

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

Les tables sont créées et mises à jour au démarrage du backend par les migrations Flyway. Pour changer le schéma, ajoutez un fichier `V4__description.sql` : Hibernate vérifie seulement que le schéma correspond aux entités (`ddl-auto: validate`).

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
| `spring.mail.*`, `MAIL_FROM` | Serveur d'envoi des emails. Sans serveur, les liens (confirmation, réinitialisation) sont écrits dans les logs du backend |
| `EMAIL_VERIFICATION` | `true` par défaut : un nouveau compte doit confirmer son adresse avant de se connecter. `false` pour s'en passer en local |
| `COOKIE_SECURE` | `true` par défaut : le cookie de session n'est envoyé qu'en HTTPS. Mettre `false` en local sur `http://localhost` |
| `STORAGE_TYPE`, `S3_*` | Photos dans un stockage compatible S3 (`STORAGE_TYPE=s3`) au lieu du disque |

## Tests

```bash
cd backend && mvn test        # règles métier via l'API, sur une base H2 en mémoire
cd frontend && npx ng test --watch=false --browsers=ChromeHeadless
```

GitHub Actions (`.github/workflows/ci.yml`) lance ces tests à chaque push : le backend deux fois, sur H2 puis sur PostgreSQL 16 avec le schéma construit par Flyway (ce qui teste aussi la contrainte anti-chevauchement), et le frontend (build et tests).

## Déploiement

1. Définir les variables ci-dessus sur l'hébergeur, avec un nouveau `JWT_SECRET` et un vrai serveur d'emails (sinon personne ne peut confirmer son compte).
2. Backend : `mvn package`, puis lancer le jar. Les migrations s'appliquent au démarrage.
3. Frontend : `npx ng build`, puis servir `dist/frontend/browser` en renvoyant les routes inconnues vers `index.html`. Il appelle l'API sur `/api` du même domaine. C'est nécessaire pour le cookie de session (`SameSite=Lax`) : servir le site et l'API sous le même domaine, en HTTPS.
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

- Chaque paiement du client est enregistré (montant, date, note) ; l'acompte est le premier. Quand le séjour commence, le reste est enregistré automatiquement comme « solde payé à l'arrivée » : le propriétaire le supprime ou le corrige si le client n'a pas tout payé.
- L'acompte revient au propriétaire et ne se rend pas, sauf s'il le décide (tout ou partie).
- Le gain du samsar est pris sur ce que le client a payé après l'acompte, au fur et à mesure des paiements. Ex. : séjour de 3000, acompte de 1000, gain de 300 → le samsar reçoit ses 300 sur les 2000 suivants.
- Prix négocié : c'est ce que paie le client, le samsar garde son tarif (10 % du nouveau total, ou sa marge par jour), pris sur la part du propriétaire.
- Fin anticipée : le prix et le gain ne changent pas. Chacun peut rendre de l'argent sur sa propre part.
- Montants en `numeric(12,2)` et dates en `date` dans la base. Ces calculs sont faits par le serveur (`ReservationEarnings`).

## Notes

- Les photos téléversées en développement vont dans `backend/uploads/`, exclu de git.
- La limite de tentatives de connexion est gardée en mémoire : elle vaut pour une seule instance du backend.
- Changer ou réinitialiser son mot de passe déconnecte les autres appareils (version du jeton dans `users.token_version`).
- Le stockage S3 est testé avec un faux service ; il reste à l'essayer avec un vrai fournisseur.
- Le détail des fonctionnalités, des règles métier et de l'historique des évolutions se trouve dans [RAPPORT_IMPLEMENTATION.md](RAPPORT_IMPLEMENTATION.md).
