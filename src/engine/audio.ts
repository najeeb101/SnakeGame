export class AudioEngine {
  private context: AudioContext | null = null;

  ensure(enabled: boolean): void {
    if (!enabled || this.context) return;
    this.context = new AudioContext();
  }

  play(frequency: number, duration: number, type: OscillatorType, enabled: boolean): void {
    if (!enabled) return;
    this.ensure(enabled);
    if (!this.context) return;

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gain.gain.setValueAtTime(0.0001, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, this.context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start();
    oscillator.stop(this.context.currentTime + duration);
  }
}
