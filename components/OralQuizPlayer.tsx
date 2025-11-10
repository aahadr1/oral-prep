'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface Question {
  question: string;
  criteria: string[];
}

interface OralQuizPlayerProps {
  questions: Question[];
  onComplete: () => void;
  onUserSpoke?: () => void;
  questionNumber?: number;
}

export interface OralQuizPlayerRef {
  cancelActiveResponse: () => void;
}

type Speaker = 'agent' | 'user' | 'none';
type ConnectionState = 'disconnected' | 'connecting' | 'connected';

const OralQuizPlayer = forwardRef<OralQuizPlayerRef, OralQuizPlayerProps>(({ questions, onComplete, onUserSpoke, questionNumber = 1 }, ref) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [currentSpeaker, setCurrentSpeaker] = useState<Speaker>('none');
  const [agentText, setAgentText] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const [audioBufferSize, setAudioBufferSize] = useState(0);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioBufferRef = useRef<Uint8Array[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const hasActiveResponseRef = useRef(false);
  const sessionReadyRef = useRef(false);
  const previousQuestionRef = useRef<string>('');
  const isFirstMountRef = useRef(true);

  // Send event through data channel
  const sendEvent = (event: any) => {
    if (dataChannelRef.current?.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify(event));
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    cancelActiveResponse: () => {
      if (hasActiveResponseRef.current) {
        console.log('Cancelling active response from parent request');
        sendEvent({ type: 'response.cancel' });
        hasActiveResponseRef.current = false;
        setCurrentSpeaker('none');
      }
    }
  }));

  // Detect question changes and ask agent to announce the new question
  useEffect(() => {
    // Skip on first mount
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      previousQuestionRef.current = questionNumber.toString();
      return;
    }
    
    // If question number changed and we're connected, ask agent to announce it
    if (questionNumber.toString() !== previousQuestionRef.current && 
        connectionState === 'connected' && 
        sessionReadyRef.current) {
      
      console.log(`[OralQuizPlayer] Question changed to #${questionNumber}, asking agent to announce it`);
      previousQuestionRef.current = questionNumber.toString();
      
      // Cancel any active response first
      if (hasActiveResponseRef.current) {
        console.log('[OralQuizPlayer] Cancelling active response before announcing new question');
        sendEvent({ type: 'response.cancel' });
        hasActiveResponseRef.current = false;
      }
      
      // Clear any transcripts
      setAgentText('');
      setUserTranscript('');
      
      // Small delay to ensure cancellation is processed
      setTimeout(() => {
        // Ask agent to announce the new question
        sendEvent({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{
              type: 'input_text',
              text: `Question suivante s'il vous plaît. Posez maintenant la question numéro ${questionNumber}.`
            }]
          }
        });
        
        // Request response
        setTimeout(() => {
          sendEvent({ type: 'response.create' });
          hasActiveResponseRef.current = true;
          setCurrentSpeaker('agent');
        }, 100);
      }, 100);
    }
  }, [questionNumber, connectionState]);

  // Convert Float32Array to base64-encoded PCM16
  const floatTo16BitPCM = (float32Array: Float32Array): string => {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    const byteArray = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < byteArray.length; i++) {
      binary += String.fromCharCode(byteArray[i]);
    }
    return btoa(binary);
  };

  // Audio level visualization
  const updateAudioLevel = () => {
    if (workletNodeRef.current && isListening) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  };

  // Start listening for user input
  const startListening = async () => {
    if (isListening || !dataChannelRef.current) return;
    
    try {
      setIsListening(true);
      isListeningRef.current = true;
      setUserTranscript('');
      setCurrentSpeaker('user');
      setAudioBufferSize(0);
      audioBufferRef.current = [];
      
      // Only cancel if there's an active response
      if (hasActiveResponseRef.current) {
        sendEvent({ type: 'response.cancel' });
        hasActiveResponseRef.current = false;
      }
      
      // Clear input buffer
      sendEvent({ type: 'input_audio_buffer.clear' });
      
      // Wait for buffer to be cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000
        } 
      });
      streamRef.current = stream;
      
      // Setup audio processing with proper sample rate
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;
      
      // Resume audio context if suspended (common browser restriction)
      if (audioContext.state === 'suspended') {
        console.log('Audio context suspended, resuming...');
        await audioContext.resume();
      }
      
      // Load and setup audio worklet
      let workletLoaded = false;
      try {
        await audioContext.audioWorklet.addModule('/audio-worklet-processor.js');
        workletLoaded = true;
      } catch (error) {
        console.warn('Failed to load audio worklet, falling back to ScriptProcessor:', error);
      }
      
      const source = audioContext.createMediaStreamSource(stream);
      
      let audioChunkCount = 0;
      let totalSamplesProcessed = 0;
      
      // Try to use AudioWorkletNode if available
      if (workletLoaded && audioContext.audioWorklet) {
        try {
          const workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');
          
          // Handle messages from the worklet
          workletNode.port.onmessage = (event) => {
            if (!isListeningRef.current || !dataChannelRef.current) {
              return;
            }
            
            const { type, buffer, level } = event.data;
            
            if (type === 'audio' && buffer) {
              // Update visualization
              setAudioLevel(level * 20);
              
              // Low threshold for better sensitivity
              if (level > 0.00001) {
                // Convert and store audio data
                const base64Audio = floatTo16BitPCM(buffer);
                const audioBytes = new Uint8Array(atob(base64Audio).split('').map(c => c.charCodeAt(0)));
                audioBufferRef.current.push(audioBytes);
                
                // Send to server
                const audioEvent = {
                  type: 'input_audio_buffer.append',
                  audio: base64Audio
                };
                sendEvent(audioEvent);
                
                audioChunkCount++;
                totalSamplesProcessed += buffer.length;
                // Update buffer size (more accurate calculation)
                const currentBufferMs = Math.round((totalSamplesProcessed * 1000) / 24000);
                setAudioBufferSize(currentBufferMs);
              }
            }
          };
          
          source.connect(workletNode);
          workletNode.connect(audioContext.destination);
          workletNodeRef.current = workletNode;
          
        } catch (error) {
          console.error('Error creating AudioWorkletNode:', error);
          throw error;
        }
      } else {
        // Fallback to ScriptProcessorNode if AudioWorklet is not available
        const processor = audioContext.createScriptProcessor(2048, 1, 1);
        
        processor.onaudioprocess = (e) => {
          if (!isListeningRef.current || !dataChannelRef.current) {
            return;
          }
          
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Check if there's actual audio (not silence)
          const sum = inputData.reduce((acc, val) => acc + Math.abs(val), 0);
          const avg = sum / inputData.length;
          
          // Update visualization
          setAudioLevel(avg * 20);
          
          // Low threshold for better sensitivity
          if (avg > 0.00001) {
            // Convert and store audio data
            const base64Audio = floatTo16BitPCM(inputData);
            const audioBytes = new Uint8Array(atob(base64Audio).split('').map(c => c.charCodeAt(0)));
            audioBufferRef.current.push(audioBytes);
            
            // Send to server
            const audioEvent = {
              type: 'input_audio_buffer.append',
              audio: base64Audio
            };
            sendEvent(audioEvent);
            
            audioChunkCount++;
            totalSamplesProcessed += inputData.length;
            // Update buffer size
            const currentBufferMs = Math.round((totalSamplesProcessed * 1000) / 24000);
            setAudioBufferSize(currentBufferMs);
          }
        };
        
        source.connect(processor);
        processor.connect(audioContext.destination);
        workletNodeRef.current = processor as any;
      }
      
      // Start visualization
      updateAudioLevel();
      
    } catch (err) {
      console.error('Error starting listening:', err);
      setError('Erreur d\'accès au microphone');
      stopListening();
    }
  };

  // Stop listening
  const stopListening = async () => {
    if (!isListening) return;
    
    // Stop visualization
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Keep listening flag true briefly to capture final audio
    const finalNode = workletNodeRef.current;
    
    // Wait a bit to ensure all audio is processed
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setIsListening(false);
    isListeningRef.current = false;
    setAudioLevel(0);
    
    // Disconnect audio processing
    if (finalNode) {
      finalNode.disconnect();
      if (finalNode.port) {
        finalNode.port.close();
      }
      workletNodeRef.current = null;
    }
    
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        await audioContextRef.current.close();
      } catch (e) {
        console.error('Error closing audio context:', e);
      }
      audioContextRef.current = null;
    }
    
    // Check if we have enough audio
    const totalAudioBytes = audioBufferRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
    const totalAudioMs = Math.round((totalAudioBytes * 1000) / (24000 * 2)); // 16-bit = 2 bytes per sample
    
    console.log(`Total audio captured: ${totalAudioMs}ms`);
    
    // Lower minimum threshold to 50ms instead of 100ms
    if (totalAudioMs < 50) {
      setError(`Pas assez d'audio capturé (${totalAudioMs}ms). Assurez-vous que votre microphone fonctionne et parlez plus fort.`);
      audioBufferRef.current = [];
      setAudioBufferSize(0);
      setCurrentSpeaker('none');
      return;
    }
    
    // Notifier que l'utilisateur a parlé (débloquer les boutons)
    if (onUserSpoke) {
      onUserSpoke();
    }
    
    // Commit audio buffer and request response
    sendEvent({ type: 'input_audio_buffer.commit' });
    
    // Wait a bit for commit to process
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Create response
    sendEvent({ type: 'response.create' });
    hasActiveResponseRef.current = true;
    
    // Clear buffer
    audioBufferRef.current = [];
    setAudioBufferSize(0);
    setCurrentSpeaker('agent');
  };

  // Initialize connection
  const connect = async () => {
    try {
      setConnectionState('connecting');
      setError(null);
      
      // Get session token
      const response = await fetch('/api/oral-quiz/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || 'Failed to get session token';
        const solution = errorData.solution || errorData.help;
        throw new Error(solution ? `${errorMessage}. ${solution}` : errorMessage);
      }
      
      const { client_secret } = await response.json();
      
      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      // Add microphone track (required for offer)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      pc.addTransceiver('audio', { direction: 'sendrecv' });
      stream.getTracks().forEach(track => track.stop()); // Stop the track immediately
      
      // Setup remote audio
      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;
      
      pc.ontrack = (e) => {
        console.log('Received remote track', e.streams[0]);
        audio.srcObject = e.streams[0];
        
        // Force play in case autoplay is blocked
        audio.play().then(() => {
          console.log('Audio playing successfully');
        }).catch((err) => {
          console.error('Error playing audio:', err);
          setError('Impossible de jouer l\'audio. Cliquez n\'importe où pour activer le son.');
        });
      };
      
      // Create data channel
      const dc = pc.createDataChannel('oai-events', { ordered: true });
      
      dc.onopen = () => {
        console.log('Data channel opened');
        setConnectionState('connected');
        
        // Wait for session to be ready before sending initial message
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max
        const waitForSession = setInterval(() => {
          attempts++;
          
          if (sessionReadyRef.current) {
            clearInterval(waitForSession);
            console.log('Session ready, sending initial message');
            
            // Send initial message to start the quiz with the first question
            if (!hasActiveResponseRef.current) {
              sendEvent({
                type: 'conversation.item.create',
                item: {
                  type: 'message',
                  role: 'user',
                  content: [{
                    type: 'input_text',
                    text: 'Bonjour, je suis prêt. Veuillez poser la première question.'
                  }]
                }
              });
              
              // Small delay before creating response to ensure message is processed
              setTimeout(() => {
                sendEvent({ type: 'response.create' });
                hasActiveResponseRef.current = true;
                setCurrentSpeaker('agent');
                console.log('Initial response requested');
              }, 200);
            }
          } else if (attempts >= maxAttempts) {
            clearInterval(waitForSession);
            console.error('Session timeout - forcing initial message');
            setError('Délai d\'attente de session dépassé. Essayez de rafraîchir la page.');
          }
        }, 100);
      };
      
      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          handleServerEvent(event);
        } catch (err) {
          console.error('Error parsing server event:', err);
        }
      };
      
      dataChannelRef.current = dc;
      
      // Create and set offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Send offer to OpenAI
      const openAIResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${client_secret}`,
            'Content-Type': 'application/sdp'
          },
          body: offer.sdp
        }
      );
      
      if (!openAIResponse.ok) {
        throw new Error('Failed to connect to OpenAI');
      }
      
      const answer = await openAIResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answer });
      
      pcRef.current = pc;
      
    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message);
      setConnectionState('disconnected');
    }
  };

  // Handle server events
  const handleServerEvent = (event: any) => {
    switch (event.type) {
      case 'error':
        console.error('Server error:', event);
        if (event.error?.message?.includes('buffer too small') || event.error?.message?.includes('buffer is too small')) {
          setError('Pas assez d\'audio capturé. Parlez plus fort et plus longtemps.');
        } else if (event.error?.code === 'response_cancel_not_active') {
          // Ignore this error - it's expected when we try to cancel without active response
              // Ignore - expected when no active response
        } else {
          setError(event.error?.message || 'Erreur serveur');
        }
        hasActiveResponseRef.current = false;
        break;
        
      case 'session.created':
        console.log('Session created');
        sessionReadyRef.current = true;
        break;
        
      case 'conversation.item.created':
        if (event.item?.role === 'assistant') {
          const text = event.item.content?.[0]?.text || 
                      event.item.content?.[0]?.transcript || '';
          if (text) {
            setAgentText(text);
          }
        }
        break;
        
      case 'response.text.delta':
        setAgentText(prev => prev + (event.delta || ''));
        break;
        
      case 'response.audio.delta':
        console.log('Audio delta received - agent is speaking');
        setCurrentSpeaker('agent');
        hasActiveResponseRef.current = true;
        break;
        
      case 'response.audio_transcript.delta':
        console.log('Transcript delta:', event.delta);
        setCurrentSpeaker('agent');
        hasActiveResponseRef.current = true;
        break;
        
      case 'response.audio.done':
        console.log('Audio done - agent finished speaking');
        setCurrentSpeaker('none');
        hasActiveResponseRef.current = false;
        break;
        
      case 'response.audio_transcript.done':
        console.log('Transcript done');
        break;
        
      case 'response.done':
        console.log('Response done');
        setCurrentSpeaker('none');
        hasActiveResponseRef.current = false;
        break;
        
      case 'response.cancelled':
        console.log('Response cancelled');
        hasActiveResponseRef.current = false;
        setCurrentSpeaker('none');
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        setUserTranscript(event.transcript || '');
        break;
        
      case 'input_audio_buffer.speech_started':
        console.log('Speech detected');
        break;
        
      case 'input_audio_buffer.speech_stopped':
        console.log('Speech stopped');
        break;
        
      case 'input_audio_buffer.committed':
        console.log('Audio buffer committed successfully');
        break;
        
      case 'input_audio_buffer.cleared':
        console.log('Audio buffer cleared');
        break;
    }
  };

  // Disconnect
  const disconnect = () => {
    void stopListening();
    
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    setConnectionState('disconnected');
    setCurrentSpeaker('none');
    setAgentText('');
    setUserTranscript('');
  };

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      {/* Connection Status */}
      <div className="flex justify-between items-center mb-6">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
          connectionState === 'connected' ? 'bg-green-100 text-green-700' :
          connectionState === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            connectionState === 'connected' ? 'bg-green-500' :
            connectionState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            'bg-gray-500'
          }`} />
          {connectionState === 'connected' ? 'Connecté' :
           connectionState === 'connecting' ? 'Connexion...' :
           'Déconnecté'}
        </div>
        
        <button
          onClick={onComplete}
          className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition"
        >
          Arrêter le Quiz
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {connectionState === 'connected' && (
        <div className="space-y-6">
          {/* Speaker Indicators */}
          <div className="flex justify-center gap-12">
            {/* Agent */}
            <div className={`text-center transition-all duration-300 ${
              currentSpeaker === 'agent' ? 'scale-110' : 'scale-90 opacity-60'
            }`}>
              <div className={`relative w-20 h-20 rounded-full flex items-center justify-center ${
                currentSpeaker === 'agent' 
                  ? 'bg-blue-100 ring-4 ring-blue-300' 
                  : 'bg-gray-100'
              }`}>
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {currentSpeaker === 'agent' && (
                  <div className="absolute inset-0 rounded-full animate-pulse bg-blue-200 opacity-50" />
                )}
              </div>
              <p className="mt-2 text-sm font-medium">Agent</p>
            </div>

            {/* User */}
            <div className={`text-center transition-all duration-300 ${
              currentSpeaker === 'user' ? 'scale-110' : 'scale-90 opacity-60'
            }`}>
              <div className={`relative w-20 h-20 rounded-full flex items-center justify-center ${
                currentSpeaker === 'user' 
                  ? 'bg-green-100 ring-4 ring-green-300' 
                  : 'bg-gray-100'
              }`}>
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {currentSpeaker === 'user' && (
                  <div className="absolute -inset-1">
                    <div className="absolute inset-0 rounded-full bg-green-200 opacity-50 animate-ping" />
                    <div 
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-green-500 rounded-full transition-all"
                      style={{ transform: `translateX(-50%) scaleX(${audioLevel})` }}
                    />
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm font-medium">Vous</p>
              {isListening && audioBufferSize > 0 && (
                <p className="text-xs text-green-600 mt-1">{audioBufferSize}ms enregistré</p>
              )}
            </div>
          </div>

          {/* Control Button */}
          <div className="flex justify-center">
            {!isListening ? (
              <button
                onClick={startListening}
                disabled={currentSpeaker === 'agent'}
                className={`group relative px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                  currentSpeaker === 'agent'
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transform hover:scale-105 shadow-lg'
                }`}
              >
                <span className="flex items-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  {currentSpeaker === 'agent' ? 'L\'agent parle...' : 'Prendre la parole'}
                </span>
              </button>
            ) : (
              <button
                onClick={stopListening}
                className="group relative px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold text-lg hover:from-red-600 hover:to-red-700 transform hover:scale-105 shadow-lg transition-all"
              >
                <span className="flex items-center gap-3">
                  <div className="relative">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    <div className="absolute -inset-2 bg-red-400 rounded-full animate-ping opacity-75" />
                  </div>
                  Terminer ma réponse
                </span>
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {agentText && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-fadeIn">
                <p className="text-sm font-semibold text-blue-900 mb-1">Agent :</p>
                <p className="text-blue-800 whitespace-pre-wrap">{agentText}</p>
              </div>
            )}
            
            {userTranscript && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-fadeIn">
                <p className="text-sm font-semibold text-green-900 mb-1">Votre réponse :</p>
                <p className="text-green-800">{userTranscript}</p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Instructions :</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Attendez que l&rsquo;agent finisse de parler (indicateur bleu)</li>
                  <li>Cliquez sur <strong>&quot;Prendre la parole&quot;</strong> pour commencer</li>
                  <li>Parlez clairement pendant au moins 2-3 secondes</li>
                  <li>Cliquez sur <strong>&quot;Terminer ma réponse&quot;</strong> quand vous avez fini</li>
                  <li>Si l&rsquo;audio n&rsquo;est pas capturé, vérifiez votre microphone et parlez plus fort</li>
                  <li>L&rsquo;indicateur vert montre le nombre de millisecondes enregistrées</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

OralQuizPlayer.displayName = 'OralQuizPlayer';

export default OralQuizPlayer;