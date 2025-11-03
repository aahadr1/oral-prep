// AudioWorkletProcessor for real-time audio processing
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  // Convert Float32Array to Int16Array (PCM16)
  floatTo16BitPCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input && input[0]) {
      const inputData = input[0];
      
      // Copy input data to buffer
      for (let i = 0; i < inputData.length; i++) {
        this.buffer[this.bufferIndex++] = inputData[i];
        
        // When buffer is full, process and send
        if (this.bufferIndex >= this.bufferSize) {
          // Calculate audio level
          let sum = 0;
          for (let j = 0; j < this.bufferSize; j++) {
            sum += Math.abs(this.buffer[j]);
          }
          const avgLevel = sum / this.bufferSize;
          
          // Only send non-silent audio
          if (avgLevel > 0.001) {
            const pcm16 = this.floatTo16BitPCM(this.buffer);
            
            // Send to main thread
            this.port.postMessage({
              type: 'audio',
              data: pcm16,
              level: avgLevel * 10
            });
          }
          
          // Reset buffer
          this.bufferIndex = 0;
        }
      }
    }
    
    return true; // Keep processor alive
  }
}

registerProcessor('audio-processor', AudioProcessor);
