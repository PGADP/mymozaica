# My Mozaïca V2

Application de biographie interactive avec architecture multi-agents IA.

## Architecture

### Stack Technique
- **Framework** : Next.js 15 (App Router)
- **Langage** : TypeScript
- **Styling** : Tailwind CSS
- **Base de données** : Supabase
- **IA** : Mistral AI (Large + Small)

### Architecture Multi-Agents

#### 🎤 Agent Interviewer (Synchrone)
- **Rôle** : Guide conversationnel avec l'utilisateur
- **Modèle** : Mistral Large
- **Route** : `/api/agents/interviewer`
- **Fonction** : Pose des questions pertinentes pour recueillir les souvenirs

#### 📊 Agent Analyst (Asynchrone)
- **Rôle** : Extracteur de données en arrière-plan
- **Modèle** : Mistral Small
- **Route** : `/api/agents/analyst`
- **Fonction** : Extrait dates, lieux, personnes, événements, émotions

#### 🏗️ Factory d'Agents de Production

##### Agent Architect
- **Rôle** : Crée le plan structuré du livre
- **Modèle** : Mistral Large
- **Route** : `/api/agents/factory/architect`

##### Agent Writer
- **Rôle** : Rédige les chapitres
- **Modèle** : Mistral Large
- **Route** : `/api/agents/factory/writer`

##### Agent Reviewer
- **Rôle** : Relit et corrige
- **Modèle** : Mistral Large
- **Route** : `/api/agents/factory/reviewer`

## Structure des Dossiers

```
/src
  /app
    /auth               # Authentification Supabase
    /dashboard          # Interface principale
    /api/agents         # Routes des agents IA
  /components
    /timeline           # Frise chronologique
    /chat               # Interface de chat
    /ui                 # Composants atomiques
  /core
    /database           # Types Supabase
    /services           # Services métier
    /hooks              # Custom hooks
  /utils                # Helpers
```

## Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local

# Lancer le serveur de développement
npm run dev
```

## Configuration

### Supabase
1. Créer un projet sur [supabase.com](https://supabase.com)
2. Récupérer l'URL et la clé anonyme
3. Les ajouter dans `.env.local`

### Mistral AI
1. Créer un compte sur [mistral.ai](https://mistral.ai)
2. Générer une clé API
3. L'ajouter dans `.env.local`

## Prochaines Étapes

- [ ] Implémenter la logique complète des agents
- [ ] Créer le schéma de base de données Supabase
- [ ] Intégrer les composants dans le dashboard
- [ ] Ajouter les tests
- [ ] Déployer sur Vercel

## Licence

Propriétaire - My Mozaïca
