// src/utils/soundManager.ts

type SoundName =
  | "card-draw"
  | "card-slide"
  | "card-flip"
  | "card-return"
  | "acerto"
  | "acerto-critico"
  | "erro"
  | "erro-critico"
  | "shuffle"
  | "point-add"
  | "point-remove"
  | "convert-crit";

interface SoundConfig {
  src: string;
  volume: number;       // 0.0 a 1.0
  maxInstances: number; // quantas cópias podem tocar ao mesmo tempo
}

const SOUND_MAP: Record<SoundName, SoundConfig> = {
  "card-draw":       { src: "/sounds/card-draw.mp3",       volume: 0.5, maxInstances: 3 },
  "card-slide":      { src: "/sounds/card-slide.mp3",      volume: 0.35, maxInstances: 3 },
  "card-flip":       { src: "/sounds/card-flip.mp3",       volume: 0.6, maxInstances: 3 },
  "card-return":     { src: "/sounds/card-return.mp3",     volume: 0.4, maxInstances: 2 },
  "acerto":          { src: "/sounds/acerto.mp3",          volume: 0.55, maxInstances: 2 },
  "acerto-critico":  { src: "/sounds/acerto-critico.mp3",  volume: 0.7, maxInstances: 1 },
  "erro":            { src: "/sounds/erro.mp3",            volume: 0.5, maxInstances: 2 },
  "erro-critico":    { src: "/sounds/erro-critico.mp3",    volume: 0.65, maxInstances: 1 },
  "shuffle":         { src: "/sounds/shuffle.mp3",         volume: 0.5, maxInstances: 1 },
  "point-add":       { src: "/sounds/point-add.mp3",       volume: 0.3, maxInstances: 4 },
  "point-remove":    { src: "/sounds/point-remove.mp3",    volume: 0.3, maxInstances: 4 },
  "convert-crit":    { src: "/sounds/convert-crit.mp3",    volume: 0.55, maxInstances: 2 },
};

/** Pool de instâncias de Audio para cada som */
const audioPools: Map<SoundName, HTMLAudioElement[]> = new Map();

/** Volume master (0.0 a 1.0) */
let masterVolume = 1.0;

/** Mute global */
let muted = false;

/**
 * Pré-carrega todos os sons no pool.
 * Chamar uma vez na inicialização do app (ex: useEffect no App.tsx).
 */
export function preloadSounds(): void {
  for (const [name, config] of Object.entries(SOUND_MAP)) {
    const pool: HTMLAudioElement[] = [];
    for (let i = 0; i < config.maxInstances; i++) {
      const audio = new Audio(config.src);
      audio.preload = "auto";
      audio.volume = config.volume * masterVolume;
      pool.push(audio);
    }
    audioPools.set(name as SoundName, pool);
  }
}

/**
 * Toca um som pelo nome.
 * Pega a próxima instância disponível no pool (round-robin).
 */
export function playSound(name: SoundName): void {
  if (muted) return;

  const pool = audioPools.get(name);
  if (!pool || pool.length === 0) {
    // Fallback: criar instância avulsa
    const config = SOUND_MAP[name];
    if (!config) return;
    const audio = new Audio(config.src);
    audio.volume = config.volume * masterVolume;
    audio.play().catch(() => {});
    return;
  }

  // Procura uma instância que terminou ou pausada
  let audio = pool.find(
    (a) => a.paused || a.ended || a.currentTime === 0
  );

  // Se todas estão tocando, reinicia a primeira
  if (!audio) {
    audio = pool[0];
  }

  const config = SOUND_MAP[name];
  audio.volume = config.volume * masterVolume;
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Browsers bloqueiam autoplay antes de interação do user
    // Silenciar o erro — o som simplesmente não toca
  });
}

/**
 * Toca o som correspondente ao tipo de carta revelada.
 */
export function playResultSound(tipo: string): void {
  switch (tipo) {
    case "acerto":
      playSound("acerto");
      break;
    case "acerto_critico":
      playSound("acerto-critico");
      break;
    case "erro":
      playSound("erro");
      break;
    case "erro_critico":
      playSound("erro-critico");
      break;
  }
}

/** Define o volume master (0.0 a 1.0) */
export function setMasterVolume(vol: number): void {
  masterVolume = Math.max(0, Math.min(1, vol));
  // Atualiza volume de todas as instâncias existentes
  for (const [name, pool] of audioPools.entries()) {
    const config = SOUND_MAP[name];
    for (const audio of pool) {
      audio.volume = config.volume * masterVolume;
    }
  }
}

/** Retorna o volume master atual */
export function getMasterVolume(): number {
  return masterVolume;
}

/** Muta/desmuta todos os sons */
export function toggleMute(): boolean {
  muted = !muted;
  return muted;
}

/** Retorna se está mutado */
export function isMuted(): boolean {
  return muted;
}

/** Define mute diretamente */
export function setMuted(value: boolean): void {
  muted = value;
}