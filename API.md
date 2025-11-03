# API Documentation - Oral Prep

## Base de Données Supabase

### Tables

#### `profiles`
Profils utilisateurs (extension future)

```sql
id          uuid (PK, FK → auth.users.id)
display_name text (nullable)
created_at  timestamptz
updated_at  timestamptz
```

#### `projects`
Projets créés par les utilisateurs

```sql
id          uuid (PK)
owner_id    uuid (FK → auth.users.id)
name        text (1-120 caractères)
created_at  timestamptz
updated_at  timestamptz
```

#### `project_documents`
Documents associés aux projets

```sql
id           uuid (PK)
project_id   uuid (FK → projects.id)
name         text
path         text (chemin storage)
size_bytes   bigint (max 50MB)
content_type text
created_at   timestamptz
```

### Row Level Security (RLS)

Toutes les tables ont RLS activé avec les politiques suivantes :

**profiles**
- Utilisateurs peuvent lire/modifier uniquement leur propre profil

**projects**
- Utilisateurs peuvent créer/lire/modifier/supprimer uniquement leurs propres projets

**project_documents**
- Utilisateurs peuvent accéder aux documents uniquement via leurs propres projets

### Storage

#### Bucket: `project-docs`
- Privé (non public)
- Structure: `users/{userId}/{projectId}/docs/{filename}`
- Max 50 Mo par fichier
- Politiques: accès limité aux fichiers de l'utilisateur

### Triggers et Contraintes

#### Max Documents Trigger
```sql
-- Limite à 10 documents par projet
CREATE TRIGGER trg_max_docs
BEFORE INSERT ON project_documents
FOR EACH ROW EXECUTE FUNCTION enforce_max_documents()
```

#### Auto Profile Creation
```sql
-- Crée automatiquement un profil lors de l'inscription
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user()
```

## Helpers Supabase

### Client-side (Browser)

```typescript
import { createSupabaseBrowser } from '@/lib/supabase/client';

const supabase = createSupabaseBrowser();

// Authentification
await supabase.auth.signUp({ email, password });
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signOut();

// Requêtes
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('owner_id', userId);
```

### Server-side (RSC/Route Handlers)

```typescript
import { createSupabaseServer } from '@/lib/supabase/server';

const supabase = await createSupabaseServer();

const { data: { user } } = await supabase.auth.getUser();
```

## Exemples d'Usage

### Créer un Projet

```typescript
const { data: project, error } = await supabase
  .from('projects')
  .insert({
    name: 'Mon projet',
    owner_id: user.id,
  })
  .select()
  .single();
```

### Uploader un Document

```typescript
// 1. Upload vers Storage
const filePath = `users/${userId}/${projectId}/docs/${fileName}`;
const { error: uploadError } = await supabase.storage
  .from('project-docs')
  .upload(filePath, file);

// 2. Créer l'enregistrement
await supabase.from('project_documents').insert({
  project_id: projectId,
  name: fileName,
  path: filePath,
  size_bytes: file.size,
  content_type: file.type,
});
```

### Récupérer un Projet avec ses Documents

```typescript
const { data: project } = await supabase
  .from('projects')
  .select('*, project_documents(*)')
  .eq('id', projectId)
  .single();
```

### Supprimer un Projet (cascade)

```typescript
// Supprime automatiquement les documents associés (FK cascade)
await supabase
  .from('projects')
  .delete()
  .eq('id', projectId);

// Supprimer aussi les fichiers du storage
const { data: docs } = await supabase
  .from('project_documents')
  .select('path')
  .eq('project_id', projectId);

for (const doc of docs) {
  await supabase.storage
    .from('project-docs')
    .remove([doc.path]);
}
```

## Routes API (Future)

Structure recommandée pour les futures API routes :

```
app/api/
├── projects/
│   ├── route.ts          # GET, POST
│   └── [id]/
│       ├── route.ts      # GET, PATCH, DELETE
│       └── documents/
│           └── route.ts  # GET, POST
├── quiz/
│   └── generate/
│       └── route.ts      # POST
└── agent/
    └── chat/
        └── route.ts      # POST (streaming)
```

## Authentification

### Middleware
Le middleware protège automatiquement toutes les routes sauf `/auth/*`

```typescript
// middleware.ts
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

### Récupérer l'Utilisateur Courant

```typescript
import { getCurrentUser } from '@/lib/auth';

const user = await getCurrentUser();
```

## Limites et Quotas

### Supabase Free Tier
- 500 Mo de base de données
- 1 Go de stockage fichiers
- 2 Go de bande passante
- 50 000 utilisateurs actifs mensuels

### Limites Application
- 10 documents maximum par projet (trigger)
- 50 Mo maximum par document (CHECK constraint)
- 120 caractères maximum pour nom de projet

## Extensions Futures

### AI Agent
- Intégration OpenAI/Anthropic
- RAG sur documents uploadés
- Streaming responses

### Quiz Generator
- Extraction contenu PDF
- Génération questions via LLM
- Stockage quiz dans nouvelle table

### Analytics
- Tracking temps d'étude
- Scores quiz
- Progression utilisateur

## Sécurité

- ✅ Row Level Security sur toutes les tables
- ✅ Politiques Storage par utilisateur
- ✅ Validation taille fichiers
- ✅ HTTPS obligatoire en production
- ✅ Cookies sécurisés pour sessions
- ✅ Pas d'exposition de clés privées côté client

