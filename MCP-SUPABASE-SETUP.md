# Configuration MCP Supabase - My Mozaïca

Ce guide vous explique comment configurer le serveur MCP (Model Context Protocol) PostgreSQL pour interagir avec votre base de données Supabase directement depuis Claude Code dans VS Code.

## 🎯 Objectif

Permettre à Claude d'exécuter des requêtes SQL directement sur votre base Supabase pour :
- Déboguer les données utilisateurs
- Modifier le schéma (ALTER TABLE, CREATE TABLE)
- Analyser les données (jointures complexes, rapports)
- Gérer le développement de la base de données

## 📋 Prérequis

- Claude Code extension installée dans VS Code
- Accès au dashboard Supabase
- Node.js installé (pour npx)

## 🚀 Installation

### Étape 1 : Obtenir le mot de passe de la base de données

1. Allez sur le dashboard Supabase : https://supabase.com/dashboard/project/xmqgmmagwwgiphmlbxus
2. Cliquez sur **Settings** (dans la barre latérale gauche)
3. Cliquez sur **Database**
4. Trouvez la section **Connection string** ou **Database Password**
5. Copiez le mot de passe de votre base de données

**Note :** Si vous n'avez pas encore de mot de passe, vous pouvez le générer/réinitialiser depuis cette même page.

### Étape 2 : Ajouter le mot de passe dans .env.local

Ouvrez le fichier [.env.local](.env.local) et ajoutez cette ligne à la fin :

```bash
# Supabase Database Password for MCP
SUPABASE_DB_PASSWORD=votre_mot_de_passe_ici
```

**Remplacez** `votre_mot_de_passe_ici` par le mot de passe obtenu à l'étape 1.

### Étape 3 : Configurer le serveur MCP dans Claude Code

#### Option A : Configuration via les Settings de Claude Code (Recommandé)

1. Ouvrez VS Code
2. Ouvrez les **Settings** de Claude Code :
   - Via le menu : `File` → `Preferences` → `Settings`
   - Ou via le raccourci : `Ctrl+,` (Windows/Linux) ou `Cmd+,` (Mac)
3. Recherchez "**Claude Code MCP**" ou "**MCP Servers**"
4. Cliquez sur "**Edit in settings.json**"
5. Ajoutez cette configuration :

```json
{
  "claude.mcpServers": {
    "supabase-postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres.xmqgmmagwwgiphmlbxus:${SUPABASE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
      ],
      "env": {
        "SUPABASE_DB_PASSWORD": "${env:SUPABASE_DB_PASSWORD}"
      }
    }
  }
}
```

#### Option B : Configuration via fichier local .claude/mcp_config.json

Si vous préférez une configuration au niveau du projet :

1. Créez le dossier `.claude/` à la racine du projet (déjà fait si vous lisez ce fichier)
2. Le fichier [.claude/mcp_config.json](.claude/mcp_config.json) contient un template
3. **IMPORTANT :** Remplacez `[PASSWORD]` par votre mot de passe réel

**⚠️ ATTENTION :** Si vous utilisez cette option, NE COMMITTEZ JAMAIS ce fichier (il est déjà dans .gitignore).

### Étape 4 : Redémarrer VS Code

Pour que les changements prennent effet :
1. Fermez complètement VS Code
2. Rouvrez VS Code
3. Ouvrez le projet My Mozaïca

### Étape 5 : Vérifier que le serveur MCP est actif

Dans Claude Code, essayez de demander :

```
"Peux-tu me montrer les 5 derniers utilisateurs créés dans la table profiles ?"
```

Claude devrait pouvoir exécuter :
```sql
SELECT id, email, full_name, billing_status, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;
```

## 🧪 Tests de vérification

### Test 1 : Connexion basique
```sql
SELECT current_database(), current_user, version();
```

**Résultat attendu :** Informations sur la base de données PostgreSQL.

### Test 2 : Lecture table profiles
```sql
SELECT id, email, full_name, billing_status, created_at
FROM profiles
LIMIT 5;
```

**Résultat attendu :** Liste des 5 premiers profils utilisateurs.

### Test 3 : Jointure (chat_sessions + eras)
```sql
SELECT
  cs.id,
  cs.status,
  e.label as era_label,
  p.full_name as user_name
FROM chat_sessions cs
JOIN eras e ON cs.era_id = e.id
JOIN profiles p ON cs.user_id = p.id
LIMIT 10;
```

**Résultat attendu :** Sessions de chat avec les noms d'ères associées.

### Test 4 : Modification de schéma (CREATE/DROP)
```sql
CREATE TABLE IF NOT EXISTS test_mcp (
  id SERIAL PRIMARY KEY,
  test_column TEXT
);

ALTER TABLE test_mcp ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

DROP TABLE IF EXISTS test_mcp;
```

**Résultat attendu :** Table créée, modifiée, puis supprimée sans erreur.

## 📊 Schéma des tables principales

### profiles
```sql
- id (uuid, PK)
- email (text)
- full_name (text)
- first_name (text)
- last_name (text)
- birth_date (date)
- birth_city (text)
- bio (text)
- red_flags (text)
- billing_status (text: 'free', 'pending', 'paid', 'cancelled')
- created_at (timestamp)
```

### chat_sessions
```sql
- id (uuid, PK)
- user_id (uuid, FK → profiles)
- era_id (uuid, FK → eras)
- status (text: 'locked', 'available', 'in_progress', 'completed')
- topic_density (integer)
- current_summary (text)
- created_at, updated_at (timestamp)
- UNIQUE(user_id, era_id)
```

### messages
```sql
- id (uuid, PK)
- session_id (uuid, FK → chat_sessions)
- role (text: 'user', 'assistant', 'system')
- content (text)
- created_at (timestamp)
```

### eras
```sql
- id (uuid, PK)
- label (text) - Ex: "Petite enfance", "Adolescence"
- start_age (integer)
- end_age (integer, nullable)
- order (integer)
- description (text)
```

### user_facts
```sql
- id (uuid, PK)
- user_id (uuid, FK → profiles)
- session_id (uuid, FK → chat_sessions)
- era_id (uuid, FK → eras)
- category (text)
- value (text)
- context (text)
- created_at (timestamp)
```

## 💡 Cas d'usage courants

### Déboguer un utilisateur spécifique
```sql
-- Profil complet
SELECT * FROM profiles WHERE email = 'user@example.com';

-- Sessions et progression par ère
SELECT
  cs.status,
  e.label,
  cs.topic_density,
  cs.updated_at
FROM chat_sessions cs
JOIN eras e ON cs.era_id = e.id
WHERE cs.user_id = 'uuid-de-lutilisateur'
ORDER BY e.order;
```

### Modifier le statut de paiement
```sql
UPDATE profiles
SET billing_status = 'paid'
WHERE email = 'user@example.com';
```

### Ajouter une colonne à une table
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS phone_number TEXT;
```

### Voir la structure d'une table
```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

### Analyser l'utilisation des sessions
```sql
SELECT
  status,
  COUNT(*) as count
FROM chat_sessions
GROUP BY status;
```

## 🔒 Sécurité

### ⚠️ IMPORTANT - Règles de sécurité

1. **Environnement de développement uniquement**
   - Ne JAMAIS utiliser cette configuration en production
   - Le mot de passe donne un accès administrateur complet

2. **Permissions**
   - Le MCP utilise l'accès admin (bypass RLS)
   - Toutes les opérations SQL sont autorisées (DDL + DML)

3. **Protection des credentials**
   - `.env.local` est déjà dans .gitignore ✓
   - `.claude/` est dans .gitignore ✓
   - Ne JAMAIS commit les mots de passe

4. **Best practices**
   - Toujours faire un `SELECT` avant un `UPDATE`/`DELETE` massif
   - Tester les modifications sur une table de test d'abord
   - Documenter les changements de schéma dans `supabase-migration-*.sql`

## 🐛 Dépannage

### Erreur : "Connection refused"
**Causes possibles :**
- Mot de passe incorrect
- Supabase en pause (plan gratuit après inactivité)
- Problème de connexion réseau

**Solution :**
1. Vérifier le mot de passe dans Supabase Dashboard
2. Vérifier que le projet Supabase est actif
3. Tester la connexion avec un client PostgreSQL (pgAdmin, DBeaver)

### Erreur : "Permission denied"
**Causes possibles :**
- Utilisation de ANON_KEY au lieu du mot de passe admin
- Politiques RLS bloquantes

**Solution :**
1. Vérifier que vous utilisez le mot de passe de la base (pas le SERVICE_ROLE_KEY)
2. Vérifier les logs Supabase pour les erreurs de permission

### Erreur : "MCP server not found"
**Causes possibles :**
- Package @modelcontextprotocol/server-postgres non disponible
- npx non installé

**Solution :**
1. Tester : `npx -y @modelcontextprotocol/server-postgres --help`
2. Installer Node.js si nécessaire
3. Vérifier la syntaxe JSON de la configuration

### Le serveur MCP ne se lance pas
**Solution :**
1. Redémarrer complètement VS Code
2. Vérifier les logs de Claude Code (Output panel)
3. Vérifier que SUPABASE_DB_PASSWORD est dans .env.local
4. Vérifier que la variable d'environnement est accessible dans le terminal

## 📚 Ressources

- [Documentation MCP](https://modelcontextprotocol.io)
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [PostgreSQL MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/postgres)
- [Dashboard Supabase - My Mozaïca](https://supabase.com/dashboard/project/xmqgmmagwwgiphmlbxus)

## ✅ Checklist finale

Avant de commencer à utiliser le MCP :

- [ ] Mot de passe Supabase obtenu depuis le dashboard
- [ ] `SUPABASE_DB_PASSWORD` ajouté dans `.env.local`
- [ ] Configuration MCP ajoutée dans les settings Claude Code
- [ ] `.claude/` ajouté au `.gitignore` (si utilisation de mcp_config.json local)
- [ ] VS Code redémarré
- [ ] Test de connexion réussi (`SELECT current_database()`)
- [ ] Test SELECT sur `profiles` réussi
- [ ] Test jointure sur `chat_sessions + eras` réussi
- [ ] Test modification de schéma (CREATE/DROP table test) réussi

---

**🎉 Vous êtes prêt !** Vous pouvez maintenant demander à Claude d'exécuter des requêtes SQL sur votre base Supabase directement depuis VS Code.
