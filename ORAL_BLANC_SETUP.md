# Setup Rapide - Oral Blanc

## 🚀 Déploiement en 5 minutes

### Étape 1 : Base de Données (2 min)

#### Option A : Via l'interface Supabase (Recommandé)
1. Ouvrir votre projet Supabase : https://app.supabase.com
2. Aller dans **SQL Editor**
3. Cliquer sur **New Query**
4. Copier-coller le contenu de `supabase-oral-blanc-schema.sql`
5. Cliquer sur **Run** (ou Ctrl+Enter)
6. Vérifier le message de succès ✅

#### Option B : Via la ligne de commande
```bash
psql -h [votre-projet].supabase.co -U postgres -d postgres -f supabase-oral-blanc-schema.sql
```

### Étape 2 : Vérification de la Table (30 sec)

Dans l'éditeur SQL de Supabase, exécutez :

```sql
-- Vérifier que la table existe
SELECT * FROM oral_blanc_sessions LIMIT 1;

-- Devrait retourner 0 rows (normal, table vide)
```

### Étape 3 : Test de l'Application (2 min)

```bash
# Démarrer le serveur de développement
npm run dev
```

1. Ouvrir http://localhost:3000
2. Se connecter
3. Cliquer sur **"Oral Blanc"** dans la sidebar gauche
4. Cliquer sur **"Nouvelle Session"**
5. Remplir le formulaire :
   - **Titre** : "Test Oral Blanc"
   - **Sujet** : Coller ce texte exemple :

```
La Photosynthèse

Définition:
La photosynthèse est le processus par lequel les plantes vertes transforment l'énergie lumineuse en énergie chimique.

Équation:
6 CO2 + 6 H2O + lumière → C6H12O6 + 6 O2

Étapes:
1. Phase lumineuse (thylakoïdes)
2. Cycle de Calvin (stroma)

Importance:
- Production d'oxygène
- Base de la chaîne alimentaire
- Régulation du CO2 atmosphérique
```

6. Cliquer sur **"Créer la Session"**
7. Cliquer sur **"Commencer"**
8. Autoriser l'accès au microphone
9. Attendre que le jury se présente
10. Tester l'interaction vocale

## ✅ Checklist de Validation

### Base de Données
- [ ] Table `oral_blanc_sessions` créée
- [ ] Indexes créés
- [ ] RLS activé
- [ ] Politiques créées
- [ ] Trigger updated_at fonctionne

### Application
- [ ] Sidebar affiche "Oral Blanc"
- [ ] Page /oral-blanc accessible
- [ ] Création de session fonctionne
- [ ] Liste des sessions s'affiche
- [ ] Modification de session fonctionne
- [ ] Suppression de session fonctionne
- [ ] Connexion audio établie
- [ ] Jury se présente et pose des questions
- [ ] Microphone capturé correctement
- [ ] Audio du jury audible

### API
- [ ] POST /api/oral-blanc/create → 200
- [ ] GET /api/oral-blanc/list → 200
- [ ] GET /api/oral-blanc/[id] → 200
- [ ] PUT /api/oral-blanc/[id] → 200
- [ ] DELETE /api/oral-blanc/[id] → 200
- [ ] POST /api/oral-blanc/session → 200 avec client_secret

## 🐛 Résolution de Problèmes

### Erreur : "Table does not exist"
**Solution** : La table n'a pas été créée
```sql
-- Vérifier l'existence
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'oral_blanc_sessions';

-- Si vide, réexécuter supabase-oral-blanc-schema.sql
```

### Erreur : "RLS policy violation"
**Solution** : Les politiques RLS ne sont pas appliquées
```sql
-- Vérifier RLS
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename = 'oral_blanc_sessions';

-- Réactiver si nécessaire
ALTER TABLE oral_blanc_sessions ENABLE ROW LEVEL SECURITY;
```

### Erreur : "Unauthorized" lors de la création
**Solution** : Vérifier l'authentification
1. L'utilisateur est-il connecté ?
2. Le token est-il valide ?
3. Les politiques RLS sont-elles correctes ?

### Erreur : "Failed to get session token"
**Solution** : Problème avec l'API OpenAI
1. Vérifier `OPENAI_API_KEY` dans `.env.local`
2. Vérifier les crédits OpenAI
3. Vérifier l'accès à l'API Realtime

### Le jury ne parle pas
**Solution** : Problème audio
1. Vérifier l'autorisation du navigateur pour l'audio
2. Ouvrir la console (F12) et chercher les erreurs
3. Vérifier la connexion WebRTC
4. Rafraîchir la page et réessayer

### Le microphone ne fonctionne pas
**Solution** : Permissions du navigateur
1. Autoriser explicitement le microphone
2. Vérifier dans les paramètres du navigateur
3. Tester le microphone dans une autre application
4. Essayer un autre navigateur (Chrome recommandé)

## 📊 Commandes SQL Utiles

### Voir toutes les sessions
```sql
SELECT id, user_id, title, 
       length(topic) as topic_length,
       created_at 
FROM oral_blanc_sessions 
ORDER BY created_at DESC;
```

### Compter les sessions par utilisateur
```sql
SELECT user_id, COUNT(*) as session_count
FROM oral_blanc_sessions
GROUP BY user_id
ORDER BY session_count DESC;
```

### Supprimer toutes les sessions (ATTENTION)
```sql
-- ⚠️ DANGER: Supprime TOUTES les sessions
-- DELETE FROM oral_blanc_sessions;

-- Mieux : Supprimer seulement les sessions de test
DELETE FROM oral_blanc_sessions 
WHERE title LIKE '%Test%';
```

### Voir les politiques RLS
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'oral_blanc_sessions';
```

## 🔍 Logs de Débogage

### Côté Serveur (Terminal)
```bash
npm run dev

# Rechercher ces messages:
# [Oral Blanc Session] Starting session creation...
# [Oral Blanc Session] User authenticated: [user-id]
# [Oral Blanc Session] Topic received, length: [length]
# [Oral Blanc Session] Calling OpenAI API...
# [Oral Blanc Session] Session created successfully
```

### Côté Client (Console Navigateur)
```javascript
// Ouvrir Console (F12)
// Rechercher ces messages:
// Data channel opened
// Session created
// Session ready, sending initial message
// Audio playing successfully
```

## 📱 Test Manuel Complet

### Scénario 1 : Session Complète
1. Créer une session "Histoire - Révolution Française"
2. Coller un cours d'histoire complet (500+ mots)
3. Démarrer la session
4. Répondre à 3 questions du jury
5. Observer l'adaptation des questions
6. Terminer la session
7. Vérifier qu'elle est toujours dans la liste

### Scénario 2 : Session Rapide
1. Onglet "Session Rapide"
2. Coller un texte court sur la photosynthèse
3. Démarrer immédiatement
4. Répondre à 2 questions
5. Terminer (ne devrait pas sauvegarder)
6. Vérifier qu'elle n'apparaît pas dans la liste

### Scénario 3 : Modification
1. Créer une session "Test Math"
2. Sujet : cours de mathématiques
3. Modifier : changer le sujet pour un cours de physique
4. Démarrer et vérifier que le jury pose des questions de physique

### Scénario 4 : Suppression
1. Créer une session "À Supprimer"
2. Supprimer immédiatement
3. Vérifier qu'elle disparaît de la liste

## 🎯 Critères de Succès

### ✅ Le module est prêt si :
1. **Création** : Vous pouvez créer une session avec titre et sujet
2. **Liste** : Les sessions créées apparaissent dans la liste
3. **Démarrage** : Cliquer sur "Commencer" établit la connexion
4. **Jury** : Le jury se présente et pose une première question
5. **Interaction** : Vous pouvez répondre vocalement
6. **Transcription** : Vos réponses sont transcrites
7. **Adaptation** : Le jury pose une deuxième question pertinente
8. **Modification** : Vous pouvez éditer une session
9. **Suppression** : Vous pouvez supprimer une session
10. **Isolation** : Vous ne voyez que vos propres sessions

### ❌ Problème si :
- Les sessions ne se créent pas
- La liste est vide après création
- Le bouton "Commencer" ne fait rien
- Le jury ne parle pas
- Le microphone ne capture pas
- Les sessions d'autres utilisateurs sont visibles
- Les modifications ne sont pas sauvegardées

## 📞 Support

### En cas de problème persistant :

1. **Vérifier les logs** (terminal + console navigateur)
2. **Consulter la documentation** : `ORAL_BLANC_GUIDE.md`
3. **Vérifier l'implémentation** : `ORAL_BLANC_IMPLEMENTATION.md`
4. **Comparer avec Quiz Oral** : Le code est similaire
5. **Vérifier Supabase** : Tables, RLS, politiques

### Fichiers à vérifier en priorité :
- `supabase-oral-blanc-schema.sql` → Base de données
- `app/api/oral-blanc/session/route.ts` → Connexion OpenAI
- `components/OralBlancPlayer.tsx` → Interface audio
- `.env.local` → Variables d'environnement

## 🎉 C'est Terminé !

Si tous les tests passent, votre module Oral Blanc est **100% opérationnel** ! 

Vous pouvez maintenant :
- 🎓 Créer des sessions d'entraînement
- 🗣️ Vous entraîner avec le jury virtuel
- 📚 Préparer vos concours et examens
- 💡 Tester votre compréhension de n'importe quel sujet

**Bonne chance pour vos oraux ! 🚀**

