// ✅ Som curto de aviso (dois bipes), sem arquivo de áudio. Se o navegador bloquear, fica em silêncio.
let ctx: AudioContext | null = null;

export function tocarAviso(): void {
  try {
    const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctx) return;
    ctx ??= new Ctx();
    const agora = ctx.currentTime;
    [0, 0.25].forEach((atraso, i) => {
      const osc = ctx!.createOscillator();
      const vol = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 0 ? 880 : 1175;
      vol.gain.setValueAtTime(0.0001, agora + atraso);
      vol.gain.exponentialRampToValueAtTime(0.3, agora + atraso + 0.02);
      vol.gain.exponentialRampToValueAtTime(0.0001, agora + atraso + 0.2);
      osc.connect(vol).connect(ctx!.destination);
      osc.start(agora + atraso);
      osc.stop(agora + atraso + 0.22);
    });
  } catch {
    // sem som neste aparelho
  }
}
