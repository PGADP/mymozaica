# Plan d'implémentation : Factory et Génération du Livre

**Date:** 2025-12-10
**Phase:** Phase C - Writer (Factory + Éditeur de livre)

---

## 🎯 Objectif

Créer un système qui :
1. **Assemble automatiquement** tous les faits, récits et données collectés pendant les interviews
2. **Génère un livre biographique** structuré en chapitres (un par ère)
3. **Permet l'édition** du livre avec un éditeur de texte riche (TipTap)
4. **Export** en PDF et autres formats

---

## 📐 Architecture Globale

```
┌─────────────────────────────────────────────────────┐
│                   DASHBOARD                         │
│  ┌───────────────┐    ┌──────────────────┐         │
│  │ Ères Timeline │    │ "Générer le livre"│         │
│  │  (completed)  │───>│     Bouton       │         │
│  └───────────────┘    └──────────┬───────┘         │
└────────────────────────────────────┼────────────────┘
                                     │
                                     ▼
              ┌──────────────────────────────────────┐
              │       /api/agents/writer             │
              │   (Agent Writer - Mistral Large)     │
              └──────────────┬───────────────────────┘
                             │
                             │ 1. Récupère toutes les sessions/facts
                             │ 2. Génère un chapitre par ère
                             │ 3. Sauvegarde dans 'book_chapters'
                             │
                             ▼
              ┌──────────────────────────────────────┐
              │       Table: book_chapters           │
              │  - chapter_order                     │
              │  - era_id                            │
              │  - content (HTML/Markdown)           │
              │  - title                             │
              └──────────────┬───────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────────────┐
              │      /book/edit                      │
              │   (Éditeur TipTap)                   │
              │  - Modification chapitres            │
              │  - Réorganisation                    │
              │  - Ajout photos                      │
              └──────────────┬───────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────────────┐
              │      /book/preview                   │
              │   (Prévisualisation du livre)        │
              │  - Vue lecteur                       │
              │  - Export PDF                        │
              └──────────────────────────────────────┘
```

---

## 📊 Schéma de Base de Données

### Nouvelle table : `book_chapters`

```sql
CREATE TABLE book_chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  era_id UUID REFERENCES eras(id) ON DELETE SET NULL,
  chapter_order INT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- HTML généré par TipTap
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, chapter_order)
);

-- Index pour performance
CREATE INDEX idx_book_chapters_user ON book_chapters(user_id);
CREATE INDEX idx_book_chapters_order ON book_chapters(user_id, chapter_order);

-- RLS (Row Level Security)
ALTER TABLE book_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chapters"
  ON book_chapters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chapters"
  ON book_chapters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chapters"
  ON book_chapters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chapters"
  ON book_chapters FOR DELETE
  USING (auth.uid() = user_id);
```

---

## 🤖 Agent Writer (Factory)

### Fichier : `src/app/api/agents/writer/route.ts`

**Responsabilités** :
1. Récupérer toutes les sessions complétées (`status = 'completed'`)
2. Pour chaque ère :
   - Récupérer les `messages` (questions/réponses)
   - Récupérer les `user_facts` associés
   - Récupérer le `current_summary` de la session
3. Appeler Mistral Large pour générer un chapitre narratif
4. Sauvegarder dans `book_chapters`

### Prompt Writer

```
Tu es un biographe professionnel chargé de transformer des interviews en un chapitre de livre autobiographique.

CONTEXTE DE L'ÈRE :
Titre : "${eraLabel}"
Description : "${eraDescription}"
Âge : ${startAge}-${endAge} ans

RÉSUMÉ DE LA SESSION :
"${currentSummary}"

FAITS EXTRAITS :
${facts.map(f => `- ${f.fact_type}: ${f.fact_value} (${f.fact_context})`).join('\n')}

EXTRAITS D'INTERVIEW (sélection des réponses les plus riches) :
${topAnswers}

TA MISSION :
Écris un chapitre narratif de 500-1000 mots qui raconte cette période de vie.

RÈGLES STRICTES :
1. Utilise un style littéraire fluide et engageant
2. Raconte à la 1ère personne ("Je me souviens...")
3. Intègre TOUS les faits mentionnés
4. Conserve les noms, lieux, dates EXACTEMENT comme donnés
5. Structure en 3-4 paragraphes cohérents
6. Respecte la chronologie des événements
7. Ajoute des transitions naturelles entre les idées
8. NE PAS inventer de détails non mentionnés

FORMAT DE SORTIE :
{
  "title": "Titre évocateur du chapitre",
  "content": "<p>Contenu HTML formaté avec <strong>, <em>, etc.</p>",
  "word_count": 750
}
```

### Structure du code

```typescript
export async function POST(req: Request) {
  const supabase = await createClient();

  // 1. Sécurité
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // 2. Récupérer toutes les sessions complétées
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select(`
      *,
      eras (label, description, start_age, end_age)
    `)
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: true });

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ error: "Aucune session complétée" }, { status: 404 });
  }

  // 3. Générer un chapitre par session
  const chapters = [];

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];

    // Récupérer messages
    const { data: messages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', session.id)
      .eq('role', 'user') // Seulement les réponses utilisateur
      .order('created_at', { ascending: true });

    // Récupérer facts
    const { data: facts } = await supabase
      .from('user_facts')
      .select('*')
      .eq('session_id', session.id);

    // Appeler Mistral pour générer le chapitre
    const chapter = await generateChapter(session, messages, facts);

    // Sauvegarder
    await supabase.from('book_chapters').insert({
      user_id: user.id,
      era_id: session.era_id,
      chapter_order: i + 1,
      title: chapter.title,
      content: chapter.content,
    });

    chapters.push(chapter);
  }

  return NextResponse.json({
    success: true,
    chapters_count: chapters.length
  });
}
```

---

## 🖊️ Éditeur TipTap

### Page : `src/app/book/edit/page.tsx`

**Composant principal** : `BookEditor`

### Dépendances à installer

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link
```

### Structure de l'éditeur

```tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';

export function BookEditor({ initialContent, onSave }: {
  initialContent: string,
  onSave: (html: string) => void
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[500px] p-8',
      },
    },
  });

  const handleSave = () => {
    if (editor) {
      onSave(editor.getHTML());
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Barre d'outils */}
      <MenuBar editor={editor} />

      {/* Zone d'édition */}
      <EditorContent editor={editor} />

      {/* Bouton sauvegarder */}
      <button onClick={handleSave}>Sauvegarder</button>
    </div>
  );
}
```

### Barre d'outils (MenuBar)

```tsx
function MenuBar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  return (
    <div className="flex gap-2 p-4 border-b">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'is-active' : ''}
      >
        Gras
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'is-active' : ''}
      >
        Italique
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
      >
        Titre 2
      </button>
      {/* Autres boutons... */}
    </div>
  );
}
```

---

## 📖 Page de prévisualisation

### Page : `src/app/book/preview/page.tsx`

**Objectif** : Afficher le livre complet en mode lecteur

```tsx
export default async function BookPreviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: chapters } = await supabase
    .from('book_chapters')
    .select('*')
    .eq('user_id', user.id)
    .order('chapter_order', { ascending: true });

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-serif mb-8">Mon histoire</h1>

      {chapters.map((chapter) => (
        <div key={chapter.id} className="mb-12">
          <h2 className="text-3xl font-serif mb-4">{chapter.title}</h2>
          <div
            className="prose prose-lg"
            dangerouslySetInnerHTML={{ __html: chapter.content }}
          />
        </div>
      ))}

      <button onClick={exportToPDF}>Télécharger en PDF</button>
    </div>
  );
}
```

---

## 📥 Export PDF

### Bibliothèque recommandée : `react-pdf` ou `jsPDF`

```bash
npm install jspdf html2canvas
```

### Fonction d'export

```typescript
async function exportToPDF() {
  const { jsPDF } = await import('jspdf');
  const html2canvas = (await import('html2canvas')).default;

  const element = document.getElementById('book-content');
  const canvas = await html2canvas(element);
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210; // A4 width
  const pageHeight = 295; // A4 height
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save('mon-histoire.pdf');
}
```

---

## 🔄 Flux utilisateur complet

### Étape 1 : Dashboard
- User complète toutes les ères
- Bouton "Générer mon livre" apparaît quand toutes les sessions sont `completed`

### Étape 2 : Génération (Factory)
- Click sur "Générer mon livre"
- Appel à `/api/agents/writer`
- Affiche un loader : "Votre biographe assemble votre histoire..."
- Redirige vers `/book/edit` une fois terminé

### Étape 3 : Édition
- Page `/book/edit` affiche tous les chapitres
- Utilisateur peut :
  - Modifier le texte
  - Réorganiser les chapitres (drag & drop)
  - Ajouter des images
  - Ajuster le style

### Étape 4 : Prévisualisation & Export
- Page `/book/preview` : vue lecteur finale
- Bouton "Télécharger en PDF"
- Option "Partager" (lien public optionnel)

---

## 🎨 Design UI/UX

### Dashboard (bouton génération)

```tsx
{allErasCompleted && (
  <button
    onClick={generateBook}
    className="bg-gradient-to-r from-[#E76F51] to-[#2A9D8F] text-white px-8 py-4 rounded-2xl text-xl font-bold shadow-lg hover:shadow-xl transition-all"
  >
    ✨ Générer mon livre
  </button>
)}
```

### Éditeur (style livre)

```css
.book-page {
  background: #FFFEF7; /* Papier crème */
  box-shadow: 0 5px 20px rgba(0,0,0,0.1);
  font-family: 'Georgia', serif;
  line-height: 1.8;
  padding: 60px;
  max-width: 800px;
  margin: 40px auto;
}
```

---

## 🧪 Tests à prévoir

1. **Test génération** :
   - Toutes les ères complétées → Génère N chapitres
   - Aucune ère complétée → Erreur explicite

2. **Test édition** :
   - Sauvegarde correcte du HTML
   - Gestion des images
   - Performance avec long contenu

3. **Test export PDF** :
   - Pagination correcte
   - Conservation du formatage
   - Taille du fichier raisonnable

---

## 📦 Ordre d'implémentation recommandé

### Sprint 1 (2-3 jours)
1. ✅ Créer la table `book_chapters` (migration SQL)
2. ✅ Implémenter l'agent Writer (`/api/agents/writer`)
3. ✅ Ajouter le bouton "Générer mon livre" sur le Dashboard
4. ✅ Tester la génération end-to-end

### Sprint 2 (2-3 jours)
5. ✅ Installer et configurer TipTap
6. ✅ Créer la page `/book/edit`
7. ✅ Implémenter la barre d'outils
8. ✅ Sauvegarde des modifications

### Sprint 3 (1-2 jours)
9. ✅ Créer la page `/book/preview`
10. ✅ Implémenter l'export PDF
11. ✅ Design et polish UI

### Sprint 4 (1 jour)
12. ✅ Tests utilisateur
13. ✅ Corrections et optimisations

---

## 🚀 Technologies utilisées

- **Framework** : Next.js 15
- **Base de données** : Supabase (PostgreSQL)
- **IA** : Mistral Large (génération chapitres)
- **Éditeur** : TipTap (React)
- **Export PDF** : jsPDF + html2canvas
- **Styling** : Tailwind CSS + Prose

---

## 📝 Notes importantes

1. **Performance** : Pour les livres longs (>50 pages), paginer le contenu dans l'éditeur
2. **Sauvegardes** : Auto-save toutes les 30 secondes dans l'éditeur
3. **Versioning** : Considérer un historique des versions (table `book_versions`)
4. **Images** : Uploader dans Supabase Storage, pas en base64
5. **Accessibilité** : Respecter WCAG 2.1 AA pour l'éditeur

---

**Prêt à commencer l'implémentation ?** 🚀
