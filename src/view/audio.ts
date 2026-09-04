/** Synthesized propeller harmonics with distance attenuation; no external media. */
export class FlightAudio {
  private context?: AudioContext;
  private gain?: GainNode;
  private oscillators: OscillatorNode[] = [];
  enabled = true;
  async start() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.gain = this.context.createGain();
        this.gain.gain.value = 0;
        this.gain.connect(this.context.destination);
        for (const factor of [1, 2.03, 3.01]) {
          const osc = this.context.createOscillator(),
            volume = this.context.createGain();
          osc.type = "sine";
          osc.frequency.value = 90 * factor;
          volume.gain.value = 0.08 / factor;
          osc.connect(volume);
          volume.connect(this.gain);
          osc.start();
          this.oscillators.push(osc);
        }
      }
      await this.context.resume();
    } catch {
      /* Silent flight remains available when audio is blocked. */
    }
  }
  update(throttle: number, distance: number, running: boolean) {
    if (!this.context || !this.gain) return;
    const time = this.context.currentTime;
    this.gain.gain.setTargetAtTime(
      this.enabled && running
        ? Math.min(0.7, throttle * 2) / (1 + distance * 0.09)
        : 0,
      time,
      0.12,
    );
    this.oscillators.forEach((o, i) =>
      o.frequency.setTargetAtTime(
        (70 + throttle * 210) * [1, 2.03, 3.01][i],
        time,
        0.1,
      ),
    );
  }
}
