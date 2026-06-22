# Spécification du Projet - Application Samsara

## Addendum Web Actuel

Le workspace courant contient une application web Angular + Spring Boot. Les points de suivi les plus récents sont:

- Auth UI améliorée pour login/register et correction des icônes Material.
- Tableau de bord, profil et liste des propriétés branchés sur les données du compte connecté.
- Partage propriétaire → samsar via email + téléphone, avec notification automatique.
- Règle métier de hausse de prix limitée à 10, 20 ou 30 TND.
- Affichage monétaire en TND et préfixe téléphone +216 côté interface.
- Page publique de détail propriété accessible via un lien partageable.
- Toggle langue FR/EN et mode sombre dans le shell principal.

## 1. Présentation Générale

**Projet :** Samsara - Application de Gestion de Locations Saisonnières pour Courtiers  
**Type :** Application mobile Android  
**Base de données :** SQLite locale (`samsara.db`)  
**Cible SDK :** Android 36 (min SDK 24)  
**Architecture :** Activités + Fragments + DAOs SQLite

---

## 2. Structure du Projet

```
app/src/main/java/com/example/projetmobilemysql/
├── activities/          (13 écrans)
│   ├── LoginActivity
│   ├── RegisterActivity
│   ├── MainActivity
│   ├── AddPropertyActivity
│   ├── AddReservationActivity
│   ├── PropertyDetailActivity
│   ├── PropertyViewActivity
│   ├── PropertyCalendarActivity
│   ├── ReservationDetailActivity
│   ├── ReservationCalendarPickerActivity
│   ├── EditProfileActivity
│   ├── NotificationsActivity
│   └── ImageFullScreenActivity
├── adapters/            (6 adaptateurs de listes)
│   ├── PropertyAdapter
│   ├── ReservationAdapter
│   ├── NotificationAdapter
│   ├── PropertyImageAdapter
│   ├── ImagePagerAdapter
│   └── CalendarReservationAdapter
├── database/            (8 fichiers d'accès aux données)
│   ├── DatabaseHelper (gestionnaire de connexion et migrations)
│   ├── UserDAO
│   ├── PropertyDAO
│   ├── ReservationDAO
│   ├── PropertyAvailabilityDAO
│   ├── PropertyImageDAO
│   ├── RevenueHistoryDAO
│   └── NotificationDAO
├── fragments/           (3 fragments d'interface)
│   ├── PropertiesFragment
│   ├── ReservationsFragment
│   └── ProfileFragment
├── models/              (6 modèles de données)
│   ├── User
│   ├── Property
│   ├── Reservation
│   ├── PropertyAvailability
│   ├── PropertyImage
│   └── Notification
└── utils/               (3 utilitaires)
    ├── NotificationHelper (notifications système)
    ├── ReservationStatusUpdater (mise à jour automatique des statuts)
    └── TestDataHelper (génération de données de test - inactif)
```

---

## 3. Schéma de la Base de Données (8 tables)

### 3.1. `users`
| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | entier | PRIMARY KEY AUTOINCREMENT |
| name | texte | NOT NULL |
| email | texte | UNIQUE NOT NULL |
| password | texte | NOT NULL (hash) |
| phone | texte | - |
| photo_url | texte | - |
| created_at | date | DEFAULT date courante |

### 3.2. `properties`
| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | entier | PRIMARY KEY AUTOINCREMENT |
| title | texte | NOT NULL |
| configuration | texte | (ex: "S+1", "S+2") |
| haut_standing | booléen | DEFAULT faux |
| appartient_residence | booléen | DEFAULT faux |
| price_per_day | réel | - |
| price_per_week | réel | - |
| price_per_month | réel | - |
| distance_beach | réel | - |
| max_capacity | entier | - |
| address | texte | - |
| owner_contact | texte | - |
| air_condition | booléen | DEFAULT faux |
| wifi | booléen | DEFAULT faux |
| garage | booléen | DEFAULT faux |
| pool | booléen | DEFAULT faux |
| kitchen | booléen | DEFAULT faux |
| sea_view | booléen | DEFAULT faux |
| terrace | booléen | DEFAULT faux |
| bathrooms | entier | - |
| photos | texte | - |
| description | texte | - |
| created_by | entier | FK → users(id) |
| created_at | date | DEFAULT date courante |
| updated_at | date | DEFAULT date courante |

### 3.3. `reservations`
| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | entier | PRIMARY KEY AUTOINCREMENT |
| property_id | entier | NOT NULL, FK → properties(id) |
| samsar_id | entier | NOT NULL, FK → users(id) |
| start_date | texte | NOT NULL |
| end_date | texte | NOT NULL |
| check_in_time | texte | DEFAULT '14:00' |
| check_out_time | texte | DEFAULT '12:00' |
| status | texte | DEFAULT 'pending' |
| client_name | texte | NOT NULL |
| client_phone | texte | - |
| advance_amount | réel | DEFAULT 0 |
| total_amount | réel | NOT NULL |
| notes | texte | - |
| created_at | date | DEFAULT date courante |
| updated_at | date | DEFAULT date courante |

**Statuts possibles :** `pending` (En attente), `reserved` (Réservé), `active` (En cours), `completed` (Terminée), `cancelled` (Annulé)

### 3.4. `property_samsars` (table de jonction)
| Colonne | Type | Contraintes |
|---------|------|-------------|
| property_id | entier | PRIMARY KEY, FK → properties(id) |
| samsar_id | entier | PRIMARY KEY, FK → users(id) |

### 3.5. `property_availability`
| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | entier | PRIMARY KEY AUTOINCREMENT |
| property_id | entier | NOT NULL, FK → properties(id) ON DELETE CASCADE |
| date | texte | NOT NULL |
| status | texte | DEFAULT 'available' |
| notes | texte | - |
| created_at | date | DEFAULT date courante |
| **UNIQUE** | | (property_id, date) |

### 3.6. `revenue_history`
| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | entier | PRIMARY KEY AUTOINCREMENT |
| user_id | entier | NOT NULL, FK → users(id) |
| reservation_id | entier | NOT NULL, FK → reservations(id) ON DELETE CASCADE |
| amount | réel | NOT NULL |
| type | texte | NOT NULL ("advance"/"completion"/"refund") |
| created_at | date | DEFAULT date courante |

### 3.7. `property_images`
| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | entier | PRIMARY KEY AUTOINCREMENT |
| property_id | entier | NOT NULL, FK → properties(id) ON DELETE CASCADE |
| image_path | texte | NOT NULL |
| is_main | booléen | DEFAULT faux |
| position | entier | DEFAULT 0 |
| created_at | date | DEFAULT date courante |

### 3.8. `notifications`
| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | entier | PRIMARY KEY AUTOINCREMENT |
| user_id | entier | NOT NULL, FK → users(id) ON DELETE CASCADE |
| reservation_id | entier | NOT NULL, FK → reservations(id) ON DELETE CASCADE |
| property_id | entier | NOT NULL, FK → properties(id) ON DELETE CASCADE |
| type | texte | NOT NULL |
| title | texte | NOT NULL |
| message | texte | NOT NULL |
| is_read | booléen | DEFAULT faux |
| created_at | date | DEFAULT date courante |

---

## 4. Fonctionnalités Implémentées

### F1. Authentification et Gestion de Compte ✅

**Écrans :** Login, Register, EditProfile

- Inscription avec validation : nom (3+ caractères), téléphone (8+ chiffres), email (format valide, unicité), mot de passe (6+ caractères, confirmation)
- Connexion avec email + mot de passe hashé
- Session persistée localement avec `user_id`, `user_name`, `user_email`
- Édition du profil (nom, téléphone)
- Changement de mot de passe (avec ancien mot de passe requis)
- Suppression de compte (avec effacement de la session)
- Vérification automatique de session au lancement
- Mot de passe oublié (vérifie si l'email existe et invite à contacter l'administrateur)

### F2. Gestion des Propriétés ✅

**Écrans :** Liste des propriétés, Ajout, Vue détaillée (lecture), Édition  
**Accès données :** PropertyDAO

- **Création :** Titre, configuration (S+1, S+2...), haut standing (booléen), appartient à une résidence (booléen), prix (jour/semaine/mois), distance plage, capacité max, adresse, contact propriétaire, équipements (WiFi, Clim, Piscine, Vue mer, Terrasse, Cuisine, Garage), nombre de salles de bain, description
- **Photos :** Import depuis la galerie ou prise de vue directe, copie dans le stockage local, marquage d'image principale, grille d'images avec suppression
- **Consultation :** Vue détaillée en lecture seule avec image principale et galerie horizontale
- **Modification :** Tous les champs éditables + ajout/suppression d'images
- **Suppression :** Avec confirmation, supprime les fichiers physiques et les entrées en base
- **Filtrage :** Chaque courtier ne voit que ses propres propriétés
- **Recherche :** Par titre via une barre de recherche dans l'en-tête

### F3. Gestion des Propriétaires ✅

- Les propriétaires sont modélisés via le champ `owner_contact` (numéro de téléphone) dans la table `properties`
- Données de référence dans le système (pas d'authentification propre pour les propriétaires)
- Le numéro de propriétaire sert de clé de partage entre courtiers (voir F4)

### F4. Collaboration avec d'autres Courtiers ✅

**Principe :** Système de partage par `owner_contact`

- **Principe :** Deux courtiers sont considérés comme "collaborant" s'ils ont tous deux créé des propriétés avec le **même numéro de propriétaire** (`owner_contact`)
- **Détection :** Recherche de tous les courtiers liés à un même propriétaire via le champ `owner_contact`
- **Visibilité des réservations :** Un courtier voit les réservations de toutes les propriétés partagées via `owner_contact`
- **Calendrier partagé :** Les réservations de toutes les propriétés avec le même contact propriétaire sont affichées dans un calendrier unifié
- **Protection des données :** Un courtier ne peut pas modifier/supprimer les réservations d'un autre courtier (interface en lecture seule)
- **Notifications inter-courtiers :** Envoi de notifications à tous les autres courtiers partageant un même propriétaire lors de création/modification de réservation

### F5. Gestion du Calendrier et des Disponibilités ✅

**Écrans :** PropertyCalendar, ReservationCalendarPicker  
**Accès données :** PropertyAvailabilityDAO

- **Calendrier visuel :** Composant calendrier avec affichage du statut par date sélectionnée
- **Statuts manuels :** Disponible, En attente, Non disponible
- **Indicateur de statut** avec code couleur (Vert=disponible, Orange=en attente, Rouge=réservé/non disponible, Gris-bleu=réservé par autre courtier)
- **Vue des réservations** liées à la période sélectionnée
- **Indicateurs :** Comptage des réservations en cours et à venir
- **Blocage des modifications :** Impossible de modifier une date si elle est réservée par un autre courtier ou si la réservation est confirmée
- **Sélecteur de dates :** Calendrier dédié pour choisir une période avec vérification de conflit avant validation

### F6. Gestion des Réservations ✅

**Écrans :** Liste des réservations, Ajout, Détail  
**Accès données :** ReservationDAO

- **Création :** Sélection de propriété, client (nom, téléphone), dates, heures (check-in/check-out), montant total (calcul automatique jours × prix/jour), avance, statut, notes
- **Calcul automatique :** Montant total = nombre de jours × prix par jour (inclut le dernier jour)
- **Filtrage par onglets :** Toutes / En attente / Confirmées
- **Workflow de statuts :** `pending` → `reserved` → `active` (automatique ou manuel) → `completed` (automatique) / `cancelled`
- **Bouton d'activation :** Passe une réservation en "En cours"
- **Modification :** Tous les champs + changement de statut, avec notification aux collaborateurs
- **Suppression :** Avec remboursement si avance payée (entrée `refund` dans l'historique des revenus)
- **Protection :** Un courtier ne peut modifier que ses propres réservations
- **Vérification disponibilité :** Avant création, vérification du calendrier partagé (owner_contact)

### F7. Recherche et Filtrage ✅

- **Propriétés :** Recherche par titre via barre de recherche (temps réel à partir de 2 caractères)
- **Réservations :** Recherche par nom client, téléphone, ou titre de propriété
- **Filtrage par caractéristiques :** Haut standing, Appartient à une résidence
- **Filtrage des réservations :** Par statut via onglets (Toutes / En attente / Confirmées)
- **Recherche avancée :** Critères disponibles dans le DAO (type, configuration, prix max, adresse)

### F8. Consultation de Statistiques ✅

**Écran :** Profil du courtier

- **Nombre de propriétés** du courtier connecté
- **Nombre de réservations visibles** (propres + partagées)
- **Revenu total :** Somme des montants des réservations avec statuts réservé/actif/terminé sur toutes les propriétés partagées

**Suivi des revenus :** RevenueHistoryDAO
- Types d'entrées : `advance` (avance reçue), `completion` (solde complété), `refund` (remboursement)
- Calcul : `advance + completion - refund`
- Historique des transactions consultable

### F9. Gestion des Notifications ✅

**Écrans :** NotificationsActivity (liste), NotificationHelper (système)  
**Accès données :** NotificationDAO

- **Types de notifications :** Nouvelle réservation, Mise à jour de réservation, Annulation de réservation
- **Stockage :** Notification en base de données + notification système mobile
- **Destinataires :** Tous les courtiers partageant le même propriétaire, sauf le créateur
- **Badge :** Compteur de notifications non lues dans l'en-tête (limité à 99+)
- **Marquage comme lues :** Individuel (au clic) ou tout marquer (bouton)
- **Suppression :** Individuelle
- **Navigation :** Clic sur notification → ouvre les détails de la réservation concernée
- **Mise à jour :** Le badge est rafraîchi à chaque retour sur l'écran principal

### F10. Consultation d'Historique ✅

- **Historique des réservations :** Toutes les réservations visibles listées avec statut, dates, client, montant
- **Historique des revenus :** Transactions avec type et montant
- **Calendrier :** Historique des disponibilités par date
- **Notifications :** Toutes les notifications stockées avec date de création
- **Données de test :** Script de génération de données de test (inactif)

---

## 5. Flux de Navigation

```
Écran de connexion
  ├── Écran d'inscription
  └── Écran principal
        ├── Onglet Propriétés
        │     ├── Ajout de propriété
        │     ├── Vue détaillée (lecture seule)
        │     │     └── Édition de propriété
        │     └── Calendrier de la propriété
        ├── Onglet Réservations
        │     ├── Ajout de réservation
        │     │     └── Sélecteur de dates calendrier
        │     └── Détail de la réservation
        └── Onglet Profil
              ├── Édition du profil
              └── Dialogue de changement de mot de passe
```

---

## 6. Écrans et Interfaces

**24 écrans/fragments/dialogues :**
- 13 écrans (Activités)
- 3 fragments (écrans de navigation par onglets)
- 1 dialogue personnalisé (changement de mot de passe)
- 6 gabarits d'éléments de liste
- 1 composant de badge de notification

**Navigation :** Barre de navigation inférieure à 3 onglets + barre d'en-tête avec recherche, notifications et déconnexion

---

## 7. Workflow des Réservations

```
En attente ──→ Réservé ──→ En cours ──→ Terminée
     │                       │
     └── Annulé ─────────────┘
```
- **En attente :** Statut initial, peut être modifié
- **Réservé :** Confirmé avec ou sans avance
- **En cours :** Statut automatique quand la date d'arrivée est atteinte, ou activation manuelle
- **Terminé :** Automatique quand la date de fin est dépassée
- **Annulé :** Annulation manuelle

---

## 8. Mécanisme de Collaboration entre Courtiers

- **Clé de partage :** Le numéro de propriétaire (`owner_contact`) dans les propriétés
- Tous les courtiers ayant créé une propriété avec le même `owner_contact` sont automatiquement liés
- Ils voient les réservations de toutes ces propriétés dans leur calendrier partagé
- Un courtier ne peut **pas modifier/supprimer** les réservations des autres
- Les notifications sont envoyées à tous les collaborateurs

---

## 9. Gestion Automatique des Statuts

- Mise à jour périodique des réservations dont la date d'arrivée est atteinte → passage en "En cours"
- Mise à jour des réservations dont la date de fin est dépassée → passage en "Terminée"
- Enregistrement automatique des revenus lors du passage en "En cours" (avance + complément)

---

## 10. Gestion des Images

- Import depuis la galerie ou prise de vue directe
- Copie dans le stockage local de l'application
- Grille d'images avec marquage d'image principale
- Mode plein écran avec navigation (glissement)
- Suppression avec nettoyage du fichier physique

---

## 11. Versions de la Base de Données

**Version actuelle : 6**
- **v1 :** Création initiale (users, properties, reservations, property_samsars)
- **v2 :** Ajout de la table `property_availability`
- **v3 :** Ajout des colonnes `check_in_time`, `check_out_time` dans reservations + table `revenue_history`
- **v4 :** Ajout de la table `property_images`
- **v5 :** Ajout de la table `notifications`
- **v6 :** Suppression de la colonne `type` dans `properties`, ajout de `haut_standing` et `appartient_residence`

Les migrations sont gérées par version avec détection d'existence pour éviter les doublons.

---

## 12. Couverture du Cahier des Charges

| Besoin Fonctionnel | Statut | Description |
|--------------------|--------|-------------|
| F1. Authentification et Gestion de Compte | ✅ Complet | Inscription, Connexion, Édition profil, Changement mot de passe, Suppression compte |
| F2. Gestion des Propriétés | ✅ Complet | CRUD complet avec photos, équipements, prix multiples |
| F3. Gestion des Propriétaires | ✅ Implémenté | Comme données de référence via `owner_contact` |
| F4. Collaboration avec d'autres Courtiers | ✅ Complet | Partage via `owner_contact`, notifications, protection des données |
| F5. Gestion du Calendrier et des Disponibilités | ✅ Complet | Calendrier visuel, statuts manuels, blocage intelligent |
| F6. Gestion des Réservations | ✅ Complet | CRUD, workflow de statuts, calcul automatique, suivi des revenus |
| F7. Recherche et Filtrage | ✅ Partiel | Recherche par titre, filtre par statut ; recherche multicritère prête en base mais non exposée dans l'interface |
| F8. Consultation de Statistiques | ✅ Implémenté | Nombre propriétés/réservations, revenu total |
| F9. Gestion des Notifications | ✅ Complet | Notifications en base + système, badge, marquage lu/non lu |
| F10. Consultation d'Historique | ✅ Implémenté | Historique réservations, revenus, notifications, calendrier |

---

## 13. Points d'Amélioration Potentiels

1. **Architecture :** Migrer vers un pattern MVVM/Repository avec couche de données propre
2. **Synchronisation distante :** Ajouter une API REST et un serveur distant pour synchronisation multi-appareils
3. **Données de test :** Activer/réécrire le générateur de données de test
4. **Recherche avancée :** Exposer les filtres multicritères dans l'interface (type, configuration, prix max, adresse)
5. **Réinitialisation de mot de passe :** Implémenter un vrai flux de réinitialisation par email
6. **Photo de profil :** Permettre la prise/import de photo pour le profil utilisateur
7. **Notifications push :** Intégrer Firebase Cloud Messaging pour les notifications distantes
8. **Statistiques avancées :** Graphiques et tableaux de bord visuels
9. **Internationalisation :** Support multilingue (français/anglais/arabe)
