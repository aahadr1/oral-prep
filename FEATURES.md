# 🎨 Fonctionnalités et Interface - Oral Prep

## 🖥️ Aperçu de l'Interface

### 1. Page de Connexion (`/auth/login`)

```
┌─────────────────────────────────────┐
│                                     │
│         🎓 Connexion               │
│    Accédez à votre espace          │
│                                     │
│    Email: [________________]       │
│    Mot de passe: [________]        │
│                                     │
│    [Se connecter]                  │
│                                     │
│    Pas encore de compte ?          │
│    Créer un compte                 │
└─────────────────────────────────────┘
```

**Fonctionnalités** :
- ✅ Validation email format
- ✅ Validation mot de passe (min 6 chars)
- ✅ Messages d'erreur clairs
- ✅ Lien vers inscription
- ✅ Redirection automatique si déjà connecté

---

### 2. Page d'Inscription (`/auth/signup`)

```
┌─────────────────────────────────────┐
│                                     │
│      🎓 Créer un compte            │
│   Commencez votre préparation      │
│                                     │
│    Email: [________________]       │
│    Mot de passe: [________]        │
│    Confirmer: [___________]        │
│                                     │
│    [Créer un compte]               │
│                                     │
│    Déjà un compte ?                │
│    Se connecter                    │
└─────────────────────────────────────┘
```

**Fonctionnalités** :
- ✅ Validation email
- ✅ Vérification correspondance mots de passe
- ✅ Minimum 6 caractères
- ✅ Création automatique du profil
- ✅ Connexion automatique après inscription

---

### 3. Dashboard - Liste des Projets (`/projets`)

```
┌─────────────────────────────────────────────────────────┐
│ Sidebar        │  Mes Projets         [Créer un projet] │
│                │  Gérez vos projets de préparation      │
│ 🎓 Oral Prep   │                                        │
│                │  ┌────────────┐  ┌────────────┐       │
│ 📁 Projets     │  │ 📂 Maths   │  │ 📂 Physique│       │
│                │  │ 3 docs     │  │ 5 docs     │       │
│                │  │ 15 oct     │  │ 20 oct     │       │
│                │  └────────────┘  └────────────┘       │
│                │                                        │
│        [@]     │  ┌────────────┐                        │
│                │  │ 📂 Chimie  │                        │
│                │  │ 2 docs     │                        │
│                │  │ 22 oct     │                        │
│                │  └────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

**Fonctionnalités** :
- ✅ Sidebar fixe à gauche
- ✅ Menu utilisateur en haut à droite
- ✅ Bouton "Créer un projet" toujours visible
- ✅ Grille responsive de projets
- ✅ État vide avec message si aucun projet
- ✅ Nombre de documents par projet
- ✅ Date de création affichée
- ✅ Hover effects sur les cartes

**État Vide** :
```
┌─────────────────────────────────────┐
│                                     │
│        📂                           │
│                                     │
│   Aucun projet pour l'instant      │
│   Créez votre premier projet       │
│   pour commencer                   │
│                                     │
│   [Créer un projet]                │
│                                     │
└─────────────────────────────────────┘
```

---

### 4. Création de Projet (`/projets/nouveau`)

```
┌─────────────────────────────────────────────────────────┐
│ Sidebar        │  Créer un projet                       │
│                │  Ajoutez vos documents et commencez    │
│ 🎓 Oral Prep   │                                        │
│                │  Nom du projet *                       │
│ 📁 Projets     │  [_________________________________]   │
│                │  42/120 caractères                     │
│                │                                        │
│                │  Documents source                      │
│                │  ┌──────────────────────────────┐     │
│        [@]     │  │   📤                         │     │
│                │  │   Glissez-déposez vos       │     │
│                │  │   documents ici             │     │
│                │  │   ou cliquez pour           │     │
│                │  │   sélectionner              │     │
│                │  │   (max 10, 50 Mo chacun)    │     │
│                │  └──────────────────────────────┘     │
│                │                                        │
│                │  Documents sélectionnés (2/10)        │
│                │  ┌─────────────────────────┐          │
│                │  │ 📄 cours-maths.pdf   ❌ │          │
│                │  │ 2.3 Mo                  │          │
│                │  └─────────────────────────┘          │
│                │  ┌─────────────────────────┐          │
│                │  │ 📄 exercices.pdf     ❌ │          │
│                │  │ 1.8 Mo                  │          │
│                │  └─────────────────────────┘          │
│                │                                        │
│                │  [Annuler]  [Terminé]                 │
└─────────────────────────────────────────────────────────┘
```

**Fonctionnalités** :
- ✅ Input nom avec compteur de caractères (max 120)
- ✅ Zone drag-n-drop pour les fichiers
- ✅ Preview des fichiers sélectionnés
- ✅ Affichage taille de chaque fichier
- ✅ Bouton supprimer par fichier
- ✅ Validation : max 10 fichiers
- ✅ Validation : max 50 Mo par fichier
- ✅ Messages d'erreur clairs
- ✅ Progress indicator pendant upload
- ✅ Redirection vers projet après création

---

### 5. Page d'un Projet (`/projets/[id]`)

```
┌─────────────────────────────────────────────────────────┐
│ Sidebar        │  ← Retour aux projets                  │
│                │                                        │
│ 🎓 Oral Prep   │  Préparation Mathématiques            │
│                │  📄 5 documents • 📅 Créé le 15 oct   │
│ 📁 Projets     │                                        │
│                │  Modules d'apprentissage               │
│                │  ┌────────────────┐ ┌──────────────┐  │
│                │  │ 💬 Apprendre  │ │ 📝 Apprendre │  │
│        [@]     │  │ avec l'agent  │ │ avec quiz    │  │
│                │  │ Posez vos     │ │ Testez vos   │  │
│                │  │ questions → │ │ connaissances │  │
│                │  └────────────────┘ └──────────────┘  │
│                │  ┌────────────────┐ ┌──────────────┐  │
│                │  │ 🗂️ Apprendre  │ │ 🎥 Apprendre │  │
│                │  │ avec fiches   │ │ avec vidéos  │  │
│                │  │ Révisez       │ │ Explorez     │  │
│                │  │ efficacement →│ │ visuellement→│  │
│                │  └────────────────┘ └──────────────┘  │
│                │                                        │
│                │  Entraînement oral                     │
│                │  ┌──────────────────────────────────┐ │
│                │  │ 🎤 Tester mes connaissances     │ │
│                │  │    Pratiquez avec des questions │ │
│                │  │    orales courtes        →     │ │
│                │  └──────────────────────────────────┘ │
│                │  ┌──────────────────────────────────┐ │
│                │  │ ✅ Faire un oral blanc complet  │ │
│                │  │    Simulez un examen oral       │ │
│                │  │    réel                  →     │ │
│                │  └──────────────────────────────────┘ │
│                │                                        │
│                │  Documents du projet                   │
│                │  ┌──────────────────────────────────┐ │
│                │  │ 📄 cours-chap1.pdf    2.3 Mo    │ │
│                │  │ 📄 cours-chap2.pdf    1.8 Mo    │ │
│                │  │ 📄 exercices.pdf      3.2 Mo    │ │
│                │  │ 📄 correction.pdf     2.1 Mo    │ │
│                │  │ 📄 formulaire.pdf     0.5 Mo    │ │
│                │  └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Fonctionnalités** :
- ✅ Breadcrumb de navigation
- ✅ Titre du projet
- ✅ Statistiques (nombre docs, date création)
- ✅ 4 modules d'apprentissage (mock)
- ✅ 2 modules d'entraînement oral (mock)
- ✅ Cartes cliquables avec hover effects
- ✅ Modules principaux style secondaire
- ✅ Modules oraux style primaire (noir)
- ✅ Liste complète des documents
- ✅ Affichage taille de chaque document
- ✅ Design cohérent et moderne

---

## 🎨 Design System

### Couleurs

```
Primaire (texte/buttons)
  ■ Gray 900: #111827

Secondaire (backgrounds)
  □ Gray 50: #F9FAFB
  □ Gray 100: #F3F4F6

Borders
  ─ Gray 200: #E5E7EB
  ─ Gray 300: #D1D5DB

Texte
  Gray 900: Titres
  Gray 700: Corps
  Gray 600: Secondaire
  Gray 500: Muted
```

### Typographie

```
Titres
  3xl (30px): Page headers
  2xl (24px): Section headers
  xl (20px): Card titles
  lg (18px): Subsections

Corps
  base (16px): Texte normal
  sm (14px): Détails
  xs (12px): Metadata
```

### Espacements

```
Marges internes (padding)
  p-2: 8px
  p-3: 12px
  p-4: 16px
  p-6: 24px
  p-8: 32px

Marges externes (margin)
  Identiques aux padding

Gaps (espaces entre éléments)
  gap-2: 8px
  gap-3: 12px
  gap-4: 16px
```

### Composants

**Buttons**
```css
Primary: bg-gray-900 text-white hover:bg-gray-800
Secondary: border-gray-300 hover:bg-gray-50
```

**Cards**
```css
bg-white border-gray-200 rounded-xl
hover:border-gray-300 hover:shadow-sm
```

**Inputs**
```css
border-gray-300 rounded-lg
focus:ring-2 focus:ring-gray-900
```

---

## ⚡ Interactions

### Animations

- ✅ Transitions douces (transition duration-200)
- ✅ Hover states sur tous les éléments cliquables
- ✅ Focus states pour accessibilité
- ✅ Loading spinners pendant les actions
- ✅ Smooth scroll

### Feedback Utilisateur

- ✅ Messages d'erreur en rouge clair
- ✅ Messages de succès (via redirection)
- ✅ Loading states pendant les requêtes
- ✅ Disabled states sur les boutons
- ✅ Progress indicators pour uploads

### États

**Loading**
```
  ⟳ Chargement...
```

**Error**
```
  ⚠️ Une erreur est survenue
```

**Empty**
```
  📂 Aucun projet pour l'instant
```

**Success**
```
  → Redirection automatique
```

---

## 📱 Responsive Design

### Mobile (< 768px)
- Sidebar cachée (à implémenter avec menu burger)
- Grille 1 colonne
- Textes plus petits
- Touch-friendly buttons (min 44px)

### Tablet (768px - 1024px)
- Sidebar visible
- Grille 2 colonnes
- Layout compact

### Desktop (> 1024px)
- Sidebar fixe
- Grille 3 colonnes
- Layout spacieux
- Hover effects complets

---

## 🔒 Sécurité Visible

### Indicateurs de Sécurité

- ✅ Sessions automatiques
- ✅ Déconnexion facile (menu avatar)
- ✅ Validation immédiate des formulaires
- ✅ Messages d'erreur non techniques
- ✅ Pas d'exposition de données sensibles

### Validations

**Côté Client** :
- Format email
- Longueur mot de passe
- Taille fichiers
- Nombre de fichiers

**Côté Serveur** :
- RLS Supabase
- Contraintes DB
- Politiques Storage
- Triggers

---

## 🎯 User Flow Complet

```
1. Arrivée sur /
   ↓
2. Redirection → /auth/login (si non connecté)
   ↓
3. Inscription via /auth/signup
   ↓
4. Connexion automatique
   ↓
5. Redirection → /projets (vide)
   ↓
6. Clic "Créer un projet"
   ↓
7. Page /projets/nouveau
   ↓
8. Remplir nom + upload docs
   ↓
9. Clic "Terminé" → Upload en cours
   ↓
10. Redirection → /projets/[id]
    ↓
11. Voir les modules (mock)
    ↓
12. Explorer les documents
    ↓
13. Retour à /projets
    ↓
14. Voir son projet dans la liste
    ↓
15. Déconnexion via menu avatar
    ↓
16. Retour à /auth/login
```

---

## 🎨 Améliorations Futures (UI/UX)

### Court Terme
- [ ] Mode sombre
- [ ] Menu burger mobile
- [ ] Breadcrumbs améliorés
- [ ] Tooltips explicatifs
- [ ] Animations de transitions

### Moyen Terme
- [ ] Système de notifications
- [ ] Recherche de projets
- [ ] Filtres et tri
- [ ] Tags/catégories
- [ ] Vue liste/grille toggle

### Long Terme
- [ ] Thèmes personnalisables
- [ ] Raccourcis clavier
- [ ] Mode plein écran
- [ ] Widgets dashboard
- [ ] Analytics visuels

---

**Version UI** : 1.0.0  
**Design Language** : Minimaliste, Apple-inspired  
**Framework CSS** : Tailwind CSS 3+

