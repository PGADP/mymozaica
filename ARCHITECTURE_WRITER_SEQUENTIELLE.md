# Architecture Writer Séquentielle - Vision corrigée

**Date**: 2025-12-10
**Concept**: Génération séquentielle chapitre par chapitre avec contexte IA optimal

---

## 🎯 Problème avec l'architecture actuelle

**Architecture actuelle** (parallel):
```
Architecte → crée plan complet
Writer → génère TOUS les chapitres en parallèle (boucle for)
```

**Problèmes**:
1. ❌ Chaque chapitre est généré indépendamment
2. ❌ Pas de continuité narrative entre chapitres
3. ❌ Context window limité pour le Writer
4. ❌ Pas de cohérence stylistique garantie

---

## ✅ Nouvelle architecture (séquentielle)

```
┌─────────────────────────────────────────────────────────┐
│  ARCHITECTE (1 seul appel)                              │
│  - Analyse TOUS les faits                               │
│  - Crée le PLAN GLOBAL du livre                         │
│  - Définit l'arc narratif général                       │
│  - Sauvegarde: book_structure.global_plan               │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
     ┌─────────────────────────────────────────┐
     │  POUR CHAQUE CHAPITRE (séquentiel)      │
     └─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  ARCHITECTE CHAPITRE (1 appel par chapitre)             │
│  Input:                                                  │
│  - Plan global                                           │
│  - Faits du chapitre courant                            │
│  - Chapitres DÉJÀ ÉCRITS (pour continuité)             │
│  Output:                                                 │
│  - Brief détaillé pour le Writer                        │
│  - Transitions à respecter                              │
│  - Tonalité du chapitre                                 │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  WRITER CHAPITRE (1 appel par chapitre)                 │
│  Input:                                                  │
│  - Brief de l'Architecte chapitre                       │
│  - Chapitres précédents (pour continuité)              │
│  - Plan global (pour cohérence)                         │
│  Output:                                                 │
│  - Chapitre rédigé en HTML                              │
│  - Sauvegarde: book_chapters                            │
└─────────────────────────────────────────────────────────┘
                   │
                   │ (répéter pour chaque chapitre)
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  LIVRE COMPLET ASSEMBLÉ                                 │
│  - Continuité narrative garantie                        │
│  - Cohérence stylistique                                │
│  - Transitions fluides                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Schéma de données

### Table `book_structure` (modifiée)

```sql
CREATE TABLE book_structure (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- PLAN GLOBAL (créé par Architecte global)
  global_plan JSONB NOT NULL,

  -- BRIEFS PAR CHAPITRE (créés par Architecte chapitre)
  chapter_briefs JSONB DEFAULT '[]'::jsonb,

  -- MÉTADONNÉES
  generation_status TEXT DEFAULT 'pending', -- pending, in_progress, completed
  current_chapter INT DEFAULT 0,
  total_chapters INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);
```

**Structure JSON `global_plan`**:
```json
{
  "arc_narratif": "De la petite enfance protégée à l'indépendance difficile en tant qu'étudiant",
  "themes_majeurs": ["autonomie", "relations familiales", "découverte de soi"],
  "tone_general": "introspectif, authentique, parfois mélancolique",
  "chapters_outline": [
    {
      "order": 1,
      "title_suggestion": "Les premières années",
      "age_range": {"start": 0, "end": 5},
      "key_facts_ids": ["uuid1", "uuid2"],
      "narrative_goal": "Poser les bases de l'enfance"
    }
  ],
  "transitions_map": {
    "1_to_2": "Transition de l'enfance protégée vers l'école primaire",
    "2_to_3": "Passage du monde de l'enfance à l'adolescence"
  }
}
```

**Structure JSON `chapter_briefs`** (array):
```json
[
  {
    "chapter_order": 1,
    "brief": {
      "title": "Les premières années",
      "narrative_instructions": "Commence par une image forte de la petite enfance. Ton nostalgique mais pas sentimental.",
      "facts_to_integrate": [...],
      "transition_in": null,
      "transition_out": "Finir sur l'entrée à l'école pour créer un pont vers le chapitre 2",
      "style_notes": "Phrases courtes pour l'innocence de l'enfance",
      "target_length": "600-800 mots"
    }
  }
]
```

---

## 🤖 Agent Architecte Global (1 seul appel)

### Endpoint: `POST /api/agents/architect`

**Input**: Aucun (récupère tout depuis la DB)

**Traitement**:
1. Récupère TOUTES les sessions complétées
2. Récupère TOUS les user_facts
3. Analyse la timeline complète
4. Détecte les anachronismes
5. Crée le plan global du livre

**Output**:
```json
{
  "success": true,
  "global_plan": { ... },
  "total_chapters": 5,
  "anachronisms_found": 2
}
```

**Prompt Architecte Global**:
```typescript
const architectGlobalPrompt = `
Tu es l'architecte en chef d'un livre biographique.

DONNÉES BRUTES (toutes les ères complétées) :
${allSessionsWithFacts}

TA MISSION :
1. Analyse la chronologie COMPLÈTE de la vie
2. Détecte les anachronismes (événements dans le mauvais ordre)
3. Identifie les arcs narratifs majeurs
4. Crée un plan de livre cohérent

IMPORTANT :
- NE rédige PAS les chapitres (c'est le rôle du Writer)
- Crée SEULEMENT le plan directeur
- Définis les transitions entre chapitres
- Identifie les thèmes récurrents

FORMAT DE SORTIE :
{
  "arc_narratif": "...",
  "themes_majeurs": [...],
  "tone_general": "...",
  "chapters_outline": [...],
  "transitions_map": {...},
  "anachronisms_fixed": [...]
}
`;
```

---

## 🤖 Agent Architecte Chapitre (1 appel par chapitre)

### Endpoint: `POST /api/agents/architect/chapter`

**Input**:
```json
{
  "chapterOrder": 1,
  "previousChapters": ["contenu chapitre 0..."] // vide pour le 1er
}
```

**Traitement**:
1. Récupère le plan global
2. Récupère les faits du chapitre courant
3. Lit les chapitres précédents pour continuité
4. Crée un brief détaillé pour le Writer

**Output**:
```json
{
  "success": true,
  "brief": {
    "title": "...",
    "narrative_instructions": "...",
    "facts_to_integrate": [...],
    "transition_in": "...",
    "transition_out": "...",
    "style_notes": "...",
    "target_length": "600-800 mots"
  }
}
```

**Prompt Architecte Chapitre**:
```typescript
const architectChapterPrompt = `
Tu es l'architecte détaillé du chapitre ${chapterOrder}.

PLAN GLOBAL DU LIVRE :
${globalPlan}

CHAPITRES DÉJÀ ÉCRITS :
${previousChapters.map((ch, i) => `
Chapitre ${i}: "${ch.title}"
Derniers mots: "${ch.content.slice(-200)}"
`).join('\n')}

FAITS À INTÉGRER DANS CE CHAPITRE :
${facts.map(f => `- [${f.type}] ${f.value}: ${f.context}`).join('\n')}

TA MISSION :
Crée un brief détaillé pour le Writer qui va rédiger ce chapitre.

Le brief doit contenir :
1. Instructions narratives précises
2. Transition depuis le chapitre précédent
3. Transition vers le chapitre suivant
4. Notes de style spécifiques à ce chapitre
5. Liste COMPLÈTE des faits à intégrer

RÈGLES :
- Assure la continuité narrative
- Respecte le ton global défini
- Ne rédige PAS le chapitre (c'est le rôle du Writer)

FORMAT :
{
  "title": "...",
  "narrative_instructions": "...",
  "facts_to_integrate": [...],
  "transition_in": "...",
  "transition_out": "...",
  "style_notes": "...",
  "target_length": "600-800 mots"
}
`;
```

---

## 🤖 Agent Writer Chapitre (1 appel par chapitre)

### Endpoint: `POST /api/agents/writer/chapter`

**Input**:
```json
{
  "chapterOrder": 1,
  "brief": { ... },
  "previousChapters": [ ... ]
}
```

**Traitement**:
1. Lit le brief de l'Architecte
2. Lit les chapitres précédents pour style
3. Rédige le chapitre en HTML
4. Sauvegarde dans `book_chapters`

**Output**:
```json
{
  "success": true,
  "chapter": {
    "title": "...",
    "content": "<p>...</p>",
    "word_count": 750
  }
}
```

**Prompt Writer Chapitre**:
```typescript
const writerChapterPrompt = `
Tu es un biographe littéraire professionnel.

BRIEF DE L'ARCHITECTE :
${brief}

CHAPITRES PRÉCÉDENTS (pour continuité stylistique) :
${previousChapters.slice(-1).map(ch => `
Titre: "${ch.title}"
Derniers paragraphes:
${ch.content.slice(-500)}
`).join('\n')}

TA MISSION :
Rédige le chapitre ${chapterOrder} en suivant EXACTEMENT le brief.

RÈGLES STRICTES :
1. **Continuité narrative** : Reprends le fil narratif du chapitre précédent
2. **Style cohérent** : Conserve le même style que les chapitres précédents
3. **Transitions** : Intègre transition_in au début, transition_out à la fin
4. **Faits obligatoires** : TOUS les faits du brief doivent apparaître
5. **Longueur cible** : ${brief.target_length}

STYLE :
- 1ère personne ("Je me souviens...")
- Ton ${brief.style_notes}
- Phrases variées (courtes et longues)
- Détails sensoriels quand pertinent

FORMAT DE SORTIE :
{
  "content": "<p>HTML formaté</p>",
  "word_count": 750,
  "facts_integrated_count": 8
}
`;
```

---

## 🔄 Flow d'exécution séquentiel

### Endpoint orchestrateur: `POST /api/agents/writer` (modifié)

```typescript
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // ÉTAPE 1: ARCHITECTE GLOBAL (si pas déjà fait)
  let globalPlan;
  const { data: existingStructure } = await supabase
    .from('book_structure')
    .select('global_plan, generation_status')
    .eq('user_id', user.id)
    .single();

  if (!existingStructure || !existingStructure.global_plan) {
    // Appel Architecte global
    const architectResponse = await fetch('/api/agents/architect', {
      method: 'POST'
    });
    const { global_plan } = await architectResponse.json();
    globalPlan = global_plan;

    // Sauvegarder
    await supabase.from('book_structure').upsert({
      user_id: user.id,
      global_plan: globalPlan,
      total_chapters: globalPlan.chapters_outline.length,
      generation_status: 'in_progress'
    });
  } else {
    globalPlan = existingStructure.global_plan;
  }

  // ÉTAPE 2: GÉNÉRATION SÉQUENTIELLE CHAPITRE PAR CHAPITRE
  const totalChapters = globalPlan.chapters_outline.length;
  const previousChapters = [];

  for (let i = 0; i < totalChapters; i++) {
    console.log(`\n📝 Génération chapitre ${i + 1}/${totalChapters}`);

    // 2a. ARCHITECTE CHAPITRE (crée le brief)
    const architectChapterResponse = await fetch('/api/agents/architect/chapter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterOrder: i + 1,
        previousChapters: previousChapters
      })
    });
    const { brief } = await architectChapterResponse.json();

    // Sauvegarder le brief
    await supabase.from('book_structure').update({
      chapter_briefs: supabase.rpc('jsonb_array_append', {
        arr: existingStructure.chapter_briefs || [],
        elem: { chapter_order: i + 1, brief }
      }),
      current_chapter: i + 1
    }).eq('user_id', user.id);

    // 2b. WRITER CHAPITRE (rédige)
    const writerChapterResponse = await fetch('/api/agents/writer/chapter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapterOrder: i + 1,
        brief: brief,
        previousChapters: previousChapters
      })
    });
    const { chapter } = await writerChapterResponse.json();

    // 2c. SAUVEGARDER LE CHAPITRE
    await supabase.from('book_chapters').insert({
      user_id: user.id,
      chapter_order: i + 1,
      title: chapter.title,
      content: chapter.content
    });

    // 2d. AJOUTER AUX CHAPITRES PRÉCÉDENTS POUR LE SUIVANT
    previousChapters.push({
      order: i + 1,
      title: chapter.title,
      content: chapter.content
    });

    console.log(`✅ Chapitre ${i + 1} terminé: ${chapter.word_count} mots`);
  }

  // ÉTAPE 3: MARQUER COMME TERMINÉ
  await supabase.from('book_structure').update({
    generation_status: 'completed'
  }).eq('user_id', user.id);

  return NextResponse.json({
    success: true,
    chapters_generated: totalChapters
  });
}
```

---

## ✅ Avantages de l'architecture séquentielle

1. **Continuité narrative** ✅
   - Chaque chapitre connaît les précédents
   - Transitions fluides garanties
   - Pas de répétitions

2. **Cohérence stylistique** ✅
   - Le Writer adapte son style aux chapitres précédents
   - Ton homogène sur tout le livre

3. **Context window optimal** ✅
   - Chaque appel LLM a le contexte nécessaire
   - Pas de limitation de tokens

4. **Flexibilité** ✅
   - Possibilité de régénérer un seul chapitre
   - Ajustements en cours de route

5. **Traçabilité** ✅
   - Chaque brief est sauvegardé
   - On peut voir le "raisonnement" de l'Architecte

---

## 📝 TODO pour implémentation

1. ✅ Modifier table `book_structure` (ajouter `global_plan`, `chapter_briefs`, `generation_status`)
2. ✅ Modifier `/api/agents/architect` (focus sur plan global uniquement)
3. ✅ Créer `/api/agents/architect/chapter` (brief par chapitre)
4. ✅ Créer `/api/agents/writer/chapter` (rédaction par chapitre)
5. ✅ Modifier `/api/agents/writer` (orchestrateur séquentiel)

---

**Cette architecture garantit un livre cohérent et fluide ! 🚀**
