export interface VADCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onVolumeChange?: (volume: number) => void;
  onError?: (err: Error) => void;
}

export class VADManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private isSpeaking = false;
  private silenceTimer: any = null;

  public silenceThreshold = 0.015; // RMS threshold
  public silenceDurationMs = 1500;

  public async startListening(callbacks: VADCallbacks): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1
        }
      });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.analyser) return;

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }

        const average = sum / bufferLength;
        const normalizedVolume = Math.min(average / 128, 1.0);
        callbacks.onVolumeChange?.(normalizedVolume);

        if (normalizedVolume > this.silenceThreshold) {
          if (!this.isSpeaking) {
            this.isSpeaking = true;
            callbacks.onSpeechStart?.();
          }

          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
        } else if (this.isSpeaking && !this.silenceTimer) {
          this.silenceTimer = setTimeout(() => {
            if (this.isSpeaking) {
              this.isSpeaking = false;
              callbacks.onSpeechEnd?.();
            }
          }, this.silenceDurationMs);
        }

        this.animationFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err: any) {
      callbacks.onError?.(new Error(`Microphone access failed: ${err.message}`));
    }
  }

  public stopListening(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isSpeaking = false;
  }
}
