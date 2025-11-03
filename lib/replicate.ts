import Replicate from 'replicate';

// Model configuration
export const MODELS = {
  VISION: 'lucataco/ollama-llama3.2-vision-90b',
  TEXT: 'meta/meta-llama-3.1-70b-instruct',
  FALLBACK: 'mistralai/mixtral-8x7b-instruct-v0.1',
  TTS: 'lucataco/xtts-v2',
  MINIMAX_TTS: 'minimax/speech-02-turbo',
} as const;

// Vision model slug candidates (try in order)
const DEFAULT_VISION_VERSIONED =
  'lucataco/ollama-llama3.2-vision-90b:54202b223d5351c5afe5c0c9dba2b3042293b839d022e76f53d66ab30b9dc814';

const VISION_MODEL_SLUGS: string[] = Array.from(
  new Set(
    [
      process.env.REPLICATE_VISION_MODEL || DEFAULT_VISION_VERSIONED,
      MODELS.VISION, // unversioned fallback
    ].filter(Boolean)
  )
);

// Initialize Replicate client
export function getReplicateClient() {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN is not configured');
  }
  return new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });
}

// Vision model for page explanations
export async function runVisionModel(
  imageDataUrl: string,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const replicate = getReplicateClient();
  
  try {
    console.log('Running vision model with image URL length:', imageDataUrl.length);

    // Combine system prompt with user prompt if provided
    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\n${prompt}`
      : prompt;

    // 1) Try GPT-4o Mini first (faster)
    try {
      console.log('Trying openai/gpt-4o-mini first with image_input');
      const gptInput: any = {
        prompt: fullPrompt,
        image_input: [imageDataUrl],
        temperature: 0.7,
        top_p: 0.95,
        max_completion_tokens: 2048,
      };
      if (systemPrompt) {
        gptInput.system_prompt = systemPrompt;
      }
      const gptOutput = (await replicate.run('openai/gpt-4o-mini', {
        input: gptInput,
      })) as any;

      if (Array.isArray(gptOutput)) {
        return gptOutput.join('');
      }
      return String(gptOutput);
    } catch (gptErr: any) {
      console.warn('openai/gpt-4o-mini failed, falling back to llama3.2-vision slugs:', {
        message: gptErr?.message,
        status: gptErr?.response?.status,
      });
    }

    // 2) Fallback to Llama 3.2 Vision slugs
    let lastError: any = null;
    for (const slug of VISION_MODEL_SLUGS) {
      try {
        console.log('Trying vision model slug:', slug);
        const output = (await replicate.run(slug as any, {
          input: {
            image: imageDataUrl,
            prompt: fullPrompt,
            max_tokens: 2048,
            temperature: 0.7,
            top_p: 0.95,
          },
        })) as any;

        if (Array.isArray(output)) {
          return output.join('');
        }
        return String(output);
      } catch (err: any) {
        lastError = err;
        const status = err?.response?.status || err?.status;
        const isNotFound = status === 404 || /not found|could not be found/i.test(String(err?.message || ''));
        console.warn(`Vision model slug failed (${slug}) with status ${status}:`, err?.message);
        if (isNotFound) {
          // Try next slug
          continue;
        }
        // For non-404 errors, rethrow immediately
        throw err;
      }
    }

    // If we exhausted all slugs
    throw lastError || new Error('No available vision model');
  } catch (error: any) {
    console.error('Vision model error details:', {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
      stack: error?.stack,
    });
    
    // Provide more specific error message
    const errorMessage = error?.message || error?.response?.data?.detail || 'Erreur lors de l\'analyse de la page';
    throw new Error(errorMessage);
  }
}

// Text model for quiz generation
export async function runTextModel(
  prompt: string,
  systemPrompt?: string,
  useFallback = false
): Promise<string> {
  const replicate = getReplicateClient();
  const model = useFallback ? MODELS.FALLBACK : MODELS.TEXT;

  try {
    const output = await replicate.run(model, {
      input: {
        prompt: prompt,
        system_prompt: systemPrompt || 'Tu es un générateur de quiz expert. Tu génères uniquement du JSON valide avec des questions pertinentes en français.',
        max_tokens: 4000,
        temperature: 0.7,
        top_p: 0.9,
      },
    }) as any;

    // Handle output format
    if (Array.isArray(output)) {
      return output.join('');
    }
    return String(output);
  } catch (error) {
    console.error(`Text model error (${model}):`, error);
    
    // Try fallback if primary model fails
    if (!useFallback) {
      console.log('Retrying with fallback model...');
      return runTextModel(prompt, systemPrompt, true);
    }
    
    throw new Error('Erreur lors de la génération du quiz');
  }
}

// Stream text model for real-time generation
export async function streamTextModel(
  prompt: string,
  systemPrompt?: string,
  onChunk?: (text: string) => void
): Promise<string> {
  const replicate = getReplicateClient();

  try {
    let fullText = '';
    
    for await (const event of replicate.stream(MODELS.TEXT, {
      input: {
        prompt: prompt,
        system_prompt: systemPrompt,
        max_tokens: 4000,
        temperature: 0.7,
      },
    })) {
      const chunk = String(event);
      fullText += chunk;
      if (onChunk) {
        onChunk(chunk);
      }
    }

    return fullText;
  } catch (error) {
    console.error('Stream text model error:', error);
    throw new Error('Erreur lors de la génération');
  }
}

// Use GPT-4o to produce a detailed, narration-optimized explanation from a base text
export async function runGpt4oDetailedNarration(
  baseText: string,
  options?: { language?: string; pageTitle?: string }
): Promise<string> {
  const replicate = getReplicateClient();

  const language = options?.language || 'fr';
  const pageTitle = options?.pageTitle || 'Document';

  const systemPrompt =
    language === 'fr'
      ? `Tu es un narrateur pédagogique en français. Transforme le texte ci-dessous en une explication parlée claire, fluide et engageante.
Règles:
- Langage naturel oral (phrases courtes, enchaînements fluides)
- Mets en avant les idées clés et clarifie les termes importants, en allant un peu plus dans les détails, recherche par rapport a tous les points énoncés des informations complémentaire à donner à l'utilisateur.
- Évite les listes longues; privilégie des transitions et un ton conversationnel
- Conclus par un bref récapitulatif
- Ton texte doit etre très concis, il s'agit d'une explication de page unique, il faut donc que ca dure maximum 15-30-45secondes maximum à etre énnoncé à l'oral?.
Contexte: Explication de page: ${pageTitle}`
      : `You are a French-speaking narrator. Rewrite the text below into a clear, spoken explanation with a smooth, engaging style. Use short sentences, natural transitions, and finish with a brief recap.`;

  const userPrompt = `Texte à expliquer (ne cite pas mot-à-mot, reformule et clarifie):\n\n${baseText}`;

  try {
    const output = (await replicate.run('openai/gpt-4o', {
      input: {
        prompt: userPrompt,
        system_prompt: systemPrompt,
        temperature: 0.7,
        top_p: 0.95,
        max_completion_tokens: 800,
      },
    })) as any;

    if (Array.isArray(output)) {
      return output.join('');
    }
    return String(output);
  } catch (error) {
    console.error('gpt-4o narration error:', error);
    throw new Error("Erreur lors de l'amélioration de l'explication");
  }
}

// Text-to-Speech model for voice responses
export async function runTTSModel(
  text: string,
  options?: {
    voiceId?: string;
    speed?: number;
    volume?: number;
    pitch?: number;
    sampleRate?: 8000 | 16000 | 22050 | 24000 | 32000 | 44100;
    bitrate?: 32000 | 64000 | 128000 | 256000;
    channel?: 'mono' | 'stereo';
    emotion?: 'auto' | 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised';
    languageBoost?: 'None' | 'Automatic' | 'Chinese' | 'Chinese,Yue' | 'English' | 'Arabic' | 'Russian' | 'Spanish' | 'French' | 'Portuguese' | 'German' | 'Turkish' | 'Dutch' | 'Ukrainian' | 'Vietnamese' | 'Indonesian' | 'Japanese' | 'Italian' | 'Korean' | 'Thai' | 'Polish' | 'Romanian' | 'Greek' | 'Czech' | 'Finnish' | 'Hindi';
    englishNormalization?: boolean;
  }
): Promise<string> {
  const replicate = getReplicateClient();
  try {
    const input: any = {
      text,
      voice_id: options?.voiceId || 'Deep_Voice_Man',
      speed: options?.speed ?? 1,
      volume: options?.volume ?? 1,
      pitch: options?.pitch ?? 0,
      sample_rate: options?.sampleRate ?? 32000,
      bitrate: options?.bitrate ?? 128000,
      channel: options?.channel ?? 'mono',
      emotion: options?.emotion ?? 'auto',
      language_boost: options?.languageBoost ?? 'French',
      english_normalization: options?.englishNormalization ?? false,
    };

    console.log('Minimax TTS input:', JSON.stringify(input, null, 2));
    const output = await replicate.run(MODELS.MINIMAX_TTS, { input }) as any;
    console.log('Minimax TTS output:', output);

    // Replicate SDK returns a URL object-like with .url(), but also allows string
    if (typeof output === 'string') return output;
    if (output && typeof output.url === 'function') return output.url();
    if (output && output?.audio) return output.audio;
    throw new Error('Unexpected minimax TTS output');
  } catch (error: any) {
    console.error('Minimax TTS error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Erreur TTS (minimax): ${error?.message || 'Unknown error'}`);
  }
}

// Run Llama-Omni with an input audio URL and instruction prompt; returns {text, audio}
// Removed omni helpers to keep a sane base

// Rate limiting helper (checks Supabase for usage)
export async function checkRateLimit(
  userId: string,
  action: 'vision' | 'text',
  limits: { vision: number; text: number } = { vision: 30, text: 10 }
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  // This will be implemented with Supabase queries
  // For now, return allowed
  const now = new Date();
  const resetAt = new Date(now);
  resetAt.setHours(24, 0, 0, 0); // Reset at midnight

  return {
    allowed: true,
    remaining: action === 'vision' ? limits.vision : limits.text,
    resetAt,
  };
}

