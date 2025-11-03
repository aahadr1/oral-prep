// Audio Worklet Processor for real-time audio capture
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048; // Smaller buffer for lower latency
    this.buffer = [];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input && input.length > 0) {
      const channelData = input[0]; // Mono channel
      
      if (channelData && channelData.length > 0) {
        // Add to buffer
        this.buffer.push(...channelData);
        
        // When buffer is full, send it
        if (this.buffer.length >= this.bufferSize) {
          // Calculate audio level for visualization
          const sum = this.buffer.reduce((acc, val) => acc + Math.abs(val), 0);
          const avgLevel = sum / this.buffer.length;
          
          // Send audio data and level to main thread
          this.port.postMessage({
            type: 'audio',
            buffer: new Float32Array(this.buffer.slice(0, this.bufferSize)),
            level: avgLevel
          });
          
          // Keep remaining samples
          this.buffer = this.buffer.slice(this.bufferSize);
        }
      }
    }
    
    // Keep processor alive
    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
