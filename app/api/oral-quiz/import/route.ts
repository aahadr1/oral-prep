import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { OralQuizQuestion } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface ExtractedQuizData {
  title: string;
  description: string;
  questions: OralQuizQuestion[];
}

interface ImportOptions {
  text: string;
  autoCriteria?: boolean;
  maxQuestions?: number;
}

export async function POST(request: NextRequest) {
  try {
    const { text, autoCriteria = true, maxQuestions = 250 } = await request.json() as ImportOptions;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    if (text.length > 500000) {
      return NextResponse.json(
        { error: 'Text is too long (max 500KB)' },
        { status: 400 }
      );
    }

    console.log(`[Import] Starting AI analysis with ${text.length} characters, autoCriteria: ${autoCriteria}, maxQuestions: ${maxQuestions}`);

    // Ultra-detailed prompt for robust extraction
    const systemPrompt = autoCriteria 
      ? `Tu es un système expert d'extraction et de structuration de questions pour quiz oral.

⚠️ RÈGLE ABSOLUE #1: EXHAUSTIVITÉ TOTALE ⚠️

SI LE TEXTE CONTIENT 121 QUESTIONS → TU DOIS EXTRAIRE LES 121 QUESTIONS
SI LE TEXTE CONTIENT 200 QUESTIONS → TU DOIS EXTRAIRE LES 200 QUESTIONS
AUCUNE EXCEPTION. AUCUNE OMISSION. AUCUN FILTERING.

Tu dois traiter le texte ligne par ligne et extraire CHAQUE question numérotée.

═══════════════════════════════════════════════════════════════
CONTEXTE
═══════════════════════════════════════════════════════════════

L'utilisateur colle un texte contenant des questions. Formats possibles:
• Liste numérotée: "1. Question A\n2. Question B\n3. Question C..."
• Format structuré: "Question: ... / Critères: ..."
• Texte de cours avec concepts à transformer en questions

═══════════════════════════════════════════════════════════════
RÈGLE #1: EXTRACTION EXHAUSTIVE (LA PLUS IMPORTANTE)
═══════════════════════════════════════════════════════════════

⚠️ ATTENTION ⚠️ C'EST LA RÈGLE LA PLUS IMPORTANTE

Tu DOIS extraire CHAQUE question présente. Pas de résumé. Pas de sélection. TOUTES.

MÉTHODE D'EXTRACTION:
1. Compte d'abord combien de questions il y a dans le texte
2. Parcours le texte ligne par ligne
3. Pour chaque ligne qui commence par un numéro ou contient "Question", extrais-la
4. Continue jusqu'à la DERNIÈRE question
5. Vérifie que tu as bien le même nombre de questions que dans le texte original

EXEMPLES:
❌ MAUVAIS: Le texte a 121 questions, tu en extrais 30 → ÉCHEC TOTAL
✅ BON: Le texte a 121 questions, tu en extrais 121 → PARFAIT

Si tu omets UNE SEULE question, tu as échoué ta mission.

═══════════════════════════════════════════════════════════════
RÈGLE #2: PRÉSERVATION DU CONTENU
═══════════════════════════════════════════════════════════════

→ Garde le texte EXACT de chaque question
→ Ne paraphrase JAMAIS
→ Ne résume JAMAIS
→ Si "1. Qu'est-ce que React ?" → Extrais "Qu'est-ce que React ?" (exact)

═══════════════════════════════════════════════════════════════
RÈGLE #3: IDENTIFICATION DES QUESTIONS
═══════════════════════════════════════════════════════════════

PATTERNS À DÉTECTER:
• Lignes qui commencent par un numéro: "1.", "2.", "3.", etc.
• Lignes avec "Question N:", "Q N:", etc.
• Phrases interrogatives: "Comment...", "Pourquoi...", "Qu'est-ce que..."
• Format "- Question X"

ALGORITHME:
pour chaque ligne dans le texte:
    si ligne commence par numéro OU contient "Question":
        extraire la question
        ajouter à la liste
fin pour

VÉRIFICATION FINALE:
nombre_questions_extraites == nombre_questions_dans_texte

═══════════════════════════════════════════════════════════════
RÈGLES DE CRÉATION DES CRITÈRES (ULTRA-STRICTES)
═══════════════════════════════════════════════════════════════

PRINCIPE: Chaque critère = 1 point précis et vérifiable qu'un évaluateur peut cocher

1. NOMBRE DE CRITÈRES
   → Minimum: 1 critère
   → Maximum: 5 critères
   → Adapté à la complexité de la question:
     * Question simple → 1-2 critères
     * Question moyenne → 2-3 critères  
     * Question complexe → 3-5 critères

2. QUALITÉ DES CRITÈRES
   → CONCRETS: "Mentionne X", "Explique Y", "Compare Z", "Décrit le processus de W"
   → VÉRIFIABLES: Un évaluateur peut cocher oui/non
   → SPÉCIFIQUES: Pas de généralités
   
   ❌ INTERDIT:
   • "Réponse complète"
   • "Bonne explication"
   • "Comprend le sujet"
   • "Répond correctement"
   • "Donne des détails"
   
   ✅ REQUIS:
   • "Mentionne les trois piliers: économique, social, environnemental"
   • "Explique le processus de réconciliation du Virtual DOM"
   • "Compare les avantages et inconvénients de X vs Y"
   • "Décrit au moins deux cas d'usage concrets"
   • "Cite les composantes principales: A, B et C"

3. FORMULATION DES CRITÈRES
   → Commence par un verbe d'action: Mentionne, Explique, Décrit, Compare, Cite, Donne, Identifie
   → Sois précis sur CE QUI doit être dit
   → Si possible, indique les éléments attendus
   
   Exemples par niveau de qualité:
   
   🔴 Niveau 1 (REFUSE):
   "Répond bien" → Trop vague
   
   🟡 Niveau 2 (ACCEPTABLE mais améliorable):
   "Explique useState" → Manque de précision
   
   🟢 Niveau 3 (BON):
   "Explique que useState est un Hook React pour gérer l'état local"
   
   🟢 Niveau 4 (EXCELLENT):
   "Explique que useState retourne [valeur, setter] et donne la syntaxe: const [state, setState] = useState(initial)"

4. CRITÈRES BASÉS SUR LE CONTEXTE
   → Si le texte source contient déjà des critères → UTILISE-LES (améliore si vagues)
   → Si le texte donne des détails sur un concept → Intègre ces détails dans les critères
   → Si le texte liste des points importants → Transforme-les en critères
   
   Exemple:
   Texte: "React utilise: 1) Composants 2) Props 3) State 4) Virtual DOM"
   Question: "Quels sont les concepts clés de React ?"
   Critères:
   • "Mentionne les composants réutilisables"
   • "Explique props (passage de données) et state (données locales)"
   • "Décrit le Virtual DOM et son rôle dans l'optimisation"

═══════════════════════════════════════════════════════════════
CAS PARTICULIERS ET GESTION D'ERREURS
═══════════════════════════════════════════════════════════════

1. TEXTE AVEC CRITÈRES EXPLICITES
   Si le texte dit: "Question: X / Critères: A, B, C"
   → Utilise ces critères mais AMÉLIORE-les s'ils sont trop vagues
   Exemple: "A" → "Mentionne le concept A et son importance"

2. LISTE SIMPLE DE QUESTIONS
   Si le texte est: "1. Question A\n2. Question B\n3. Question C"
   → Extrais les questions exactement comme écrites
   → Génère des critères intelligents basés sur le sujet de chaque question

3. TEXTE PÉDAGOGIQUE (COURS)
   Si le texte est un cours structuré:
   → Identifie les concepts clés de chaque section
   → Crée des questions sur ces concepts
   → Base les critères sur le contenu explicatif du texte

4. TEXTE AMBIGU
   Si une phrase peut être question ou affirmation:
   → Privilégie l'interprétation "question" si pertinent
   → Transforme les affirmations importantes en questions

═══════════════════════════════════════════════════════════════
FORMAT DE SORTIE JSON (STRICT)
═══════════════════════════════════════════════════════════════

{
  "title": "Titre concis et descriptif du quiz (max 60 caractères)",
  "description": "Description en 1-2 phrases (max 150 caractères)",
  "questions": [
    {
      "question": "Question complète avec ponctuation appropriée",
      "criteria": [
        "Critère 1 concret avec verbe d'action",
        "Critère 2 spécifique et vérifiable",
        "Critère 3 avec éléments précis attendus"
      ]
    }
  ]
}

VALIDATION:
✓ Toutes les questions ont AU MOINS 1 critère
✓ Aucun critère n'est vague ou générique
✓ Le titre reflète le contenu général
✓ Tout est en français correct

═══════════════════════════════════════════════════════════════
EXEMPLES COMPLETS (À SUIVRE COMME MODÈLE)
═══════════════════════════════════════════════════════════════

EXEMPLE 1 - Liste simple:
Input: "1. Qu'est-ce que React ?\n2. Comment fonctionne useState ?"

Output:
{
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
    {
      "question": "Comment fonctionne useState ?",
      "criteria": [
        "Explique que useState est un Hook React",
        "Décrit qu'il retourne un tableau [valeur, fonction de mise à jour]",
        "Donne la syntaxe: const [state, setState] = useState(initialValue)"
      ]
    }
  ]
}

EXEMPLE 2 - Texte de cours:
Input: "React est une bibliothèque créée par Facebook. Elle permet de créer des composants réutilisables. Le Virtual DOM optimise les mises à jour."

Output:
{
  "title": "Introduction à React",
  "description": "Concepts fondamentaux de la bibliothèque React",
  "questions": [
    {
      "question": "Qu'est-ce que React et qui l'a créé ?",
      "criteria": [
        "Indique que React est une bibliothèque JavaScript",
        "Mentionne que React a été créé par Facebook"
      ]
    },
    {
      "question": "Quel est l'intérêt des composants React ?",
      "criteria": [
        "Explique le concept de réutilisabilité",
        "Décrit comment les composants structurent l'application"
      ]
    },
    {
      "question": "Comment le Virtual DOM optimise-t-il les performances ?",
      "criteria": [
        "Explique le concept de représentation virtuelle du DOM",
        "Décrit le processus de comparaison et mise à jour minimale"
      ]
    }
  ]
}

═══════════════════════════════════════════════════════════════
INSTRUCTIONS FINALES (ÉTAPES OBLIGATOIRES)
═══════════════════════════════════════════════════════════════

ÉTAPE 1: COMPTER
→ Compte le nombre TOTAL de questions dans le texte
→ Note ce nombre: N

ÉTAPE 2: EXTRAIRE
→ Parcours TOUT le texte ligne par ligne
→ Extrais CHAQUE question trouvée
→ Ne saute AUCUNE ligne numérotée

ÉTAPE 3: CRÉER LES CRITÈRES
→ Pour CHAQUE question extraite, génère 1-4 critères concrets
→ Utilise les exemples fournis comme modèle
→ Évite les critères vagues

ÉTAPE 4: VÉRIFIER
→ Compte combien de questions tu as extraites
→ Compare avec le nombre N du début
→ Si différent → RECOMMENCE l'extraction

ÉTAPE 5: RETOURNER
→ Retourne le JSON avec TOUTES les questions

⚠️ RAPPEL FINAL ⚠️
Si le texte contient 121 questions et que tu en extrais seulement 30, tu as ÉCHOUÉ.
Si le texte contient 121 questions et que tu en extrais 121, tu as RÉUSSI.

AUCUNE OMISSION AUTORISÉE.
AUCUNE SÉLECTION AUTORISÉE.
AUCUN RÉSUMÉ AUTORISÉ.

Extrais TOUT. Sans exception.`
      : `Tu es un système expert d'extraction de questions. Ta mission est d'extraire TOUTES les questions présentes dans le texte, avec leurs critères s'ils existent.

═══════════════════════════════════════════════════════════════
MISSION
═══════════════════════════════════════════════════════════════

L'utilisateur a DÉSACTIVÉ la génération automatique de critères.
Tu dois:
1. Extraire TOUTES les questions du texte
2. Identifier les critères EXPLICITEMENT présents dans le texte
3. Si une question n'a PAS de critères dans le texte, retourner []

═══════════════════════════════════════════════════════════════
RÈGLES STRICTES
═══════════════════════════════════════════════════════════════

1. EXTRACTION EXHAUSTIVE
   → Extrais TOUTES les questions (aucune limite)
   → Garde le texte exact des questions
   → Ne paraphrase PAS

2. CRITÈRES
   → Si le texte dit: "Question X / Critères: A, B, C" → Extrais A, B, C
   → Si le texte dit juste: "Question X" → Retourne []
   → Ne CRÉE PAS de critères toi-même
   → Ne devine PAS de critères

3. FORMAT DE SORTIE
{
  "title": "Titre du quiz",
  "description": "Description brève",
  "questions": [
    {
      "question": "Question exacte du texte",
      "criteria": ["Critère 1", "Critère 2"] ou []
    }
  ]
}

IMPORTANT: Si une question n'a pas de critères explicites dans le texte, tu DOIS mettre "criteria": []

Ne génère AUCUN critère. Extrais seulement ce qui est présent.`;

    console.log('[Import] Calling GPT-4o for intelligent analysis...');
    
    // Count questions in text for verification
    const questionCount = (text.match(/^\s*\d+\./gm) || []).length;
    console.log(`[Import] Detected ${questionCount} numbered questions in the text`);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: systemPrompt 
        },
        { 
          role: 'user', 
          content: `NOMBRE DE QUESTIONS DANS LE TEXTE: ${questionCount}

TU DOIS EXTRAIRE CES ${questionCount} QUESTIONS. PAS MOINS.

TEXTE À ANALYSER:
${text.slice(0, 120000)}`
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const extractedData = JSON.parse(completion.choices[0].message.content!) as ExtractedQuizData;
    
    console.log(`[Import] GPT-4o extracted ${extractedData.questions?.length || 0} questions`);
    
    // Validation
    if (!extractedData.questions || !Array.isArray(extractedData.questions)) {
      throw new Error('No questions found in the provided text');
    }

    if (extractedData.questions.length === 0) {
      throw new Error('No valid questions could be extracted');
    }

    // Apply max questions limit
    const originalCount = extractedData.questions.length;
    if (originalCount > maxQuestions) {
      console.log(`[Import] Limiting to ${maxQuestions} questions (found ${originalCount})`);
      extractedData.questions = extractedData.questions.slice(0, maxQuestions);
      extractedData.description = `${maxQuestions} premières questions importées (${originalCount} trouvées au total)`;
    }

    // Clean and validate each question
    extractedData.questions = extractedData.questions
      .filter(q => q.question && q.question.trim().length > 0)
      .map(q => ({
        question: q.question.trim(),
        criteria: Array.isArray(q.criteria) && q.criteria.length > 0 
          ? q.criteria.filter(c => c && c.trim().length > 0).map(c => c.trim())
          : autoCriteria 
            ? ['Réponse claire et structurée'] // Fallback si GPT n'a pas généré de critère
            : []
      }));

    // Final validation
    if (extractedData.questions.length === 0) {
      throw new Error('All questions were filtered out during validation');
    }

    console.log(`[Import] Successfully imported ${extractedData.questions.length} questions`);

    // Calculate stats
    const questionsWithCriteria = extractedData.questions.filter(q => q.criteria.length > 0).length;
    const totalCriteria = extractedData.questions.reduce((sum, q) => sum + q.criteria.length, 0);
    const avgCriteria = questionsWithCriteria > 0 ? (totalCriteria / questionsWithCriteria).toFixed(1) : '0';

    return NextResponse.json({
      ...extractedData,
      stats: {
        totalQuestions: extractedData.questions.length,
        questionsWithCriteria,
        averageCriteriaPerQuestion: avgCriteria,
        extractedFrom: originalCount > maxQuestions ? `${originalCount} questions trouvées` : null
      }
    });

  } catch (error: any) {
    console.error('[Import] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze text',
        message: error.message || 'Unknown error',
        hint: 'Vérifiez votre clé OpenAI ou réduisez la taille du texte'
      },
      { status: 500 }
    );
  }
}
