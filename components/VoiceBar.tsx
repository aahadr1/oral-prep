'use client';

import { useEffect, useRef, useState } from 'react';

interface VoiceBarProps {
  instructions?: string;
  initialText?: string; // text the AI should speak immediately
  voice?: string;
}

type GlobalVoiceState = {
  aiAudio?: HTMLAudioElement | null;
  ttsLock?: boolean;
  initialSpokenKeys?: Record<string, boolean>;
};

function getGlobalVoiceState(): GlobalVoiceState {
  if (typeof window === 'undefined') return {};
  const w = window as any;
  if (!w.__voiceState) w.__voiceState = { aiAudio: null, ttsLock: false, initialSpokenKeys: {} };
  return w.__voiceState as GlobalVoiceState;
}

export default function VoiceBar({ instructions, initialText, voice }: VoiceBarProps) {
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognitionReady, setRecognitionReady] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [userMode, setUserMode] = useState(false); // manual talk toggle
  const [speechSpeed, setSpeechSpeed] = useState(1.3); // TTS speed control
  const recognitionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const initialSpokenRef = useRef(false);
  const busyRef = useRef(false);
  const keyRef = useRef<string>('');

  useEffect(() => {
    try {
      const w: any = window;
      keyRef.current = `${w.__currentProjectId || ''}:${w.__currentDocumentId || ''}:${w.__currentPageNumber || ''}`;
    } catch {}
  }, []);

  const playBeep = (durationMs = 120, freq = 660) => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.04; // very soft
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        try { osc.stop(); ctx.close(); } catch {}
      }, durationMs);
    } catch {}
  };

  // Prepare Web Speech API recognition
  useEffect(() => {
    const SpeechRecognition: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      setError('La reconnaissance vocale n\'est pas supportée par ce navigateur.');
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'fr-FR';
    rec.interimResults = false;
    rec.continuous = false; // manual end or silence end
    rec.onstart = () => {};
    rec.onend = () => {};
    rec.onerror = (e: any) => setError(e?.error || 'Erreur de reconnaissance');
    rec.onresult = async (ev: any) => {
      if (busyRef.current) return; // throttle while processing
      busyRef.current = true;
      try {
        const transcript = ev.results?.[0]?.[0]?.transcript || '';
        if (!transcript) { busyRef.current = false; return; }
        setUserSpeaking(false);
        playBeep(100, 520);
        const chatResp = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: (window as any).__currentProjectId, documentId: (window as any).__currentDocumentId, page: (window as any).__currentPageNumber, userText: transcript, instructions }),
        });
        const chatJson = await chatResp.json();
        if (!chatResp.ok) throw new Error(chatJson?.error || 'Erreur assistant');
        await speakText(chatJson.assistantText);
      } catch (err: any) {
        setError(err?.message || 'Erreur de flux vocal');
      } finally {
        busyRef.current = false;
      }
    };
    recognitionRef.current = rec;
    setRecognitionReady(true);
  }, [instructions]);

  const stopMicLevelLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const startMicLevelLoop = (stream: MediaStream) => {
    try {
      const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        // We keep measuring but immediate visual state relies on userMode
        setUserSpeaking(userMode && (rms > 0.02));
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {}
  };

  const getGlobalAudio = (): HTMLAudioElement => {
    const g = getGlobalVoiceState();
    if (!g.aiAudio) g.aiAudio = new Audio();
    return g.aiAudio!;
  };

  const stopGlobalAudio = () => {
    try {
      const g = getGlobalVoiceState();
      if (g.aiAudio) {
        g.aiAudio.onended = null as any;
        g.aiAudio.onpause = null as any;
        g.aiAudio.pause();
        g.aiAudio.currentTime = 0;
      }
    } catch {}
    setAiSpeaking(false);
  };

  const speakText = async (text: string) => {
    // Serialize TTS across app
    const g = getGlobalVoiceState();
    if (g.ttsLock) return; // skip if another TTS is in progress
    g.ttsLock = true;

    try { recognitionRef.current?.abort?.(); } catch {}
    const res = await fetch('/api/replicate/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: 'fr', pageTitle: 'Narration', speed: speechSpeed, voice }),
    });
    const json = await res.json();
    if (!res.ok || !json?.audioUrl) throw new Error(json?.error || 'tts_failed');

    stopGlobalAudio();
    const a = getGlobalAudio();
    a.src = json.audioUrl;
    a.onplay = () => setAiSpeaking(true);
    const stop = () => {
      setAiSpeaking(false);
      // do not auto-start listening; user toggles manually
    };
    a.onpause = stop;
    a.onended = stop;
    try {
      await a.play();
      setAudioBlocked(false);
    } catch (e: any) {
      setAudioBlocked(true);
    } finally {
      g.ttsLock = false;
    }
  };

  const startListening = async () => {
    if (!recognitionRef.current) return;
    try {
      if (!micStreamRef.current) {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = mic;
        startMicLevelLoop(mic);
      }
      recognitionRef.current.start();
    } catch (e: any) {
      if (!String(e?.message || '').toLowerCase().includes('already')) {
        setError(e?.message || 'Impossible de démarrer l\'écoute');
      }
    }
  };

  const stopListening = () => {
    try { recognitionRef.current?.stop?.(); } catch {}
  };

  // Auto-start only the initial narration; guarded globally per page
  useEffect(() => {
    (async () => {
      try {
        if (initialText && !initialSpokenRef.current) {
          initialSpokenRef.current = true;
          await speakText(initialText);
        }
      } catch (e: any) {
        setError(e?.message || 'Erreur initiale de TTS');
      }
    })();
    return () => {
      stopMicLevelLoop();
      // do not stop global audio here to avoid cutting speech on hot reload
    };
  }, [initialText]);

  // Reset initial spoken flag when initialText changes
  useEffect(() => {
    initialSpokenRef.current = false;
  }, [initialText]);

  // Click on circle toggles user talk mode
  const onCircleClick = async () => {
    setUserMode((prev) => {
      const next = !prev;
      if (next) {
        // User takes the floor: cut AI, show black/white + ring immediately, start listening
        stopGlobalAudio();
        setAiSpeaking(false);
        setUserSpeaking(true);
        playBeep(80, 740);
        startListening();
      } else {
        // End user turn: stop listening, reset user visual; AI will answer next
        stopListening();
        setUserSpeaking(false);
      }
      return next;
    });
  };

  // UI styles
  const ringClass = userMode ? 'ring-4 ring-blue-500' : '';
  const stateClass = userMode
    ? 'bg-gradient-to-br from-black to-white'
    : aiSpeaking
      ? 'bg-blue-500 shadow-[0_0_0_6px_rgba(59,130,246,0.25)] animate-pulse'
      : 'bg-gray-300';

  return (
    <div className="border-t border-gray-200 p-4 bg-white">
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={onCircleClick}
          className={`w-16 h-16 rounded-full ${stateClass} ${ringClass} outline-none focus:ring-4 focus:ring-blue-400 transition`}
          title={userMode ? 'Cliquez pour terminer votre tour' : 'Cliquez pour parler'}
        />
      </div>
      
      {/* Speed control */}
      <div className="mt-3 flex items-center justify-center gap-3">
        <span className="text-xs text-gray-600">Vitesse</span>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={speechSpeed}
          onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
          className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          title={`Vitesse: ${speechSpeed}x`}
        />
        <span className="text-xs text-gray-600 min-w-[30px]">{speechSpeed}x</span>
      </div>

      {audioBlocked && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => {
              try { getGlobalAudio().play(); setAudioBlocked(false); } catch (e: any) { setError(e?.message || 'Lecture bloquée'); }
            }}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm"
            title="Activer l&rsquo;audio"
          >
            Activer l&rsquo;audio
          </button>
        </div>
      )}
      {error && (
        <div className="mt-2 text-center text-xs text-red-600">{error}</div>
      )}
    </div>
  );
}


