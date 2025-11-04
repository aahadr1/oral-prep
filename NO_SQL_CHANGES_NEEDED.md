# Aucune Modification SQL Nécessaire

La fonctionnalité d'import intelligent utilise la structure de base de données existante :

## Structure Existante Utilisée

```sql
-- Table oral_quizzes
-- Champs utilisés :
-- - title: TEXT NOT NULL (stocke le titre généré)
-- - description: TEXT (stocke la description générée)
-- - questions: JSONB (stocke les questions et critères)

-- Format JSONB des questions :
[
  {
    "question": "La question extraite ou générée",
    "criteria": ["Critère 1", "Critère 2", "Critère 3"]
  }
]
```

## Pourquoi Aucune Modification ?

1. **Structure JSONB Flexible** : Le champ `questions` utilise déjà JSONB qui peut stocker notre format de questions avec critères

2. **Tous les Champs Nécessaires** : 
   - `title` pour le titre auto-généré
   - `description` pour la description auto-générée
   - `questions` pour les questions et critères extraits

3. **Compatibilité Totale** : L'import intelligent génère exactement le même format de données que la création manuelle

## Vérification

Pour vérifier que vos tables sont bien créées, utilisez :

```sql
-- Vérifier l'existence de la table
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'oral_quizzes'
);

-- Voir la structure de la table
\d oral_quizzes
```
