# Architecture Multi-Agents - My Mozaïca V2

## Vue d'ensemble

My Mozaïca V2 utilise une architecture à **5 agents IA spécialisés** qui travaillent en collaboration pour transformer des conversations en livre biographique.

## Les 5 Personas d'Agents

### 1. Agent INTERVIEWER (Synchrone)
**Persona** : Guide conversationnel empathique
**Modèle** : Mistral Large
**Fonction** : Interface frontale avec l'utilisateur

**Workflow** :
```
Utilisateur → Message
     ↓
Interviewer (API) → Mistral Large
     ↓
Question pertinente → Utilisateur
```

**Responsabilités** :
- Poser des questions ouvertes
- Rebondir sur les réponses
- Créer un climat de confiance
- Adapter le ton au contexte

**Route** : [/api/agents/interviewer/route.ts](src/app/api/agents/interviewer/route.ts)

---

### 2. Agent ANALYST (Asynchrone)
**Persona** : Extracteur de données silencieux
**Modèle** : Mistral Small (économique + rapide)
**Fonction** : Extraction de données structurées

**Workflow** :
```
Conversation sauvegardée
     ↓
Analyst (Background) → Mistral Small
     ↓
Extraction :
  - Dates (année, mois, jour)
  - Lieux (ville, pays)
  - Personnes (noms, relations)
  - Événements clés
  - Émotions
     ↓
Sauvegarde dans extracted_data + timeline_events
```

**Responsabilités** :
- Analyser chaque échange
- Extraire les métadonnées
- Alimenter la timeline
- Ne jamais interrompre l'utilisateur

**Route** : [/api/agents/analyst/route.ts](src/app/api/agents/analyst/route.ts)

---

### 3. Agent ARCHITECT (Factory)
**Persona** : Architecte narratif
**Modèle** : Mistral Large
**Fonction** : Conception du plan du livre

**Workflow** :
```
Toutes les données extraites
     ↓
Architect → Mistral Large
     ↓
Création du plan :
  - Structure globale
  - Chapitres thématiques/chronologiques
  - Arcs narratifs
  - Transitions
     ↓
Sauvegarde dans book_structure
```

**Responsabilités** :
- Analyser l'ensemble des souvenirs
- Identifier les thèmes principaux
- Créer une structure cohérente
- Définir l'ordre narratif optimal

**Route** : [/api/agents/factory/architect/route.ts](src/app/api/agents/factory/architect/route.ts)

---

### 4. Agent WRITER (Factory)
**Persona** : Écrivain biographique
**Modèle** : Mistral Large
**Fonction** : Rédaction des chapitres

**Workflow** :
```
Plan du chapitre (Architect)
     ↓
Writer → Mistral Large
     ↓
Rédaction :
  - Style littéraire personnalisable
  - Ton authentique
  - Narration fluide
     ↓
Sauvegarde dans book_chapters (status: 'written')
```

**Responsabilités** :
- Transformer les données en récit
- Respecter le style choisi
- Maintenir la cohérence narrative
- Captiver le lecteur

**Route** : [/api/agents/factory/writer/route.ts](src/app/api/agents/factory/writer/route.ts)

---

### 5. Agent REVIEWER (Factory)
**Persona** : Relecteur professionnel
**Modèle** : Mistral Large
**Fonction** : Relecture et amélioration

**Workflow** :
```
Chapitre brut (Writer)
     ↓
Reviewer → Mistral Large
     ↓
Analyse :
  - Corrections orthographiques
  - Amélioration du style
  - Vérification de cohérence
  - Suggestions d'optimisation
     ↓
Mise à jour dans book_chapters (status: 'reviewed')
```

**Responsabilités** :
- Corriger les erreurs
- Améliorer la fluidité
- Vérifier la cohérence chronologique
- Produire un rapport de modifications

**Route** : [/api/agents/factory/reviewer/route.ts](src/app/api/agents/factory/reviewer/route.ts)

---

## Flux de Données

### Phase 1 : Collecte (Interviewer + Analyst)
```
1. Utilisateur envoie un message
2. Interviewer répond avec une question
3. Analyst extrait les données en arrière-plan
4. Timeline se met à jour automatiquement
```

### Phase 2 : Planification (Architect)
```
1. Utilisateur demande la génération du livre
2. Architect analyse toutes les données
3. Création du plan structuré
4. Validation par l'utilisateur
```

### Phase 3 : Production (Writer + Reviewer)
```
1. Writer rédige chapitre par chapitre
2. Reviewer relit et corrige
3. Itération si nécessaire
4. Export final (PDF, EPUB, etc.)
```

---

## Séparation des Responsabilités

| Agent | Mode | Modèle | Interaction User | Écrit en BDD |
|-------|------|--------|------------------|--------------|
| **Interviewer** | Sync | Large | ✅ Directe | Conversations |
| **Analyst** | Async | Small | ❌ Silencieux | Données + Timeline |
| **Architect** | On-demand | Large | ⚠️ Validation | Structure |
| **Writer** | Batch | Large | ❌ Background | Chapitres |
| **Reviewer** | Batch | Large | ❌ Background | Chapitres (corrigés) |

---

## Base de Données (Supabase)

### Tables principales

**conversations** : Conteneurs de discussions
**messages** : Échanges utilisateur ↔ interviewer
**extracted_data** : Métadonnées extraites
**timeline_events** : Événements de vie
**book_structure** : Plan du livre
**book_chapters** : Chapitres rédigés

---

## Optimisations

### Coûts
- **Analyst** utilise Mistral Small (10x moins cher)
- Analyse asynchrone (pas de latence perçue)

### Performance
- Messages sauvegardés avant envoi à l'Analyst
- Timeline mise à jour en temps réel
- Génération du livre en background jobs

### UX
- L'utilisateur ne voit que l'Interviewer
- Pas de temps d'attente pour l'extraction
- Timeline enrichie au fur et à mesure

---

## Prochaines Évolutions

- [ ] Agent **Fact-Checker** (vérification de cohérence temporelle)
- [ ] Agent **Illustrator** (génération d'images avec DALL-E)
- [ ] Agent **Narrator** (synthèse vocale du livre)
- [ ] Export multi-formats (PDF, EPUB, Audiobook)

---

## Configuration Requise

### Variables d'environnement
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
MISTRAL_API_KEY=...
```

### Modèles Mistral utilisés
- **mistral-large-latest** : Interviewer, Architect, Writer, Reviewer
- **mistral-small-latest** : Analyst

---

Créé avec [Mistral AI](https://mistral.ai) et [Supabase](https://supabase.com)
