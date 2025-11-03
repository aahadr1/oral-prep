'use client';

import { useState, useRef, useEffect } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import VoiceBar from './VoiceBar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

interface AgentSidebarProps {
  projectId: string;
  documentId: string;
  documentName: string;
  currentPage: number;
  currentPageText?: string;
}

export default function AgentSidebar({
  projectId,
  documentId,
  documentName,
  currentPage,
  currentPageText,
}: AgentSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [autoVoice, setAutoVoice] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [showVoiceBar, setShowVoiceBar] = useState(false);
  const [voiceInstructions, setVoiceInstructions] = useState<string | undefined>(undefined);
  const [voiceInitialText, setVoiceInitialText] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseBrowser();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Expose identifiers for VoiceBar STT route
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__currentProjectId = projectId;
      (window as any).__currentDocumentId = documentId;
      (window as any).__currentPageNumber = currentPage;
    }
  }, [projectId, documentId, currentPage]);

  // Reset voice bar when page changes
  useEffect(() => {
    setVoiceInitialText('');
    setShowVoiceBar(false);
  }, [currentPage]);

  // Listen for text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';
      setSelectedText(text);
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  // Audio playback controls
  const playAudio = (audioUrl: string, messageId: string) => {
    // Stop current audio if playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const audio = new Audio(audioUrl);
    audio.onended = () => {
      setPlayingMessageId(null);
      setCurrentAudio(null);
    };
    audio.onerror = () => {
      console.error('Error playing audio');
      setPlayingMessageId(null);
      setCurrentAudio(null);
    };

    setCurrentAudio(audio);
    setPlayingMessageId(messageId);
    audio.play();
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      setPlayingMessageId(null);
    }
  };

  const toggleAudio = (audioUrl: string, messageId: string) => {
    if (playingMessageId === messageId) {
      stopAudio();
    } else {
      playAudio(audioUrl, messageId);
    }
  };

  const explainPage = async () => {
    await sendMessage("Explique clairement le contenu de cette page.");
  };

  const explainSelection = async () => {
    if (!selectedText) return;
    await sendMessage(`Explique ce passage : "${selectedText}"`);
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Look up pre-rendered page image alias for the current page
      let pageImage: string | undefined = undefined;
      try {
        const { data: pageRow, error: pageError } = await supabase
          .from('document_pages')
          .select('image_path')
          .eq('document_id', documentId)
          .eq('page_number', currentPage)
          .maybeSingle();
        
        if (pageError) {
          console.warn('document_pages query error:', pageError);
        } else if (pageRow?.image_path) {
          const { data: signed } = await supabase.storage
            .from('project-docs')
            .createSignedUrl(pageRow.image_path, 60 * 60);
          if (signed?.signedUrl) {
            pageImage = signed.signedUrl;
          }
        }
      } catch (e) {
        console.error('Error fetching page image alias:', e);
      }

      if (!pageImage) {
        // Fallback: try to capture current page from DocumentViewer
        try {
          const captureMethod = (window as any).__captureCurrentPage;
          if (typeof captureMethod === 'function') {
            pageImage = await captureMethod();
            console.log('Using live page capture as fallback');
          }
        } catch (captureErr) {
          console.warn('Live page capture failed:', captureErr);
        }
      }

      if (!pageImage) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            "Image de la page introuvable. Assurez-vous que le document a bien été pré‑rendu (pages indexées). Réuploadez le PDF pour déclencher le rendu des pages.",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        return;
      }

      // Get last assistant message for context
      const lastAssistantMessage = messages
        .filter(m => m.role === 'assistant')
        .pop();

      // Call API
      const response = await fetch('/api/replicate/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          documentId,
          documentName,
          page: currentPage,
          prompt: messageText,
          pageImage,
          pageText: currentPageText,
          selectedText: selectedText || undefined,
          conversationContext: lastAssistantMessage?.content,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Erreur lors de la génération de la réponse';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: data.explanation,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save explanation as a note (minimal persistence)
      // Best-effort: save explanation note only if table exists (ignore 404 REST errors)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: noteErr } = await supabase.from('project_notes').insert({
            project_id: projectId,
            document_id: documentId,
            page: currentPage,
            title: `${documentName} - Page ${currentPage}`,
            content: data.explanation,
            created_by: user.id,
          });
          if (noteErr) {
            console.warn('project_notes insert skipped:', noteErr.message);
          }
        }
      } catch (e) {
        console.warn('project_notes not available, skipping.');
      }

      // Realtime voice bar handles speech; no direct TTS call here

      // Enable realtime voice bar with the explanation as instructions
      setVoiceInstructions(`Tu es un tuteur IA francophone. Parle naturellement et reste fidèle à l'explication fournie. Contexte d'explication de la page ${currentPage} du document "${documentName}".`);
      setVoiceInitialText(data.explanation);
      setShowVoiceBar(true);
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Désolé, une erreur est survenue : ${error.message}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setSelectedText('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const saveAsNote = async (message: Message) => {
    if (message.role !== 'assistant') return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('project_notes').insert({
        project_id: projectId,
        document_id: documentId,
        page: currentPage,
        title: `${documentName} - Page ${currentPage}`,
        content: message.content,
        created_by: user.id,
      });

      if (error) throw error;

      alert('Note sauvegardée avec succès !');
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Erreur lors de la sauvegarde de la note');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copié dans le presse-papier !');
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Agent IA</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoVoice(!autoVoice)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                autoVoice
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={autoVoice ? 'Voix automatique activée' : 'Voix automatique désactivée'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              {autoVoice ? 'Voix ON' : 'Voix OFF'}
            </button>
            {currentAudio && (
              <button
                onClick={stopAudio}
                className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition"
                title="Arrêter la lecture"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-600">
          {documentName} - Page {currentPage}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-sm">
              Posez une question sur cette page ou demandez une explication
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                  {message.audioUrl && (
                    <button
                      onClick={() => toggleAudio(message.audioUrl!, message.id)}
                      className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                      title={playingMessageId === message.id ? 'Pause' : 'Écouter'}
                    >
                      {playingMessageId === message.id ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Pause
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Écouter
                        </>
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={() => copyToClipboard(message.content)}
                    className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                    title="Copier"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copier
                  </button>
                  
                  <button
                    onClick={() => saveAsNote(message)}
                    className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1"
                    title="Sauvegarder comme note"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Sauvegarder
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                <span className="text-sm text-gray-600">Analyse en cours...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <button
          onClick={explainPage}
          disabled={loading}
          className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Expliquer cette page
        </button>

        {selectedText && (
          <button
            onClick={explainSelection}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            Expliquer la sélection
          </button>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez une question..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>

      {showVoiceBar && (
        <div className="border-t border-gray-200">
          <VoiceBar instructions={voiceInstructions} initialText={voiceInitialText} voice="alloy" />
        </div>
      )}
    </div>
  );
}

