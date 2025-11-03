import { NextRequest, NextResponse } from 'next/server';
import { runTextModel } from '@/lib/replicate';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { extractDocxText } from '@/lib/doc-extract/docx';
import { extractPPTXText } from '@/lib/doc-extract/pptx';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, action, documents, types, difficulty, count, pageRange } = body;

    if (!projectId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
      .eq('action', 'text')
      .eq('date', today)
      .single();

    const currentCount = usage?.count || 0;
    const limit = 10; // 10 calls per day

    if (currentCount >= limit) {
      return NextResponse.json(
        {
          error: `Limite quotidienne atteinte (${limit} générations par jour). Réessayez demain.`,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    if (action === 'generate_quiz') {
      // Fetch document content
      const { data: docs } = await supabase
        .from('project_documents')
        .select('*')
        .in('id', documents || []);

      if (!docs || docs.length === 0) {
        return NextResponse.json({ error: 'No documents found' }, { status: 400 });
      }

      // Extract text from documents
      let combinedText = '';
      for (const doc of docs) {
        try {
          // Get signed URL
          const { data: urlData } = await supabase.storage
            .from('project-docs')
            .createSignedUrl(doc.path, 300); // 5 minutes

          if (!urlData?.signedUrl) continue;

          // Fetch document
          const response = await fetch(urlData.signedUrl);
          const arrayBuffer = await response.arrayBuffer();

          // Extract text based on type
          if (doc.content_type === 'application/pdf') {
            // For PDF, we'd need to use pdf-parse or similar on server
            // For now, skip PDFs in text generation (can be enhanced)
            combinedText += `\n\n[Document: ${doc.name}]\n`;
          } else if (doc.content_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const { text } = await extractDocxText(arrayBuffer);
            combinedText += `\n\n[Document: ${doc.name}]\n${text}`;
          } else if (doc.content_type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
            const slides = await extractPPTXText(arrayBuffer);
            const text = slides.map(s => s.text).join('\n\n');
            combinedText += `\n\n[Document: ${doc.name}]\n${text}`;
          }
        } catch (error) {
          console.error(`Error extracting text from ${doc.name}:`, error);
        }
      }

      // Limit context size
      const maxChars = 8000;
      if (combinedText.length > maxChars) {
        combinedText = combinedText.slice(0, maxChars) + '\n\n[Texte tronqué...]';
      }

      // Build prompt for quiz generation
      const typesList = types.join(', ');
      const difficultyText = difficulty === 'facile' ? 'facile' : difficulty === 'difficile' ? 'difficile' : 'moyen';

      const systemPrompt = `Tu es un générateur de quiz expert pour des étudiants. Tu génères des questions de qualité en français.

IMPORTANT: Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après.

Format de sortie (JSON array):
[
  {
    "type": "mcq",
    "question": "Question ici ?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option B",
    "explanation": "Explication courte"
  },
  {
    "type": "flashcard",
    "question": "Concept ou terme",
    "answer": "Définition ou explication",
    "explanation": "Contexte additionnel"
  },
  {
    "type": "open",
    "question": "Question ouverte ?",
    "answer": "Réponse modèle attendue",
    "explanation": "Points clés à mentionner"
  }
]`;

      const userPrompt = `Génère ${count} questions de type: ${typesList}
Difficulté: ${difficultyText}

Contenu source:
${combinedText}

Règles:
- Questions pertinentes et pédagogiques basées sur le contenu
- Pour les QCM: 4 options avec une seule correcte
- Variété dans les sujets couverts
- Explications claires et concises
- JSON valide uniquement`;

      // Call text model
      const response = await runTextModel(userPrompt, systemPrompt);

      // Parse JSON response
      let items = [];
      try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonText = response.trim();
        if (jsonText.includes('```')) {
          const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (match) {
            jsonText = match[1];
          }
        }
        
        items = JSON.parse(jsonText);
        
        // Validate and clean items
        items = items.filter((item: any) => 
          item.type && item.question && item.answer
        ).map((item: any) => ({
          type: item.type,
          question: item.question,
          options: item.options || undefined,
          answer: item.answer,
          explanation: item.explanation || undefined,
        }));

      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response was:', response);
        
        // Fallback: generate basic items
        items = [{
          type: 'open',
          question: 'Résumez les points principaux du document.',
          answer: 'Réponse basée sur le contenu du document.',
          explanation: 'Cette question teste la compréhension globale.',
        }];
      }

      // Increment usage counter
      await supabase.rpc('increment_api_usage', {
        p_user_id: user.id,
        p_action: 'text',
      });

      return NextResponse.json({
        items,
        remaining: limit - currentCount - 1,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Text API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


