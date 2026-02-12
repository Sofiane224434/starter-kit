# Starter Kit - Application Fullstack

## � Démarrage Rapide

### Prérequis
- Node.js (v16 ou supérieur)
- MySQL
- npm ou yarn

### Installation

```bash
# Installation Backend
cd backend
npm install
# Créer un fichier .env avec vos configurations
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=
# DB_NAME=starter_kit
# JWT_SECRET=votre_secret_jwt
# PORT=5000
npm run dev

# Installation Frontend (dans un nouveau terminal)
cd frontend
npm install
npm run dev

#Copier coller les variables d'environnement
cp /backend/.env.example /backend/.env cp /frontend/.env.example /frontend/.env
```

### Lancement

- **Backend** : `http://localhost:5000`
- **Frontend** : `http://localhost:5173`

---

## �📋 Description

Projet fullstack moderne avec architecture découplée, comprenant un backend API REST et un frontend React. L'application propose un système d'authentification complet avec gestion des utilisateurs.

## 🏗️ Architecture du Projet

Le projet est organisé en deux parties principales :

```
starter-kit/
├── backend/          # API REST Node.js
├── frontend/         # Application React
└── README.md
```

---

## 🔧 Backend

### Structure

```
backend/
├── config/           # Configuration de l'application
│   └── db.js        # Configuration de la base de données
├── controllers/      # Logique métier des routes
│   └── auth.controller.js
├── middlewares/      # Middlewares Express
│   └── auth.middleware.js
├── models/          # Modèles de données
│   └── user.model.js
├── routes/          # Définition des routes API
│   └── auth.routes.js
├── package.json     # Dépendances et scripts backend
├── schema.sql       # Schéma de base de données
├── server.js        # Point d'entrée du serveur
└── vite.config.js   # Configuration Vite (si nécessaire)
```

### Technologies Backend

- **Node.js** : Environnement d'exécution JavaScript
- **Express** : Framework web pour Node.js
- **Base de données** : MySQL/PostgreSQL (selon schema.sql)
- **Authentification** : JWT (JSON Web Tokens)

### Responsabilités

- **config/** : Centralise les configurations (DB, variables d'environnement)
- **controllers/** : Contient la logique métier pour chaque route
- **middlewares/** : Fonctions intermédiaires pour valider, authentifier, etc.
- **models/** : Définit les modèles de données et interactions avec la DB
- **routes/** : Définit les endpoints API et associe les controllers

---

## 🎨 Frontend

### Structure

```
frontend/
├── public/              # Fichiers statiques
├── src/
│   ├── assets/          # Images, fonts, etc.
│   ├── components/      # Composants React réutilisables
│   │   ├── Footer.jsx
│   │   ├── Header.jsx
│   │   └── PrivateRoute.jsx
│   ├── contexts/        # Contextes React (state global)
│   │   └── AuthContext.jsx
│   ├── hooks/           # Hooks personnalisés
│   │   └── useAuth.js
│   ├── layouts/         # Layouts de pages
│   │   ├── AuthLayout.jsx
│   │   └── MainLayout.jsx
│   ├── pages/           # Pages de l'application
│   │   ├── Dashboard.jsx
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── services/        # Services API
│   │   └── api.js
│   ├── App.jsx          # Composant principal
│   ├── main.jsx         # Point d'entrée React
│   └── index.css        # Styles globaux
├── eslint.config.js     # Configuration ESLint
├── index.html           # Template HTML
└── package.json         # Dépendances et scripts frontend
```

### Technologies Frontend

- **React** : Bibliothèque UI
- **React Router** : Navigation entre pages
- **Context API** : Gestion d'état global
- **Vite** : Build tool et dev server
- **ESLint** : Linting du code

### Architecture Frontend

#### Composants (`components/`)

Composants réutilisables :

- **Header** : En-tête de l'application
- **Footer** : Pied de page
- **PrivateRoute** : Protection des routes authentifiées

#### Contextes (`contexts/`)

- **AuthContext** : Gère l'état d'authentification globale

#### Hooks (`hooks/`)

- **useAuth** : Hook personnalisé pour accéder au contexte d'authentification

#### Layouts (`layouts/`)

- **AuthLayout** : Layout pour pages d'authentification (Login, Register)
- **MainLayout** : Layout principal avec Header et Footer

#### Pages (`pages/`)

- **Home** : Page d'accueil publique
- **Login** : Page de connexion
- **Register** : Page d'inscription
- **Dashboard** : Page protégée pour utilisateurs connectés

#### Services (`services/`)

- **api.js** : Configuration Axios et appels API vers le backend

---

## 🔐 Système d'Authentification

### Flow d'authentification

1. **Inscription** :
   - L'utilisateur remplit le formulaire Register
   - Le frontend envoie les données à `/api/auth/register`
   - Le backend crée l'utilisateur et retourne un token JWT

2. **Connexion** :
   - L'utilisateur se connecte via Login
   - Le backend vérifie les credentials et retourne un token JWT
   - Le token est stocké (localStorage/sessionStorage)

3. **Accès aux routes protégées** :
   - Le middleware `auth.middleware.js` vérifie le token JWT
   - Le composant `PrivateRoute` protège les pages frontend
   - L'`AuthContext` partage l'état d'authentification

---

## 🚀 Installation et Lancement

### Prérequis

- Node.js (v16+)
- npm ou yarn
- Base de données (MySQL/PostgreSQL)

### Installation

```bash
# Cloner le projet
git clone <repository-url>
cd starter-kit

# Installer les dépendances backend
cd backend
npm install

# Installer les dépendances frontend
cd ../frontend
npm install
```

### Configuration

1. **Backend** : Créer un fichier `.env` dans `/backend`

```env
PORT=5000
DATABASE_URL=your_database_url
JWT_SECRET=your_secret_key
```

2. **Frontend** : Créer un fichier `.env` dans `/frontend`

```env
VITE_API_URL=http://localhost:5000
```

3. **Base de données** : Exécuter le schéma SQL

```bash
# Dans le dossier backend
mysql -u username -p database_name < schema.sql
# ou pour PostgreSQL
psql -U username -d database_name -f schema.sql
```

### Lancement

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

L'application sera accessible à :

- Frontend : `http://localhost:5173` (port Vite par défaut)
- Backend : `http://localhost:5000` (ou port configuré)

---

## 📡 API Endpoints

### Authentification

| Méthode | Endpoint             | Description                         | Protection |
| ------- | -------------------- | ----------------------------------- | ---------- |
| POST    | `/api/auth/register` | Inscription d'un nouvel utilisateur | Public     |
| POST    | `/api/auth/login`    | Connexion utilisateur               | Public     |
| GET     | `/api/auth/profile`  | Récupérer le profil utilisateur     | Privé      |

---

## 🛠️ Scripts Disponibles

### Backend

```bash
npm start        # Lancer le serveur en production
npm run dev      # Lancer le serveur en mode développement
```

### Frontend

```bash
npm run dev      # Lancer le serveur de développement
npm run build    # Build de production
npm run preview  # Preview du build
npm run lint     # Vérifier le code avec ESLint
```

---

## 📦 Dépendances Principales

### Backend

- express
- mysql2 / pg (selon la DB)
- jsonwebtoken
- bcrypt
- cors
- dotenv

### Frontend

- react
- react-router-dom
- axios

---

## 🎯 Bonnes Pratiques

1. **Séparation des préoccupations** : Backend et frontend totalement découplés
2. **Architecture MVC** : Models, Controllers, Routes bien séparés
3. **Composants réutilisables** : Components React modulaires
4. **State Management** : Context API pour l'état global
5. **Sécurité** : JWT pour l'authentification, middlewares de validation
6. **Code propre** : ESLint pour la qualité du code

---

## 📝 Licence

Ce projet est un starter kit pour un développement rapide d'applications fullstack.
