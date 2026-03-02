export type CardType = "acerto" | "acerto_critico" | "erro" | "erro_critico";

export interface Card {
  tipo: CardType;
}

export interface DeckState {
  [attr: string]: Card[];
}

export interface AccuracyState {
  [attr: string]: number;
}

export interface ResultState {
  [attr: string]: Card | null;
}

export interface FlipState {
  [attr: string]: boolean;
}

export type SkillBonus = "none" | "plus15" | "plus25";

export interface SkillMark {
  bonus: SkillBonus;
  proficient: boolean;
  engStacks: number;
}

export type SkillsState = Record<string, SkillMark>;

export interface AttrTheme {
  icon: string;
  emoji: string;
  pattern: string;
  subtitle: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  bgLight: string;
  bonusBg: string;
}

export const ATTR_THEMES: Record<string, AttrTheme> = {
  Força: {
    icon: "fa-fist-raised",
    emoji: "💪",
    pattern: "'⚔️'",
    subtitle: "Poder Bruto",
    gradientFrom: "#dc2626",
    gradientTo: "#7f1d1d",
    borderColor: "#b91c1c",
    bgLight: "#fef2f2",
    bonusBg: "#fee2e2",
  },
  Destreza: {
    icon: "fa-running",
    emoji: "🏃",
    pattern: "'🗡️'",
    subtitle: "Agilidade & Reflexo",
    gradientFrom: "#059669",
    gradientTo: "#064e3b",
    borderColor: "#047857",
    bgLight: "#ecfdf5",
    bonusBg: "#d1fae5",
  },
  Constituição: {
    icon: "fa-shield-alt",
    emoji: "🛡️",
    pattern: "'🛡️'",
    subtitle: "Resistência & Vigor",
    gradientFrom: "#d97706",
    gradientTo: "#78350f",
    borderColor: "#b45309",
    bgLight: "#fffbeb",
    bonusBg: "#fef3c7",
  },
  Inteligência: {
    icon: "fa-brain",
    emoji: "🧠",
    pattern: "'📖'",
    subtitle: "Mente & Razão",
    gradientFrom: "#2563eb",
    gradientTo: "#1e3a8a",
    borderColor: "#1d4ed8",
    bgLight: "#eff6ff",
    bonusBg: "#dbeafe",
  },
  Sabedoria: {
    icon: "fa-eye",
    emoji: "👁️",
    pattern: "'🔮'",
    subtitle: "Percepção & Intuição",
    gradientFrom: "#9333ea",
    gradientTo: "#581c87",
    borderColor: "#7e22ce",
    bgLight: "#faf5ff",
    bonusBg: "#f3e8ff",
  },
  Carisma: {
    icon: "fa-crown",
    emoji: "👑",
    pattern: "'✨'",
    subtitle: "Presença & Influência",
    gradientFrom: "#ca8a04",
    gradientTo: "#713f12",
    borderColor: "#a16207",
    bgLight: "#fefce8",
    bonusBg: "#fef9c3",
  },
};

export const ATRIBUTOS = [
  "Força",
  "Destreza",
  "Constituição",
  "Inteligência",
  "Sabedoria",
  "Carisma",
];
export const ACERTOS_CRITICOS_FIXOS = 1;
export const ERROS_COMUNS_FIXOS = 11;
export const ERROS_CRITICOS_FIXOS = 1;
export const ACERTOS_INICIAIS_COMUNS = 8;
export const STORAGE_KEY = "clock_tantan_state_v1";
export const BASE_PERICIA = 15;
export const PERICIA_LIMITES = {
  plus25: 3,
  plus15: 3,
  proficient: 2,
} as const;
export const PERICIAS_POR_CATEGORIA: Record<string, string[]> = {
  Físicas: ["Acrobacia", "Atletismo", "Furtividade", "Prestidigitação"],
  Sociais: ["Atuação", "Enganação", "Intimidação", "Intuição", "Persuasão"],
  Conhecimento: ["Arcanismo", "História", "Natureza", "Religião"],
  Práticas: [
    "Investigação",
    "Medicina",
    "Percepção",
    "Sobrevivência",
    "Adestrar Animais",
  ],
};
export const TODAS_PERICIAS = Object.values(PERICIAS_POR_CATEGORIA).flat();

export function getSkillBonusValue(bonus: SkillBonus): number {
  if (bonus === "plus25") return 25;
  if (bonus === "plus15") return 15;
  return 0;
}

export function getMaxEngStacksForBonus(bonus: SkillBonus): number {
  const maxByPercent = Math.floor((80 - BASE_PERICIA - getSkillBonusValue(bonus)) / 4);
  return Math.max(0, maxByPercent);
}

export function embaralhar(arr: Card[]): Card[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function criarDeck(acertosComuns: number): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < acertosComuns; i++) deck.push({ tipo: "acerto" });
  for (let i = 0; i < ACERTOS_CRITICOS_FIXOS; i++) {
    deck.push({ tipo: "acerto_critico" });
  }
  for (let i = 0; i < ERROS_COMUNS_FIXOS; i++) deck.push({ tipo: "erro" });
  for (let i = 0; i < ERROS_CRITICOS_FIXOS; i++) {
    deck.push({ tipo: "erro_critico" });
  }
  return embaralhar(deck);
}

export function criarTodosDecks(acertosComuns: AccuracyState): DeckState {
  const decks: DeckState = {};
  ATRIBUTOS.forEach((attr) => {
    decks[attr] = criarDeck(acertosComuns[attr]);
  });
  return decks;
}

export function initAcertos(): AccuracyState {
  const acc: AccuracyState = {};
  ATRIBUTOS.forEach((attr) => {
    acc[attr] = ACERTOS_INICIAIS_COMUNS;
  });
  return acc;
}

export function initResults(): ResultState {
  const res: ResultState = {};
  ATRIBUTOS.forEach((attr) => {
    res[attr] = null;
  });
  return res;
}

export function initFlipped(): FlipState {
  const f: FlipState = {};
  ATRIBUTOS.forEach((attr) => {
    f[attr] = false;
  });
  return f;
}

export function initPericias(): SkillsState {
  const pericias: SkillsState = {};
  TODAS_PERICIAS.forEach((nome) => {
    pericias[nome] = { bonus: "none", proficient: false, engStacks: 0 };
  });
  return pericias;
}

export interface PersistedState {
  personagemNome: string;
  personagemIdade: string;
  personagemImagem: string;
  anotacoes: string;
  anotacoesHorizonte: string;
  nivel: number;
  pontosDistribuir: number;
  acertosComuns: AccuracyState;
  decks: DeckState;
  resultados: ResultState;
  flipped: FlipState;
  pericias: SkillsState;
}

export type CloudState = Omit<PersistedState, "decks" | "resultados" | "flipped">;

function isCard(value: unknown): value is Card {
  if (!value || typeof value !== "object") return false;
  const tipo = (value as Card).tipo;
  return (
    tipo === "acerto" ||
    tipo === "acerto_critico" ||
    tipo === "erro" ||
    tipo === "erro_critico"
  );
}

export function normalizePersistedState(parsed: Partial<PersistedState>): PersistedState {
  const acertos = initAcertos();
  ATRIBUTOS.forEach((attr) => {
    const value = parsed.acertosComuns?.[attr];
    if (typeof value === "number" && Number.isFinite(value)) {
      acertos[attr] = Math.max(ACERTOS_INICIAIS_COMUNS, Math.floor(value));
    }
  });

  const decks = criarTodosDecks(acertos);
  ATRIBUTOS.forEach((attr) => {
    const savedDeck = parsed.decks?.[attr];
    if (Array.isArray(savedDeck) && savedDeck.every(isCard)) {
      decks[attr] = savedDeck;
    }
  });

  const resultados = initResults();
  ATRIBUTOS.forEach((attr) => {
    const savedResult = parsed.resultados?.[attr];
    if (savedResult === null || isCard(savedResult)) {
      resultados[attr] = savedResult;
    }
  });

  const flipped = initFlipped();
  ATRIBUTOS.forEach((attr) => {
    const savedFlipped = parsed.flipped?.[attr];
    if (typeof savedFlipped === "boolean") {
      flipped[attr] = savedFlipped;
    }
  });

  const pericias = initPericias();
  TODAS_PERICIAS.forEach((nome) => {
    const saved = parsed.pericias?.[nome];
    if (!saved || typeof saved !== "object") return;
    const bonusRaw = (saved as Partial<SkillMark>).bonus;
    const proficientRaw = (saved as Partial<SkillMark>).proficient;
    const engStacksRaw = (saved as Partial<SkillMark>).engStacks;
    const bonus: SkillBonus =
      bonusRaw === "plus15" || bonusRaw === "plus25" ? bonusRaw : "none";
    const proficient = typeof proficientRaw === "boolean" ? proficientRaw : false;
    const engStacks =
      typeof engStacksRaw === "number" &&
      Number.isFinite(engStacksRaw) &&
      engStacksRaw >= 0
        ? Math.floor(engStacksRaw)
        : 0;
    pericias[nome] = {
      bonus,
      proficient,
      engStacks: Math.min(engStacks, getMaxEngStacksForBonus(bonus)),
    };
  });

  const nivel =
    typeof parsed.nivel === "number" && Number.isFinite(parsed.nivel) ? parsed.nivel : 1;
  const pontosDistribuir =
    typeof parsed.pontosDistribuir === "number" && Number.isFinite(parsed.pontosDistribuir)
      ? parsed.pontosDistribuir
      : 21;
  const personagemNome =
    typeof parsed.personagemNome === "string" ? parsed.personagemNome : "";
  const personagemIdade =
    typeof parsed.personagemIdade === "string" ? parsed.personagemIdade : "";
  const personagemImagem =
    typeof parsed.personagemImagem === "string" ? parsed.personagemImagem : "";
  const anotacoes = typeof parsed.anotacoes === "string" ? parsed.anotacoes : "";
  const anotacoesHorizonte =
    typeof parsed.anotacoesHorizonte === "string" ? parsed.anotacoesHorizonte : "";

  return {
    personagemNome,
    personagemIdade,
    personagemImagem,
    anotacoes,
    anotacoesHorizonte,
    nivel,
    pontosDistribuir,
    acertosComuns: acertos,
    decks,
    resultados,
    flipped,
    pericias,
  };
}

export function toFirestoreSafeState(state: PersistedState): PersistedState {
  return JSON.parse(JSON.stringify(state)) as PersistedState;
}

export function toCloudState(state: PersistedState): CloudState {
  return {
    personagemNome: state.personagemNome,
    personagemIdade: state.personagemIdade,
    personagemImagem: state.personagemImagem,
    anotacoes: state.anotacoes,
    anotacoesHorizonte: state.anotacoesHorizonte,
    nivel: state.nivel,
    pontosDistribuir: state.pontosDistribuir,
    acertosComuns: state.acertosComuns,
    pericias: state.pericias,
  };
}

export function loadPersistedState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (!parsed || typeof parsed !== "object") return null;
    return normalizePersistedState(parsed);
  } catch {
    return null;
  }
}
