import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { runVisionModel } from '@/lib/replicate';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectId,
      documentId,
      documentName,
      page,
      prompt,
      pageImage,
      pageText,
      selectedText,
      conversationContext,
    } = body;

    if (!projectId || !documentId || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate pageImage if provided (allow data URLs or http(s) URLs)
    if (pageImage && !pageImage.startsWith('data:') && !pageImage.startsWith('http')) {
      return NextResponse.json(
        { error: 'Invalid page image format' },
        { status: 400 }
      );
    }

    // Verify user owns the project
    const supabase = await createSupabaseServer();
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Check rate limit
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await supabase
      .from('api_usage')
      .select('count')
      .eq('user_id', user.id)
      .eq('action', 'vision')
      .eq('date', today)
      .single();

    const currentCount = usage?.count || 0;
    const limit = 30; // 30 calls per day

    if (currentCount >= limit) {
      return NextResponse.json(
        {
          error: `Limite quotidienne atteinte (${limit} appels par jour). Réessayez demain.`,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    // Build prompts (medical page – exhaustive + web research)
    const pageTitleLabel = `${documentName} — page affichée en image.`;

    const systemPrompt = `🧠 SYSTEM PROMPT — « Professeur de médecine (QI 140) — Cours oral exhaustif, sans limite, TTS-friendly »
Rôle
Tu es un professeur de médecine exceptionnellement pédagogue (QI 140), calme, très cultivé et passionné.
Tu fais un COURS ORAL intégral à un étudiant qui regarde la même page que toi.

Objectif
À la fin, même un débutant absolu comprend TOUT, sans zone d'ombre. 
Tu développes chaque détail en une explication complète, nuancée et précise, avec de nombreux liens.

Style et posture (humain, vivant, professeur)
- Parle comme en salle de cours : chaleureux, précis, professionnel, jamais sec.
- AUCUNE restriction de longueur, ni de temps, ni de nombre de mots. Déploie autant que nécessaire.
- Chaque détail mérite plusieurs phrases : définitions, mises en contexte, mécanismes, exemples, limites, liens transversaux.
- Repérage visuel permanent pour guider l'étudiant : "en haut à gauche…", "dans le schéma central…", "dans la légende du bas…".

Exigence d'exhaustivité et de profondeur
- Tu couvres TOUT ce qui est visible : titres, paragraphes, schémas, tableaux, figures, légendes, flèches, axes, couleurs, unités, abréviations, équations, notes.
- Pour CHAQUE élément, tu expliques en profondeur : ce que c'est, où ça se situe (niveau d'organisation), comment ça marche, pourquoi c'est utile ici, quelles nuances/variations/clés d'interprétation.
- Tu relies spontanément les éléments entre eux (texte ↔ figure, mécanisme ↔ clinique, normal ↔ pathologique, cause ↔ conséquence, modèle ↔ limites). Multiplie les allers-retours éclairants.
- Schémas/figures : décris les légendes, couleurs, axes, symboles, sens des flèches, puis explique la dynamique (entrée → processus → sortie) et raccorde au texte/tableau.
- Tableaux : présente la structure (colonnes, lignes, variables, unités), fais une lecture guidée et interprète chaque cellule importante en contexte.
- Équations : nomme chaque symbole, unité, relation, hypothèses d'application et finalité pédagogique ici.

Recherche web — OBLIGATOIRE et intégrée
- Tu ajoutes des compléments fiables et actuels quand la page est elliptique : définitions standard, normes, scores, seuils, guidelines, rappels mécanistiques, points de vigilance.
- Priorise sources officielles/primaires (OMS, HAS, NIH/CDC, sociétés savantes, ESC/AHA, revues indexées, manuels de référence).
- Mentionne oralement la source de façon légère ("selon la HAS 2023…", "recommandations ESC 2021…"). 
- En cas de divergence, expose-la brièvement et indique le consensus le plus récent.
- Jamais d'invention. Si introuvable : "information non retrouvée".

Anecdotes et analogies "vraie vie"
- Utilise des analogies/anecdotes **si elles éclairent réellement** un point difficile. Tu peux en faire autant que nécessaire, avec sobriété et pertinence.

Gestion de l'image et des incertitudes
- Si c'est flou/coupé, dis "[illisible]" et décris uniquement ce qui est visible, sans extrapoler.

Structure souple attendue (orale)
1) Mise en route : thème exact de la page + plan visuel réel ("schéma central + tableau à droite + encadré clinique en bas").
2) Parcours intégral de la page dans l'ordre visuel (haut→bas, gauche→droite), en développant **chaque** détail sur plusieurs phrases et en multipliant les liens utiles.
3) Compléments issus de la recherche (définitions, normes, mécanismes, repères actuels), mentionnés sobrement.
4) Récapitulatif oral riche : tu reformules les idées maîtresses **et** les connexions clés qui permettent de retenir.

Directives TTS (sans contrainte de longueur)
- Priorité à la clarté orale et au rythme pédagogique ; tu peux varier la longueur des phrases librement.
- Marque naturellement des pauses aux charnières (si SSML : <break time="250–400ms">) ; mets en valeur des mots-clés (si SSML : <emphasis>…</emphasis>).
- Développe les abréviations à la première occurrence ; lis naturellement unités et nombres.
- Évite les listes écrites ; si tu énumères, fais-le à l'oral ("d'abord… ensuite… puis…").`;

    const fullPrompt = `🗣️ USER PROMPT — « Cours oral intégral, sans limite, très détaillé, TTS-friendly »
Donne un cours oral intégral comme un professeur de médecine très pédagogue (QI 140).
L'étudiant a la page sous les yeux.

Attendus :
- Aucune limite de longueur : développe chaque détail en plusieurs phrases, avec explications, nuances et liens.
- Repère-toi sans cesse sur la page ("en haut du schéma…", "dans l'encadré de droite…", "dans la légende du bas…").
- Explique absolument tout ce qui est visible : texte, schémas, tableaux, légendes, flèches, axes, unités, abréviations, équations, notes.
- Multiplie les liens entre les éléments (mécanismes ↔ clinique, normal ↔ pathologique, texte ↔ figure).
- Ajoute des compléments fiables et actuels issus de recherches (mention orale légère des sources).
- Si une zone est illisible, dis-le et décris seulement ce qui est visible.
- Conclus par un récapitulatif riche des idées et des connexions clés.

TTS :
- Rythme pédagogique naturel, pauses aux charnières (SSML possible : <break time="250–400ms">).
- Mets en valeur les termes clés si besoin (SSML : <emphasis>…</emphasis>).
- Pas de listes écrites ; si tu énumères, fais-le à l'oral.

Contexte : ${pageTitleLabel} — page affichée à l'écran.`;

    // Call vision model
    let explanation: string;
    
    if (pageImage) {
      let imageUrl = pageImage as string;

      // If we received a data URL, upload it to Supabase and use a signed URL instead
      if (pageImage.startsWith('data:')) {
        try {
          console.log('Converting data URL to Supabase storage URL...');
          const [metadata, base64Data] = pageImage.split(',');
          const contentTypeMatch = /data:(.*?);base64/.exec(metadata || '');
          const contentType = contentTypeMatch ? contentTypeMatch[1] : 'image/png';
          const buffer = Buffer.from(base64Data, 'base64');

          const path = `users/${user.id}/${projectId}/pages/${documentId}/adhoc-${Date.now()}.png`;
          const uploadRes = await supabase.storage
            .from('project-docs')
            .upload(path, buffer, { contentType });

          if (uploadRes.error) {
            console.error('Supabase upload error:', uploadRes.error);
            throw uploadRes.error;
          }

          const { data: signed } = await supabase.storage
            .from('project-docs')
            .createSignedUrl(path, 60 * 60); // 1 hour

          if (signed?.signedUrl) {
            imageUrl = signed.signedUrl;
            console.log('Successfully uploaded image to Supabase');
          }
        } catch (uploadErr) {
          console.error('Error uploading page image:', uploadErr);
          // Fallback: keep using data URL (model may still accept it)
          console.log('Falling back to data URL');
        }
      }

      console.log('Calling vision model with image URL type:', 
        imageUrl.startsWith('data:') ? 'data URL' : 'HTTP URL');

      try {
        explanation = await runVisionModel(
          imageUrl,
          fullPrompt,
          systemPrompt
        );
      } catch (visionErr: any) {
        const msg = String(visionErr?.message || '');
        const status = (visionErr?.response && visionErr.response.status) || undefined;
        const isNotFound = msg.includes('404') || /not found|could not be found/i.test(msg) || status === 404;
        console.warn('Vision model failed, attempting text-only fallback. Reason:', msg);

        // Image-only policy: do not use text fallbacks
        if (isNotFound) {
          explanation = `Le modèle de vision n'est pas disponible pour le moment. Veuillez réessayer plus tard.`;
        } else {
          throw visionErr;
        }
      }
    } else {
      // Try to fetch pre-rendered page image from document_pages
      let imageUrlFromIndex: string | null = null;
      try {
        const { data: pageRow, error: pageError } = await supabase
          .from('document_pages')
          .select('image_path')
          .eq('document_id', documentId)
          .eq('page_number', page)
          .maybeSingle();
        
        if (pageError) {
          console.warn('document_pages query error:', pageError);
        } else if (pageRow?.image_path) {
          const { data: signed } = await supabase.storage
            .from('project-docs')
            .createSignedUrl(pageRow.image_path, 60 * 60);
          if (signed?.signedUrl) {
            imageUrlFromIndex = signed.signedUrl;
          }
        }
      } catch (e) {
        console.error('Lookup document_pages failed:', e);
      }

      if (imageUrlFromIndex) {
        explanation = await runVisionModel(
          imageUrlFromIndex,
          fullPrompt,
          systemPrompt
        );
      } else {
        return NextResponse.json(
          { error: 'Image de la page introuvable. Veuillez réindexer le document pour activer l\'analyse par image.' },
          { status: 400 }
        );
      }
    }
    
    // Ensure a non-empty explanation
    if (!explanation || !explanation.trim()) {
      throw new Error('Empty explanation from model');
    }

    // Increment usage counter
    await supabase.rpc('increment_api_usage', {
      p_user_id: user.id,
      p_action: 'vision',
    });

    return NextResponse.json({
      explanation,
      remaining: limit - currentCount - 1,
      page,
      documentName,
    });
  } catch (error: any) {
    console.error('Vision API error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    
    // Check for specific error types
    let userMessage = 'Une erreur est survenue lors de l\'analyse';
    
    if (error?.message?.includes('REPLICATE_API_TOKEN')) {
      userMessage = 'Configuration Replicate manquante. Veuillez configurer REPLICATE_API_TOKEN.';
    } else if (error?.message?.includes('rate limit')) {
      userMessage = 'Limite de taux API atteinte. Veuillez réessayer plus tard.';
    } else if (error?.message?.includes('timeout')) {
      userMessage = 'Délai d\'attente dépassé. Veuillez réessayer.';
    } else if (error?.message) {
      userMessage = error.message;
    }
    
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    );
  }
}

