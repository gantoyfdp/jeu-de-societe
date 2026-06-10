# Régimes — Jeu multijoueur

## Déploiement sur Railway (recommandé pour Socket.io)

Vercel ne supporte pas bien les WebSockets. Utilisez Railway :

1. Créer un compte sur https://railway.app
2. Nouveau projet → "Deploy from GitHub"
3. Connecter votre GitHub et uploader ce dossier
4. Railway détecte automatiquement Node.js
5. La variable PORT est gérée automatiquement
6. Votre URL sera : https://regimes-XXXX.railway.app

## Déploiement local (pour jouer en réseau local)

```bash
npm install
node server.js
```

Puis tous les joueurs se connectent sur : http://IP_DE_VOTRE_MACHINE:3000

## Déploiement sur Render (gratuit)

1. Créer un compte sur https://render.com
2. New Web Service → connecter GitHub
3. Build Command : `npm install`
4. Start Command : `node server.js`
5. Plan : Free

## Structure du projet

- `server.js` — Serveur Node.js + Socket.io + logique de jeu complète
- `public/index.html` — Interface client complète
- `package.json` — Dépendances
- `vercel.json` — Config déploiement

## Fonctionnalités actuelles (v1)

- Connexion multijoueur en temps réel
- Gestion des ressources (or, influence)
- Construction et amélioration des bâtiments
- Système de cartes (main privée, face cachée)
- Deck générique complet avec toutes les cartes définies
- Cartes de régime pour tous les régimes
- Prise de pouvoir avec vérification des prérequis
- Assassinat par fragments de complot
- Emprisonnement automatique (Totalitarisme)
- Évasion de prison
- Renversements (révolte populaire, révolution bourgeoise)
- Compteur d'anarchie
- Journal de partie en temps réel
- Chat de négociation
- Panel admin pour modifier les règles en direct
- Draft des rôles
- Vérification automatique des conditions de victoire

## À développer (v2)

- Combats aux dés avec interface visuelle
- Jetons de protection
- Système de mariage/divorce complet
- Embargo détaillé
- Casino Oligarchie
- Guerre totale Totalitarisme
- Élections républicaines automatiques
- Interface de vote collectif
