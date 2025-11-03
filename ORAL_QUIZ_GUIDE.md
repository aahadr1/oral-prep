# Guide Complet - Module Quiz Oral

## Vue d'ensemble

Le module Quiz Oral est une fonctionnalité innovante qui utilise l'API OpenAI Realtime pour créer un agent vocal intelligent capable de :
- Poser des questions oralement
- Écouter et comprendre vos réponses
- Évaluer vos réponses selon des critères spécifiques
- Donner un feedback constructif
- Passer automatiquement à la question suivante

## Configuration requise

### 1. Clé API OpenAI
Assurez-vous d'avoir une clé API OpenAI avec accès à l'API Realtime (gpt-4o-realtime-preview).

Dans votre fichier `.env.local`:
```
OPENAI_API_KEY=sk-...votre-clé-api...
```

### 2. Navigateur compatible
- Chrome, Edge, ou tout navigateur moderne supportant WebRTC
- Microphone fonctionnel avec permissions accordées

## Guide étape par étape

### Étape 1 : Accéder au Quiz Oral

1. Connectez-vous à l'application
2. Sur le tableau de bord, vous verrez un grand bouton bleu "ORAL QUIZ"
3. Cliquez sur "Commencer le Quiz Oral"

### Étape 2 : Préparer vos questions

1. **Ajouter une question** :
   - Cliquez sur "Ajouter une question"
   - Saisissez votre question dans le champ texte
   - Exemple : "Quels sont les trois piliers du développement durable?"

2. **Définir les critères d'évaluation** :
   - Pour chaque question, ajoutez les critères que la réponse doit contenir
   - Cliquez sur "Ajouter un critère" pour chaque élément requis
   - Exemple de critères :
     - "économique"
     - "social"
     - "environnemental"

3. **Gérer vos questions** :
   - Vous pouvez ajouter plusieurs questions
   - Utilisez le bouton X pour supprimer une question
   - Utilisez le bouton X à côté d'un critère pour le retirer

### Étape 3 : Démarrer le quiz

1. Vérifiez que toutes vos questions ont :
   - Un texte de question non vide
   - Au moins un critère défini

2. Cliquez sur le bouton "Démarrer le Quiz Oral"

3. **Autorisation du microphone** :
   - Votre navigateur vous demandera l'autorisation d'accéder au microphone
   - Cliquez sur "Autoriser"

4. **Connexion à l'agent vocal** :
   - L'application se connecte à l'API OpenAI
   - Attendez le message "Connecté - Le quiz va commencer"

### Étape 4 : Passer le quiz

1. **L'agent pose la première question** :
   - Écoutez attentivement la question posée oralement
   - L'agent annoncera "Question 1 sur X"
   - Attendez que l'agent termine de parler (indicateur visuel bleu)

2. **Prendre la parole** :
   - **IMPORTANT** : Cliquez sur le bouton vert "Prendre la parole" quand l'agent a terminé
   - L'indicateur visuel passe au vert pour montrer que c'est votre tour
   - Vous verrez une barre de niveau audio qui montre que votre voix est captée

3. **Répondre oralement** :
   - Parlez clairement dans votre microphone
   - Mentionnez tous les critères requis dans votre réponse
   - Cliquez sur "Terminer ma réponse" quand vous avez fini

4. **Recevoir le feedback** :
   - L'agent écoute votre vraie réponse et l'évalue
   - Si tous les critères sont présents : "Très bien ! Vous avez mentionné tous les points importants..."
   - Si des critères manquent : "Vous avez dit [...]. C'est bien, vous avez mentionné [...], mais il manquait [...]"
   - L'agent attend que vous soyez prêt avant de continuer

5. **Progression contrôlée** :
   - L'agent vous demande si vous êtes prêt pour la question suivante
   - Le processus se répète jusqu'à la dernière question

### Étape 5 : Terminer le quiz

1. À la fin du quiz, l'agent annonce votre score final
2. Vous pouvez :
   - Arrêter le quiz à tout moment avec le bouton "Arrêter le Quiz"
   - Recommencer avec les mêmes questions
   - Créer de nouvelles questions

## Interface améliorée

### Indicateurs visuels
- **Agent (bleu)** : Quand l'agent parle, son icône s'anime avec un cercle bleu
- **Vous (vert)** : Quand c'est votre tour, votre icône s'anime avec un cercle vert
- **Niveau audio** : Une barre montre le niveau de votre voix en temps réel

### Contrôle manuel
- **Bouton "Prendre la parole"** : Cliquez pour interrompre l'agent et commencer à parler
- **Bouton "Terminer ma réponse"** : Cliquez quand vous avez fini de répondre
- L'agent attend vraiment votre réponse et ne simule jamais

### Messages en temps réel
- Les messages de l'agent apparaissent dans une bulle bleue
- Votre transcription apparaît dans une bulle verte
- Tous les échanges sont visibles pour un suivi clair

## Conseils pour une utilisation optimale

### Formulation des questions
- Soyez clair et précis dans vos questions
- Évitez les questions trop complexes ou ambiguës
- Utilisez un langage simple et direct

### Définition des critères
- Utilisez des mots-clés spécifiques plutôt que des phrases complètes
- Les critères sont évalués de manière flexible (l'ordre n'importe pas)
- L'agent reconnaît les variantes et synonymes proches

### Réponses orales
- Parlez distinctement et à un rythme normal
- Faites une pause naturelle à la fin de votre réponse
- Si l'agent ne comprend pas, reformulez votre réponse

### Environnement
- Choisissez un endroit calme sans bruit de fond
- Utilisez un bon microphone ou casque si possible
- Testez votre microphone avant de commencer

## Exemples d'utilisation

### Exemple 1 : Préparation à un examen d'histoire
**Question** : "Quelles sont les causes principales de la Première Guerre mondiale?"
**Critères** :
- Assassinat de l'archiduc
- Système d'alliances
- Nationalisme
- Impérialisme

### Exemple 2 : Formation en entreprise
**Question** : "Quels sont les éléments clés d'un bon service client?"
**Critères** :
- Écoute active
- Empathie
- Résolution de problème
- Communication claire

### Exemple 3 : Apprentissage des langues
**Question** : "Comment se présenter en français?"
**Critères** :
- Nom
- Âge
- Profession
- Lieu d'habitation

## Dépannage

### L'agent ne m'entend pas
1. Vérifiez les permissions du microphone dans votre navigateur
2. Testez votre microphone dans les paramètres système
3. Rafraîchissez la page et réessayez

### La connexion échoue
1. Vérifiez votre connexion internet
2. Assurez-vous que la clé API OpenAI est correctement configurée
3. Vérifiez que vous avez accès à l'API Realtime dans votre compte OpenAI

### L'agent ne comprend pas mes réponses
1. Parlez plus lentement et distinctement
2. Réduisez le bruit de fond
3. Rapprochez-vous du microphone

## Limitations actuelles

- Le quiz fonctionne uniquement en français
- Une connexion internet stable est requise
- Le navigateur doit supporter WebRTC
- L'API OpenAI Realtime doit être disponible

## Support

Pour toute question ou problème, consultez la documentation principale de l'application ou contactez le support technique.
