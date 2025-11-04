# Guide d'Import Intelligent pour Quiz Oral

## Vue d'ensemble
La fonctionnalité d'Import Intelligent permet de créer automatiquement des quiz oraux en analysant du texte collé. L'IA extrait les questions et critères d'évaluation pour préremplir le formulaire de création de quiz.

## Comment utiliser l'Import Intelligent

### Étape 1 : Accéder à l'Import Intelligent
1. Cliquez sur "Nouveau Quiz" dans la page des Quiz Oraux
2. Dans la fenêtre de création, cliquez sur le bouton violet "Import Intelligent" en haut à droite

### Étape 2 : Coller votre texte
Dans la fenêtre d'import, collez l'un des types de contenu suivants :
- Questions d'entretien existantes
- Documentation technique
- Description de poste
- Cours ou supports de formation
- Tout texte à partir duquel générer des questions

### Étape 3 : Analyser et importer
1. Cliquez sur "Analyser et Importer"
2. L'IA analysera votre texte et extraira :
   - Un titre approprié pour le quiz
   - Une description du contenu
   - Les questions pertinentes
   - Les critères d'évaluation pour chaque question

### Étape 4 : Réviser et ajuster
Une fois l'import terminé, le formulaire de création sera prérempli. Vous pouvez :
- Modifier le titre et la description
- Ajouter, supprimer ou modifier des questions
- Ajuster les critères d'évaluation
- Ajouter de nouvelles questions manuellement

## Exemples de textes à importer

### Exemple 1 : Questions techniques React
```
Entretien React.js pour développeur senior

1. Qu'est-ce que React et quels sont ses principes fondamentaux ?
2. Expliquez la différence entre les composants fonctionnels et les composants de classe.
3. Comment fonctionne le Virtual DOM et pourquoi est-il important ?
4. Qu'est-ce que les hooks React et comment useState et useEffect fonctionnent-ils ?
5. Comment gérez-vous l'état global dans une application React ?
```

### Exemple 2 : Description de poste
```
Développeur Full Stack Node.js/React

Nous recherchons un développeur full stack avec expertise en:
- Node.js et Express pour le backend
- React et TypeScript pour le frontend
- Bases de données SQL et NoSQL
- API RESTful et GraphQL
- Tests unitaires et d'intégration
- CI/CD et pratiques DevOps

Le candidat devra démontrer sa capacité à:
- Concevoir des architectures scalables
- Optimiser les performances
- Travailler en équipe Agile
- Mentorer des développeurs juniors
```

### Exemple 3 : Contenu de cours
```
Introduction aux Microservices

Les microservices sont une approche architecturale où une application est construite comme un ensemble de petits services indépendants. 

Avantages:
- Scalabilité indépendante
- Déploiement indépendant
- Isolation des erreurs
- Technologies hétérogènes

Défis:
- Complexité du réseau
- Gestion des données distribuées
- Monitoring et debugging
- Cohérence des transactions
```

## Résultats attendus

L'IA générera automatiquement :

### Pour l'exemple React :
- **Titre**: "Entretien React.js Senior"
- **Questions** avec critères comme :
  - "Qu'est-ce que React et quels sont ses principes fondamentaux ?"
    - Mentionne le Virtual DOM
    - Explique la nature déclarative
    - Parle de la composition des composants
    - Évoque la unidirectionnalité du flux de données

### Pour la description de poste :
- **Titre**: "Entretien Full Stack Node.js/React"
- **Questions** générées comme :
  - "Comment concevez-vous une API RESTful avec Node.js et Express ?"
  - "Quelle est votre approche pour optimiser les performances d'une application React ?"

## Conseils pour de meilleurs résultats

1. **Texte structuré** : Les listes numérotées ou à puces sont bien reconnues
2. **Contexte clair** : Incluez le domaine ou le niveau (junior/senior)
3. **Contenu varié** : Mélangez questions techniques et comportementales
4. **Langue** : Le texte peut être en français ou anglais, les questions seront générées en français

## Limitations

- Maximum ~4000 mots par import
- L'IA peut ne pas capturer toutes les nuances
- Toujours réviser et ajuster les questions générées
- Les critères d'évaluation peuvent nécessiter des précisions

## Troubleshooting

### "Erreur lors de l'analyse du texte"
- Vérifiez que votre texte n'est pas vide
- Essayez avec un texte plus court
- Assurez-vous que l'API OpenAI est configurée

### Questions non pertinentes générées
- Ajoutez plus de contexte dans votre texte
- Structurez mieux votre contenu
- Utilisez des titres et sous-titres clairs

## Configuration requise

Assurez-vous que la variable d'environnement `OPENAI_API_KEY` est définie dans votre fichier `.env.local`.
