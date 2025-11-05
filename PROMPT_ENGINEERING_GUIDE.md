# Prompt Engineering - Import Intelligent

## 🎯 Approche : Prompt Ultra-Détaillé et Robuste

Le système utilise un **prompt engineering avancé** de ~300 lignes pour garantir une extraction parfaite.

## 📋 Structure du Prompt

### 1. Séparation Visuelle Claire
```
═══════════════════════════════════════════════════════════════
SECTION TITRE
═══════════════════════════════════════════════════════════════
```

### 2. Sections Principales

#### A) **CONTEXTE ET OBJECTIF**
- Explique la mission globale
- Liste les types de textes acceptés
- Définit le travail attendu

#### B) **RÈGLES D'EXTRACTION DES QUESTIONS (STRICTES)**

1. **EXHAUSTIVITÉ**
   - Extraire TOUTES les questions (pas de limite)
   - Si 200 questions → extraire les 200
   - Ne sauter AUCUNE question

2. **PRÉSERVATION DU CONTENU**
   - ❌ NE PAS paraphraser
   - ✅ Garder le texte exact
   - ✅ Améliorer légèrement si mal formulé

3. **IDENTIFICATION INTELLIGENTE**
   - Questions explicites: "Comment...?", "Pourquoi...?"
   - Questions implicites: transformer concepts en questions
   - Exemple concret fourni

4. **QUESTIONS DE QUALITÉ**
   - Questions ouvertes favorisées
   - Claires et sans ambiguïté
   - Appropriées pour un oral

#### C) **RÈGLES DE CRÉATION DES CRITÈRES (ULTRA-STRICTES)**

**PRINCIPE**: Chaque critère = 1 point précis et vérifiable

1. **NOMBRE DE CRITÈRES**
   - Min: 1, Max: 5
   - Adapté à la complexité

2. **QUALITÉ DES CRITÈRES**
   
   **❌ INTERDIT** (avec exemples):
   - "Réponse complète"
   - "Bonne explication"
   - "Comprend le sujet"
   
   **✅ REQUIS** (avec exemples):
   - "Mentionne les trois piliers: économique, social, environnemental"
   - "Explique le processus de réconciliation du Virtual DOM"
   - "Compare les avantages et inconvénients de X vs Y"

3. **FORMULATION DES CRITÈRES**
   
   **Niveaux de qualité avec exemples** :
   
   🔴 **Niveau 1 (REFUSÉ)**:
   ```
   "Répond bien" → Trop vague
   ```
   
   🟡 **Niveau 2 (ACCEPTABLE mais améliorable)**:
   ```
   "Explique useState" → Manque de précision
   ```
   
   🟢 **Niveau 3 (BON)**:
   ```
   "Explique que useState est un Hook React pour gérer l'état local"
   ```
   
   🟢 **Niveau 4 (EXCELLENT)**:
   ```
   "Explique que useState retourne [valeur, setter] et donne la syntaxe: const [state, setState] = useState(initial)"
   ```

4. **CRITÈRES BASÉS SUR LE CONTEXTE**
   - Utiliser les critères existants
   - Intégrer les détails du texte
   - Transformer points importants en critères
   - **Exemple complet fourni**

#### D) **CAS PARTICULIERS ET GESTION D'ERREURS**

4 scénarios détaillés avec instructions précises:
1. Texte avec critères explicites
2. Liste simple de questions
3. Texte pédagogique (cours)
4. Texte ambigu

#### E) **FORMAT DE SORTIE JSON (STRICT)**

Structure exacte avec:
- Limites de caractères
- Validation checklist
- Format précis

#### F) **EXEMPLES COMPLETS (À SUIVRE COMME MODÈLE)**

**Exemple 1** - Liste simple:
```
Input: "1. Qu'est-ce que React ?\n2. Comment fonctionne useState ?"

Output: {
  "title": "Quiz React - Concepts de Base",
  "description": "Questions fondamentales sur React et ses Hooks",
  "questions": [
    {
      "question": "Qu'est-ce que React ?",
      "criteria": [
        "Mentionne que c'est une bibliothèque JavaScript",
        "Explique qu'elle sert à créer des interfaces utilisateur",
        "Cite le concept de composants réutilisables"
      ]
    },
    ...
  ]
}
```

**Exemple 2** - Texte de cours:
```
Input: "React est une bibliothèque créée par Facebook..."

Output: {JSON complet avec questions extraites des concepts}
```

#### G) **INSTRUCTIONS FINALES**

5 étapes numérotées claires:
1. LIRE le texte EN ENTIER
2. IDENTIFIER toutes les questions/concepts
3. GÉNÉRER des critères de HAUTE QUALITÉ
4. VÉRIFIER que chaque critère est concret
5. RETOURNER le JSON parfaitement formaté

**Message final fort**:
```
Ne paraphrase pas. Ne généralise pas. Ne sois pas vague.
Sois précis, exhaustif et professionnel.
```

## 🔧 Paramètres Techniques

### Modèle
- **GPT-4o** (le meilleur pour compréhension et raisonnement)
- `temperature: 0.2` (très bas pour cohérence)
- `response_format: { type: 'json_object' }` (force JSON valide)

### Message Structure
```javascript
messages: [
  { 
    role: 'system', 
    content: systemPrompt  // Le prompt ultra-détaillé
  },
  { 
    role: 'user', 
    content: text          // Le texte brut de l'utilisateur
  }
]
```

## 🎯 Différences Clés avec Prompt Classique

| Aspect | Prompt Classique | Notre Prompt |
|--------|------------------|--------------|
| Longueur | ~50 lignes | **~300 lignes** |
| Exemples | 0-1 | **2 complets** |
| Règles interdites | Vagues | **Liste précise** |
| Niveaux de qualité | Non | **4 niveaux** |
| Cas particuliers | Non | **4 scénarios** |
| Instructions finales | Floues | **5 étapes numérotées** |
| Séparateurs visuels | Non | **Oui (═══)** |
| Validation | Implicite | **Checklist explicite** |

## 💡 Techniques de Prompt Engineering Utilisées

### 1. **Structuration Hiérarchique**
- Sections clairement séparées
- Numérotation multi-niveau
- Titres en MAJUSCULES

### 2. **Exemples Par l'Exemple**
- 2 exemples complets input → output
- Exemples de bons ET mauvais critères
- Niveaux de qualité avec graduations

### 3. **Instructions Négatives**
- Liste explicite des interdictions (❌)
- Exemples de ce qu'il NE FAUT PAS faire
- Insistance sur "ne paraphrase pas"

### 4. **Instructions Positives**
- Liste explicite des requis (✅)
- Modèles à suivre
- Étapes numérotées

### 5. **Contraintes Strictes**
- Limites de caractères
- Format JSON exact
- Validation checklist

### 6. **Répétition Stratégique**
- Message "Ne paraphrase pas" répété
- "TOUTES les questions" répété
- "Concret et vérifiable" répété

### 7. **Émojis comme Marqueurs**
- ❌ pour interdit
- ✅ pour requis
- 🔴🟡🟢 pour niveaux
- → pour indiquer action

## 📊 Résultats Attendus

Avec ce prompt, GPT-4o devrait:

✅ **Extraire 100% des questions** (pas de perte)  
✅ **Critères toujours concrets** (jamais vagues)  
✅ **Pas de paraphrase** (texte exact préservé)  
✅ **Adaptation au contexte** (critères basés sur le contenu)  
✅ **Format JSON parfait** (toujours valide)  
✅ **Qualité professionnelle** (prêt pour production)

## 🧪 Tests de Validation

### Test 1: Liste Simple (50 questions)
```
Input: "1. Question A\n2. Question B\n...\n50. Question Z"
```
**Attendu**: 50 questions extraites, chacune avec 1-3 critères intelligents

### Test 2: Texte avec Critères
```
Input: "Question: X\nCritères:\n- A\n- B"
```
**Attendu**: Question X avec critères A et B améliorés si vagues

### Test 3: Cours Complet
```
Input: "React est... Le Virtual DOM... Les composants..."
```
**Attendu**: Questions créées sur chaque concept + critères basés sur le contenu

### Test 4: Stress Test (200 questions)
```
Input: 200 questions numérotées
```
**Attendu**: Toutes les 200 extraites (aucune perte)

## 🔒 Anti-Hallucination

Le prompt contient plusieurs mécanismes anti-hallucination:

1. **"Ne paraphrase pas"** → Force à garder le texte exact
2. **"Extrais TOUTES"** → Interdit l'omission
3. **Exemples concrets** → Montre exactement quoi faire
4. **Validation checklist** → Force la vérification
5. **Temperature: 0.2** → Réduit la créativité
6. **Format JSON strict** → Structure forcée

## 📈 Amélioration Continue

Si les résultats ne sont pas parfaits:

### Ajuster la Temperature
```javascript
temperature: 0.1  // Plus déterministe
temperature: 0.3  // Plus de variété
```

### Ajouter des Exemples
Ajouter un 3ème exemple spécifique au cas problématique

### Renforcer les Règles
Ajouter une section spécifique pour le comportement non désiré

### Tester d'Autres Modèles
- `gpt-4o-mini` : Plus rapide, moins cher
- `o1-preview` : Raisonnement avancé (mais sans JSON mode)

## 🎯 Conclusion

Ce prompt est conçu pour être:
- **Robuste** : Gère tous les cas
- **Précis** : Pas d'approximation
- **Exhaustif** : Aucune perte de données
- **Professionnel** : Qualité production

La longueur (~300 lignes) est **justifiée** car chaque section résout un problème spécifique et guide le modèle vers la perfection.

---

**Version** : 1.0  
**Modèle** : GPT-4o  
**Temperature** : 0.2  
**Status** : Production Ready ✅

