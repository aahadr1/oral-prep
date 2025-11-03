import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderOptions {
  sampleRate?: number;
  onAudioData?: (base64Audio: string) => void;
  onLevelUpdate?: (level: number) => void;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const { 
    sampleRate = 24000, 
    onAudioData,
    onLevelUpdate 
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioBufferRef = useRef<Uint8Array[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Convert Float32Array to base64-encoded PCM16
  const floatTo16BitPCM = useCallback((float32Array: Float32Array): string => {
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
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording) return;

    try {
      setError(null);
      setIsRecording(true);
      setRecordingDuration(0);
      audioBufferRef.current = [];
      startTimeRef.current = Date.now();

      // Start duration timer
      intervalRef.current = setInterval(() => {
        setRecordingDuration(Date.now() - startTimeRef.current);
      }, 100);

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate
        }
      });
      streamRef.current = stream;

      // Setup audio processing
      const audioContext = new AudioContext({ sampleRate });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      let totalSamples = 0;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calculate audio level
        const sum = inputData.reduce((acc, val) => acc + Math.abs(val), 0);
        const avg = sum / inputData.length;

        // Update level visualization
        onLevelUpdate?.(avg * 10);

        // Only process non-silent audio
        if (avg > 0.001) {
          const base64Audio = floatTo16BitPCM(inputData);
          const audioBytes = new Uint8Array(atob(base64Audio).split('').map(c => c.charCodeAt(0)));
          
          // Store for duration calculation
          audioBufferRef.current.push(audioBytes);
          totalSamples += inputData.length;

          // Send to callback
          onAudioData?.(base64Audio);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      processorRef.current = processor;

    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError(err.message || 'Failed to start recording');
      setIsRecording(false);
      stopRecording();
    }
  }, [isRecording, sampleRate, onAudioData, onLevelUpdate, floatTo16BitPCM]);

  const stopRecording = useCallback(async (): Promise<number> => {
    // Clear duration timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop recording flag
    setIsRecording(false);

    // Wait to ensure all audio is processed
    await new Promise(resolve => setTimeout(resolve, 200));

    // Clean up audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

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

    // Calculate total duration
    const totalBytes = audioBufferRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
    const totalMs = Math.round((totalBytes * 1000) / (sampleRate * 2)); // 16-bit = 2 bytes per sample

    console.log(`Recording stopped. Total duration: ${totalMs}ms`);
    
    return totalMs;
  }, [sampleRate]);

  const getRecordingStats = useCallback(() => {
    const totalBytes = audioBufferRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
    const totalMs = Math.round((totalBytes * 1000) / (sampleRate * 2));
    return {
      duration: totalMs,
      bytes: totalBytes,
      chunks: audioBufferRef.current.length
    };
  }, [sampleRate]);

  return {
    isRecording,
    error,
    recordingDuration,
    startRecording,
    stopRecording,
    getRecordingStats
  };
}
