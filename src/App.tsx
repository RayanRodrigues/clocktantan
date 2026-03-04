import { useState, useCallback, useEffect, useRef } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { AdminCharacterSelector } from "./components/AdminCharacterSelector";
import { AuthBar } from "./components/AuthBar";
import { DeckCard } from "./components/DeckCard";
import { CharacterSidebar } from "./components/CharacterSidebar";
import {
  DiceRollerOverlay,
  type DiceRollerOverlayHandle,
} from "./components/DiceRollerOverlay";
import { NotesEditor } from "./components/NotesEditor";
import { ReferencePanels } from "./components/ReferencePanels";
import { SessionChat, type SessionChatMessage } from "./components/SessionChat";
import { SkillsPanel } from "./components/SkillsPanel";
import { db } from "./firebase";
import { useFirebaseCharacterSync } from "./hooks/useFirebaseCharacterSync";
import {
  ACERTOS_CRITICOS_FIXOS,
  ACERTOS_INICIAIS_COMUNS,
  ATRIBUTOS,
  PERICIA_LIMITES,
  STORAGE_KEY,
  TODAS_PERICIAS,
  criarDeck,
  criarTodosDecks,
  getMaxEngStacksForBonus,
  getPericiaPercentual,
  getSkillBonusTotal,
  initAcertos,
  initCriticosExtras,
  initCriticosFontes,
  initFlipped,
  initPericias,
  initResults,
  loadPersistedState,
  type AccuracyState,
  type CriticosExtrasState,
  type CriticosFontesState,
  type PersistedState,
  type DeckState,
  type Card,
  type ResultState,
  type FlipState,
  type SkillsState,
  type LevelUpPlan,
} from "./utils/gameState";

const THEME_STORAGE_KEY = "clock_tantan_theme_mode";
const CHAT_ROOM_ID = "mesa-principal";
type ThemeMode = "light" | "dark";
type SkillRollMode = "normal" | "half" | "quarter";

// ---------- Main App ----------
export function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // ignore localStorage failures
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [initialState] = useState<PersistedState | null>(loadPersistedState);
  const vidaMaximaInicial =
    ((initialState?.acertosComuns?.["Constituição"] ?? ACERTOS_INICIAIS_COMUNS) +
      ACERTOS_CRITICOS_FIXOS) *
    4;
  const [personagemNome, setPersonagemNome] = useState(
    initialState?.personagemNome ?? ""
  );
  const [personagemIdade, setPersonagemIdade] = useState(
    initialState?.personagemIdade ?? ""
  );
  const [personagemImagem, setPersonagemImagem] = useState(
    initialState?.personagemImagem ?? ""
  );
  const [vidaAtual, setVidaAtual] = useState(
    initialState?.vidaAtual ?? vidaMaximaInicial
  );
  const [caModificador, setCaModificador] = useState(
    initialState?.caModificador ?? 0
  );
  const [vidaAjusteRapido, setVidaAjusteRapido] = useState("");
  const [personagemImagemLink, setPersonagemImagemLink] = useState("");
  const [anotacoes, setAnotacoes] = useState(initialState?.anotacoes ?? "");
  const [anotacoesHorizonte, setAnotacoesHorizonte] = useState(
    initialState?.anotacoesHorizonte ?? ""
  );
  const [nivel, setNivel] = useState(initialState?.nivel ?? 1);
  const [pontosDistribuir, setPontosDistribuir] = useState(
    initialState?.pontosDistribuir ?? 21
  );
  const [acertosComuns, setAcertosComuns] = useState<AccuracyState>(
    initialState?.acertosComuns ?? initAcertos()
  );
  const [criticosExtras, setCriticosExtras] = useState<CriticosExtrasState>(
    initialState?.criticosExtras ?? initCriticosExtras()
  );
  const [criticosFontes, setCriticosFontes] = useState<CriticosFontesState>(
    initialState?.criticosFontes ?? initCriticosFontes()
  );
  const [decks, setDecks] = useState<DeckState>(
    initialState?.decks ??
      criarTodosDecks(
        initialState?.acertosComuns ?? initAcertos(),
        initialState?.criticosExtras ?? initCriticosExtras()
      )
  );
  const [resultados, setResultados] = useState<ResultState>(
    initialState?.resultados ?? initResults()
  );
  const [flipped, setFlipped] = useState<FlipState>(
    initialState?.flipped ?? initFlipped()
  );
  const [pericias, setPericias] = useState<SkillsState>(
    initialState?.pericias ?? initPericias()
  );
  const [planoSubida, setPlanoSubida] = useState<LevelUpPlan | null>(
    initialState?.planoSubida ?? null
  );
  const [mostrarEscolhaSubida, setMostrarEscolhaSubida] = useState(false);
  const [mostrarPainelCriticos, setMostrarPainelCriticos] = useState(false);
  const [modoEdicaoDecks, setModoEdicaoDecks] = useState(false);
  const [chatMessages, setChatMessages] = useState<SessionChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatClearing, setChatClearing] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [rollingPericiaNome, setRollingPericiaNome] = useState<string | null>(null);
  const [rollPericiaEscolha, setRollPericiaEscolha] = useState<string | null>(null);
  const diceRollerRef = useRef<DiceRollerOverlayHandle | null>(null);
  const buildPersistedState = useCallback(
    (): PersistedState => ({
      personagemNome,
      personagemIdade,
      personagemImagem,
      vidaAtual,
      caModificador,
      anotacoes,
      anotacoesHorizonte,
      nivel,
      pontosDistribuir,
      acertosComuns,
      criticosExtras,
      criticosFontes,
      decks,
      resultados,
      flipped,
      pericias,
      planoSubida,
    }),
    [
      personagemNome,
      personagemIdade,
      personagemImagem,
      vidaAtual,
      caModificador,
      anotacoes,
      anotacoesHorizonte,
      nivel,
      pontosDistribuir,
      acertosComuns,
      criticosExtras,
      criticosFontes,
      decks,
      resultados,
      flipped,
      pericias,
      planoSubida,
    ]
  );

  const applyPersistedState = useCallback((state: PersistedState) => {
    setPersonagemNome(state.personagemNome);
    setPersonagemIdade(state.personagemIdade);
    setPersonagemImagem(state.personagemImagem);
    setVidaAtual(state.vidaAtual);
    setCaModificador(state.caModificador);
    setAnotacoes(state.anotacoes);
    setAnotacoesHorizonte(state.anotacoesHorizonte);
    setNivel(state.nivel);
    setPontosDistribuir(state.pontosDistribuir);
    setAcertosComuns(state.acertosComuns);
    setCriticosExtras(state.criticosExtras);
    setCriticosFontes(state.criticosFontes);
    setDecks(state.decks);
    setResultados(state.resultados);
    setFlipped(state.flipped);
    setPericias(state.pericias);
    setPlanoSubida(state.planoSubida);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPersistedState()));
    } catch {
      // Ignore localStorage failures (private mode/quota/etc.)
    }
  }, [buildPersistedState]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // Ignore localStorage failures (private mode/quota/etc.)
    }
  }, [themeMode]);

  const {
    authUser,
    isAdmin,
    authLoading,
    cloudLoading,
    charactersList,
    targetCharacterUid,
    handleLoginGoogle,
    handleLogout,
    handleSelectAdminCharacter,
    handleCreateAdminCharacter,
    handleUpdateAdminCharacterType,
    handleDeleteAdminCharacter,
  } = useFirebaseCharacterSync({
    buildPersistedState,
    applyPersistedState,
  });

  const sabedoriaTotal =
    (acertosComuns["Sabedoria"] || ACERTOS_INICIAIS_COMUNS) +
    ACERTOS_CRITICOS_FIXOS;
  const vidaMaxima =
    ((acertosComuns["Constituição"] || ACERTOS_INICIAIS_COMUNS) +
      ACERTOS_CRITICOS_FIXOS) *
    4;
  const vidaPercentual = Math.max(0, Math.min(100, (vidaAtual / vidaMaxima) * 100));
  const transformacoesCriticoSabedoria = Math.floor(sabedoriaTotal / 10);
  const transformacoesCriticoTotais =
    transformacoesCriticoSabedoria + criticosFontes.itens + criticosFontes.passivas;
  const transformacoesCriticoUsadas = ATRIBUTOS.reduce(
    (sum, attr) => sum + (criticosExtras[attr] || 0),
    0
  );
  const transformacoesCriticoDisponiveis = Math.max(
    0,
    transformacoesCriticoTotais - transformacoesCriticoUsadas
  );
  const engenhosidadeTotal = Math.max(
    0,
    sabedoriaTotal - (ACERTOS_INICIAIS_COMUNS + ACERTOS_CRITICOS_FIXOS)
  );

  useEffect(() => {
    setVidaAtual((prev) => Math.max(0, Math.min(prev, vidaMaxima)));
  }, [vidaMaxima]);

  const normalizeCriticosExtras = useCallback(
    (
      acertos: AccuracyState,
      rawExtras: CriticosExtrasState,
      fontes: CriticosFontesState
    ): CriticosExtrasState => {
      const normalized = initCriticosExtras();
      ATRIBUTOS.forEach((attr) => {
        const raw = rawExtras[attr] ?? 0;
        normalized[attr] = Math.min(
          acertos[attr],
          Math.max(0, Number.isFinite(raw) ? Math.floor(raw) : 0)
        );
      });

      const transformacoesTotais = Math.floor(
        ((acertos["Sabedoria"] || ACERTOS_INICIAIS_COMUNS) + ACERTOS_CRITICOS_FIXOS) / 10
      ) + Math.max(0, fontes.itens) + Math.max(0, fontes.passivas);
      let usadas = ATRIBUTOS.reduce((sum, attr) => sum + normalized[attr], 0);
      if (usadas > transformacoesTotais) {
        let excesso = usadas - transformacoesTotais;
        for (const attr of ATRIBUTOS.slice().reverse()) {
          if (excesso <= 0) break;
          const remove = Math.min(excesso, normalized[attr]);
          normalized[attr] -= remove;
          excesso -= remove;
        }
      }
      return normalized;
    },
    []
  );

  const handlePuxar = useCallback(
    (attr: string, quantidade = 1): Card[] | null => {
      const deck = decks[attr];
      const qtd = Math.max(1, Math.min(3, Math.floor(quantidade)));
      if (deck.length < qtd) {
        alert(`Deck de ${attr} não possui ${qtd} carta(s). Reembaralhe.`);
        return null;
      }
      const novoDeck = [...deck];
      const cartas: Card[] = [];
      for (let i = 0; i < qtd; i++) {
        const carta = novoDeck.pop();
        if (carta) cartas.push(carta);
      }
      setDecks((prev) => ({ ...prev, [attr]: novoDeck }));
      return cartas;
    },
    [decks]
  );

  const handleConcluirPuxada = useCallback((attr: string, cartas: Card[]) => {
    setResultados((prev) => ({ ...prev, [attr]: cartas }));
    setFlipped((prev) => ({ ...prev, [attr]: true }));
  }, []);

  const handleFlipBack = useCallback((attr: string) => {
    setFlipped((prev) => ({ ...prev, [attr]: false }));
  }, []);

  const handleReembaralhar = useCallback(
    (attr: string) => {
      setDecks((prev) => ({
        ...prev,
        [attr]: criarDeck(acertosComuns[attr], criticosExtras[attr]),
      }));
      setFlipped((prev) => ({ ...prev, [attr]: false }));
      setResultados((prev) => ({ ...prev, [attr]: [] }));
    },
    [acertosComuns, criticosExtras]
  );

  const handleReembaralharTodos = useCallback(() => {
    setDecks(criarTodosDecks(acertosComuns, criticosExtras));
    setFlipped(initFlipped());
    setResultados(initResults());
  }, [acertosComuns, criticosExtras]);

  const handleIncrement = useCallback(
    (attr: string) => {
      if (pontosDistribuir <= 0) {
        alert("Você não tem mais pontos de acerto para distribuir!");
        return;
      }
      const planoAtivo = planoSubida && planoSubida.remaining > 0 ? planoSubida : null;
      let proximoPlano: LevelUpPlan | null = planoAtivo;
      if (planoAtivo) {
        if (
          planoAtivo.mode === "three_different" &&
          planoAtivo.chosenAttrs.includes(attr)
        ) {
          alert("Nesta subida, distribua 1 ponto em atributos diferentes.");
          return;
        }
        if (
          planoAtivo.mode === "two_same" &&
          planoAtivo.lockedAttr &&
          planoAtivo.lockedAttr !== attr
        ) {
          alert("Nesta subida, os 2 pontos devem ir no mesmo atributo.");
          return;
        }
        const chosenAttrs = planoAtivo.chosenAttrs.includes(attr)
          ? planoAtivo.chosenAttrs
          : [...planoAtivo.chosenAttrs, attr];
        const lockedAttr =
          planoAtivo.mode === "two_same" ? planoAtivo.lockedAttr ?? attr : null;
        const remaining = planoAtivo.remaining - 1;
        proximoPlano =
          remaining > 0
            ? {
                ...planoAtivo,
                chosenAttrs,
                lockedAttr,
                remaining,
              }
            : null;
      }

      const novoAcertos = {
        ...acertosComuns,
        [attr]: acertosComuns[attr] + 1,
      };
      const novosCriticosExtras = normalizeCriticosExtras(
        novoAcertos,
        criticosExtras,
        criticosFontes
      );
      setAcertosComuns(novoAcertos);
      setCriticosExtras(novosCriticosExtras);
      setPontosDistribuir((prev) => prev - 1);
      setDecks((prev) => {
        const next = { ...prev };
        ATRIBUTOS.forEach((nomeAttr) => {
          const extrasMudou = novosCriticosExtras[nomeAttr] !== criticosExtras[nomeAttr];
          if (nomeAttr === attr || extrasMudou) {
            next[nomeAttr] = criarDeck(novoAcertos[nomeAttr], novosCriticosExtras[nomeAttr]);
          }
        });
        return next;
      });
      setFlipped((prev) => {
        const next = { ...prev };
        ATRIBUTOS.forEach((nomeAttr) => {
          const extrasMudou = novosCriticosExtras[nomeAttr] !== criticosExtras[nomeAttr];
          if (nomeAttr === attr || extrasMudou) {
            next[nomeAttr] = false;
          }
        });
        return next;
      });
      setPlanoSubida(proximoPlano);
    },
    [
      acertosComuns,
      criticosExtras,
      criticosFontes,
      normalizeCriticosExtras,
      planoSubida,
      pontosDistribuir,
    ]
  );

  const handleDecrement = useCallback(
    (attr: string) => {
      if (acertosComuns[attr] <= 0) {
        alert("Esse atributo já está no mínimo de acertos comuns.");
        return;
      }
      const novoAcertos = {
        ...acertosComuns,
        [attr]: acertosComuns[attr] - 1,
      };
      const novosCriticosExtras = normalizeCriticosExtras(
        novoAcertos,
        criticosExtras,
        criticosFontes
      );
      setAcertosComuns(novoAcertos);
      setCriticosExtras(novosCriticosExtras);
      setPontosDistribuir((prev) => prev + 1);
      setDecks((prev) => {
        const next = { ...prev };
        ATRIBUTOS.forEach((nomeAttr) => {
          const extrasMudou = novosCriticosExtras[nomeAttr] !== criticosExtras[nomeAttr];
          if (nomeAttr === attr || extrasMudou) {
            next[nomeAttr] = criarDeck(novoAcertos[nomeAttr], novosCriticosExtras[nomeAttr]);
          }
        });
        return next;
      });
      setFlipped((prev) => {
        const next = { ...prev };
        ATRIBUTOS.forEach((nomeAttr) => {
          const extrasMudou = novosCriticosExtras[nomeAttr] !== criticosExtras[nomeAttr];
          if (nomeAttr === attr || extrasMudou) {
            next[nomeAttr] = false;
          }
        });
        return next;
      });
    },
    [acertosComuns, criticosExtras, criticosFontes, normalizeCriticosExtras]
  );

  const handleAjustarCriticosFonte = useCallback(
    (campo: keyof CriticosFontesState, delta: number) => {
      const proximoValor = Math.max(0, (criticosFontes[campo] || 0) + delta);
      if (proximoValor === criticosFontes[campo]) return;
      const novasFontes: CriticosFontesState = {
        ...criticosFontes,
        [campo]: proximoValor,
      };
      const novosCriticosExtras = normalizeCriticosExtras(
        acertosComuns,
        criticosExtras,
        novasFontes
      );

      setCriticosFontes(novasFontes);
      setCriticosExtras(novosCriticosExtras);
      setDecks((prev) => {
        const next = { ...prev };
        ATRIBUTOS.forEach((attr) => {
          if (novosCriticosExtras[attr] !== criticosExtras[attr]) {
            next[attr] = criarDeck(acertosComuns[attr], novosCriticosExtras[attr]);
          }
        });
        return next;
      });
      setFlipped((prev) => {
        const next = { ...prev };
        ATRIBUTOS.forEach((attr) => {
          if (novosCriticosExtras[attr] !== criticosExtras[attr]) {
            next[attr] = false;
          }
        });
        return next;
      });
      setResultados((prev) => {
        const next = { ...prev };
        ATRIBUTOS.forEach((attr) => {
          if (novosCriticosExtras[attr] !== criticosExtras[attr]) {
            next[attr] = [];
          }
        });
        return next;
      });
    },
    [acertosComuns, criticosExtras, criticosFontes, normalizeCriticosExtras]
  );

  const aplicarSubidaNivel = useCallback((mode: LevelUpPlan["mode"]) => {
    setNivel((prev) => prev + 1);
    if (mode === "three_different") {
      setPontosDistribuir((prev) => prev + 3);
      setPlanoSubida({
        mode: "three_different",
        remaining: 3,
        chosenAttrs: [],
        lockedAttr: null,
      });
    } else {
      setPontosDistribuir((prev) => prev + 2);
      setPlanoSubida({
        mode: "two_same",
        remaining: 2,
        chosenAttrs: [],
        lockedAttr: null,
      });
    }
    setMostrarEscolhaSubida(false);
  }, []);

  const handleSubirNivel = useCallback(() => {
    if (planoSubida && planoSubida.remaining > 0) {
      alert("Finalize a distribuição da subida atual antes de subir novamente.");
      return;
    }
    setMostrarEscolhaSubida((prev) => !prev);
  }, [planoSubida]);

  const handleConverterAcertoEmCritico = useCallback(
    (attr: string) => {
      if (transformacoesCriticoDisponiveis <= 0) {
        alert("Você não possui transformações críticas disponíveis.");
        return;
      }
      if ((criticosExtras[attr] || 0) >= acertosComuns[attr]) {
        alert("Não há acertos comuns suficientes nesse atributo para converter.");
        return;
      }

      const novosCriticosExtras = {
        ...criticosExtras,
        [attr]: (criticosExtras[attr] || 0) + 1,
      };
      setCriticosExtras(novosCriticosExtras);
      setDecks((prev) => ({
        ...prev,
        [attr]: criarDeck(acertosComuns[attr], novosCriticosExtras[attr]),
      }));
      setFlipped((prev) => ({ ...prev, [attr]: false }));
      setResultados((prev) => ({ ...prev, [attr]: [] }));
    },
    [acertosComuns, criticosExtras, transformacoesCriticoDisponiveis]
  );

  const handleUsarImagemPorLink = useCallback(() => {
    const raw = personagemImagemLink.trim();
    if (!raw) return;
    const isDataImage = raw.startsWith("data:image/");
    const isHttp = /^https?:\/\//i.test(raw);
    if (!isDataImage && !isHttp) {
      alert("Use um link de imagem válido (http/https) ou data:image.");
      return;
    }
    setPersonagemImagem(raw);
  }, [personagemImagemLink]);

  const handleAplicarAjusteVida = useCallback(() => {
    const raw = vidaAjusteRapido.trim();
    if (!raw) return;
    if (!/^[+-]\d+$/.test(raw)) {
      alert("Use um valor com sinal, ex.: -3 ou +2.");
      return;
    }
    const delta = Number.parseInt(raw, 10);
    if (!Number.isFinite(delta) || delta === 0) {
      setVidaAjusteRapido("");
      return;
    }
    setVidaAtual((prev) => Math.max(0, Math.min(vidaMaxima, prev + delta)));
    setVidaAjusteRapido("");
  }, [vidaAjusteRapido, vidaMaxima]);

  const handleToggleBonusPericia = useCallback(
    (nomePericia: string, bonus: "plus15" | "plus25") => {
      setPericias((prev) => {
        const atual = prev[nomePericia] ?? {
          plus15: false,
          plus25: false,
          proficient: false,
          engStacks: 0,
        };
        const total25 = TODAS_PERICIAS.filter((n) => prev[n].plus25).length;
        const total15 = TODAS_PERICIAS.filter((n) => prev[n].plus15).length;
        const ativandoPlus25 = bonus === "plus25" && !atual.plus25;
        const ativandoPlus15 = bonus === "plus15" && !atual.plus15;

        if (ativandoPlus25 && total25 >= PERICIA_LIMITES.plus25) {
            alert("Limite de 3 perícias com +25% atingido.");
            return prev;
        }
        if (ativandoPlus15 && total15 >= PERICIA_LIMITES.plus15) {
            alert("Limite de 3 perícias com +15% atingido.");
            return prev;
        }

        const novoPlus25 = bonus === "plus25" ? !atual.plus25 : atual.plus25;
        const novoPlus15 = bonus === "plus15" ? !atual.plus15 : atual.plus15;
        const maxStacks = getMaxEngStacksForBonus(
          getSkillBonusTotal({ plus25: novoPlus25, plus15: novoPlus15 })
        );
        return {
          ...prev,
          [nomePericia]: {
            ...atual,
            plus25: novoPlus25,
            plus15: novoPlus15,
            engStacks: Math.min(atual.engStacks, maxStacks),
          },
        };
      });
    },
    []
  );

  const handleToggleProficienciaPericia = useCallback((nomePericia: string) => {
    setPericias((prev) => {
      const atual = prev[nomePericia] ?? {
        plus15: false,
        plus25: false,
        proficient: false,
        engStacks: 0,
      };
      const totalProf = TODAS_PERICIAS.filter((n) => prev[n].proficient).length;
      if (!atual.proficient && totalProf >= PERICIA_LIMITES.proficient) {
        alert("Limite de 2 perícias proficientes atingido.");
        return prev;
      }
      return {
        ...prev,
        [nomePericia]: {
          ...atual,
          proficient: !atual.proficient,
        },
      };
    });
  }, []);

  const handleIncrementEngPericia = useCallback(
    (nomePericia: string) => {
      setPericias((prev) => {
        const atual = prev[nomePericia] ?? {
          plus15: false,
          plus25: false,
          proficient: false,
          engStacks: 0,
        };
        const totalEngAtual = TODAS_PERICIAS.reduce(
          (acc, nome) => acc + (prev[nome].engStacks || 0),
          0
        );
        if (totalEngAtual >= engenhosidadeTotal) {
          alert("Sem pontos de engenhosidade disponíveis.");
          return prev;
        }
        const maxStacks = getMaxEngStacksForBonus(
          getSkillBonusTotal({ plus25: atual.plus25, plus15: atual.plus15 })
        );
        if (atual.engStacks >= maxStacks) {
          alert("Essa perícia já está no limite de 80%.");
          return prev;
        }
        return {
          ...prev,
          [nomePericia]: {
            ...atual,
            engStacks: atual.engStacks + 1,
          },
        };
      });
    },
    [engenhosidadeTotal]
  );

  const handleDecrementEngPericia = useCallback((nomePericia: string) => {
    setPericias((prev) => {
      const atual = prev[nomePericia] ?? {
        plus15: false,
        plus25: false,
        proficient: false,
        engStacks: 0,
      };
      if (atual.engStacks <= 0) return prev;
      return {
        ...prev,
        [nomePericia]: {
          ...atual,
          engStacks: atual.engStacks - 1,
        },
      };
    });
  }, []);

  useEffect(() => {
    if (!authUser) {
      setChatMessages([]);
      setChatLoading(false);
      return;
    }
    setChatLoading(true);
    const q = query(
      collection(db, "rooms", CHAT_ROOM_ID, "messages"),
      orderBy("createdAt", "asc"),
      limit(200)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: SessionChatMessage[] = snap.docs.map((docSnap) => {
          const data = docSnap.data() as {
            type?: "chat" | "roll";
            text?: string;
            senderName?: string;
            createdAt?: { toDate?: () => Date };
          };
          const date =
            data.createdAt && typeof data.createdAt.toDate === "function"
              ? data.createdAt.toDate()
              : null;
          return {
            id: docSnap.id,
            type: data.type === "roll" ? "roll" : "chat",
            senderName: data.senderName?.trim() || "Jogador",
            text: data.text?.trim() || "",
            createdAtLabel: date
              ? date.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--",
          };
        });
        setChatMessages(items);
        setChatLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar chat:", err);
        setChatLoading(false);
      }
    );
    return () => unsub();
  }, [authUser]);

  const getSenderName = useCallback(() => {
    const nomeFicha = personagemNome.trim();
    if (nomeFicha) return nomeFicha;
    if (authUser?.displayName?.trim()) return authUser.displayName.trim();
    if (authUser?.email?.trim()) return authUser.email.split("@")[0];
    return "Jogador";
  }, [authUser, personagemNome]);

  const handleSendChatMessage = useCallback(async () => {
    if (!authUser) {
      alert("Entre com Google para enviar mensagens.");
      return;
    }
    const text = chatDraft.trim();
    if (!text) return;
    try {
      await addDoc(collection(db, "rooms", CHAT_ROOM_ID, "messages"), {
        type: "chat",
        text,
        senderName: getSenderName(),
        uid: authUser.uid,
        characterUid: targetCharacterUid ?? authUser.uid,
        createdAt: serverTimestamp(),
      });
      setChatDraft("");
    } catch (err) {
      console.error("Erro ao enviar mensagem no chat:", err);
      alert("Nao foi possivel enviar mensagem no chat.");
    }
  }, [authUser, chatDraft, getSenderName, targetCharacterUid]);

  const publishRollInChat = useCallback(
    async (attr: string, cartas: Card[]) => {
      if (!authUser || cartas.length === 0) return;
      const resultLabel = cartas
        .map((card) => {
          switch (card.tipo) {
            case "acerto":
              return "OK";
            case "acerto_critico":
              return "OK CRIT";
            case "erro":
              return "ERRO";
            case "erro_critico":
              return "ERRO CRIT";
          }
        })
        .join(", ");
      const text =
        cartas.length === 1
          ? `Teste em ${attr}: ${resultLabel}`
          : `Teste em ${attr} (${cartas.length} cartas): ${resultLabel}`;
      try {
        await addDoc(collection(db, "rooms", CHAT_ROOM_ID, "messages"), {
          type: "roll",
          text,
          senderName: getSenderName(),
          uid: authUser.uid,
          characterUid: targetCharacterUid ?? authUser.uid,
          attr,
          cards: cartas.map((card) => card.tipo),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Erro ao publicar rolagem no chat:", err);
      }
    },
    [authUser, getSenderName, targetCharacterUid]
  );
  const publishSkillRollInChat = useCallback(
    async (
      nomePericia: string,
      modo: SkillRollMode,
      alvoBase: number,
      alvo: number,
      rolagens: number[],
      valorFinal: number,
      comVantagem: boolean,
      sucesso: boolean
    ) => {
      if (!authUser || rolagens.length === 0) return;
      const modoLabel =
        modo === "half" ? "1/2" : modo === "quarter" ? "1/4" : "normal";
      const textoBase = comVantagem
        ? `${nomePericia} [${modoLabel}] (vantagem): ${rolagens.join(" e ")} -> ${valorFinal}/${alvo}% ${sucesso ? "SUCESSO" : "FALHA"}`
        : `${nomePericia} [${modoLabel}]: ${valorFinal}/${alvo}% ${sucesso ? "SUCESSO" : "FALHA"}`;

      try {
        await addDoc(collection(db, "rooms", CHAT_ROOM_ID, "messages"), {
          type: "roll",
          text: `Teste de pericia em ${textoBase}`,
          senderName: getSenderName(),
          uid: authUser.uid,
          characterUid: targetCharacterUid ?? authUser.uid,
          skill: nomePericia,
          skillMode: modo,
          skillBaseTarget: alvoBase,
          skillTarget: alvo,
          skillRolls: rolagens,
          skillFinal: valorFinal,
          isAdvantage: comVantagem,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("Erro ao publicar rolagem de pericia no chat:", err);
      }
    },
    [authUser, getSenderName, targetCharacterUid]
  );

  const handleRolarPericia = useCallback(
    async (nomePericia: string, modo: SkillRollMode) => {
      if (!diceRollerRef.current) {
        alert("Rolador d100 ainda nao esta pronto.");
        return;
      }

      const mark = pericias[nomePericia];
      if (!mark) return;
      const alvoBase = getPericiaPercentual(mark);
      const divisor = modo === "half" ? 2 : modo === "quarter" ? 4 : 1;
      const alvo = Math.max(1, Math.floor(alvoBase / divisor));
      const comVantagem = !!mark.proficient;

      setRollingPericiaNome(nomePericia);
      try {
        const primeira = await diceRollerRef.current.rollD100({
          label: `${nomePericia}${comVantagem ? " (1/2)" : ""}`,
          notation: "1d100",
        });

        const rolagens = [primeira.value];
        let valorFinal = primeira.value;

        if (comVantagem) {
          const segunda = await diceRollerRef.current.rollD100({
            label: `${nomePericia} (2/2)` ,
            notation: "1d100",
          });
          rolagens.push(segunda.value);
          valorFinal = Math.min(primeira.value, segunda.value);
        }

        const sucesso = valorFinal <= alvo;
        await publishSkillRollInChat(
          nomePericia,
          modo,
          alvoBase,
          alvo,
          rolagens,
          valorFinal,
          comVantagem,
          sucesso
        );
      } catch (err) {
        console.error("Erro ao rolar d100 de pericia:", err);
        alert("Nao foi possivel concluir a rolagem d100.");
      } finally {
        setRollingPericiaNome(null);
      }
    },
    [pericias, publishSkillRollInChat]
  );

  const handleEscolherModoRolagemPericia = useCallback(
    (modo: SkillRollMode) => {
      if (!rollPericiaEscolha) return;
      const nomePericia = rollPericiaEscolha;
      setRollPericiaEscolha(null);
      void handleRolarPericia(nomePericia, modo);
    },
    [handleRolarPericia, rollPericiaEscolha]
  );
  const handleClearChat = useCallback(async () => {
    if (!authUser || !isAdmin) return;
    const ok = window.confirm("Tem certeza que deseja limpar todo o chat da mesa?");
    if (!ok) return;
    setChatClearing(true);
    try {
      const snap = await getDocs(collection(db, "rooms", CHAT_ROOM_ID, "messages"));
      await Promise.all(
        snap.docs.map((docSnap) => deleteDoc(docSnap.ref))
      );
    } catch (err) {
      console.error("Erro ao limpar chat:", err);
      alert("Nao foi possivel limpar o chat.");
    } finally {
      setChatClearing(false);
    }
  }, [authUser, isAdmin]);

  const handleConcluirPuxadaComChat = useCallback(
    (attr: string, cartas: Card[]) => {
      handleConcluirPuxada(attr, cartas);
      void publishRollInChat(attr, cartas);
    },
    [handleConcluirPuxada, publishRollInChat]
  );


  return (
    <div className={`app-bg ${themeMode === "dark" ? "dark-mode" : ""}`}>
      <div className={`app-layout ${chatCollapsed ? "chat-collapsed" : ""}`}>
      <div className="tool">
        <div className="top-header">
          <div className="top-header-left">
            <button
              type="button"
              className={`theme-toggle theme-toggle-compact ${
                themeMode === "dark" ? "theme-toggle-dark" : "theme-toggle-light"
              }`}
              onClick={() =>
                setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))
              }
              title={themeMode === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
              aria-label={themeMode === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
            >
              <span className="theme-toggle-text">
                {themeMode === "dark" ? "NIGHT" : "DAY"}
              </span>
              <span className="theme-toggle-knob">
                <i className={`fas ${themeMode === "dark" ? "fa-moon" : "fa-sun"}`}></i>
              </span>
            </button>
          </div>
          <div className="top-header-center">
            <h1 className="text-center mt-0 text-slate-700 text-2xl md:text-3xl font-bold">
              ? Clock Tan-Tan · Ferramenta do Mestre
            </h1>
            <div className="text-center mb-6 text-slate-600 italic">
              Gerenciamento de decks, progressão, perícias e regras
            </div>
          </div>
          <div className="top-header-right">
            <button
              type="button"
              className="chat-dock-btn"
              onClick={() => setChatCollapsed((prev) => !prev)}
              title={chatCollapsed ? "Expandir chat" : "Minimizar chat"}
              aria-label={chatCollapsed ? "Expandir chat" : "Minimizar chat"}
            >
              <i className={`fas ${chatCollapsed ? "fa-comments" : "fa-comment-slash"}`}></i>{" "}
              {chatCollapsed ? "Abrir chat" : "Minimizar chat"}
            </button>
          </div>
        </div>
        <AuthBar
          authLoading={authLoading}
          authUser={authUser}
          cloudLoading={cloudLoading}
          isAdmin={isAdmin}
          targetCharacterUid={targetCharacterUid}
          onLoginGoogle={handleLoginGoogle}
          onLogout={handleLogout}
        />
        <AdminCharacterSelector
          authUser={authUser}
          isAdmin={isAdmin}
          targetCharacterUid={targetCharacterUid}
          charactersList={charactersList}
          onSelectCharacter={handleSelectAdminCharacter}
          onCreateCharacter={handleCreateAdminCharacter}
          onUpdateCharacterType={handleUpdateAdminCharacterType}
          onDeleteCharacter={handleDeleteAdminCharacter}
        />

        <div className="personagem-info">
          <label className="personagem-campo">
            <span>Nome do personagem</span>
            <input
              type="text"
              value={personagemNome}
              onChange={(e) => setPersonagemNome(e.target.value)}
              placeholder="Ex.: Arion"
              maxLength={60}
            />
          </label>
          <label className="personagem-campo personagem-campo-idade">
            <span>Idade</span>
            <input
              type="number"
              min={0}
              max={999}
              value={personagemIdade}
              onChange={(e) => setPersonagemIdade(e.target.value)}
              placeholder="Ex.: 27"
            />
          </label>
        </div>

        <div className="vida-painel">
          <div className="vida-topo">
            <span className="vida-titulo">❤️ Vida</span>
            <span className="vida-valor">
              {vidaAtual} / {vidaMaxima}
            </span>
            <div className="ca-controles" role="group" aria-label="Classe de Armadura">
              <span className="ca-label">CA</span>
              {([-2, -1, 0, 1, 2] as const).map((valor) => (
                <button
                  key={`ca-${valor}`}
                  type="button"
                  className={`ca-opcao ${caModificador === valor ? "is-active" : ""}`}
                  onClick={() => setCaModificador(valor)}
                  aria-pressed={caModificador === valor}
                >
                  {valor > 0 ? `+${valor}` : `${valor}`}
                </button>
              ))}
            </div>
          </div>
          <div className="vida-barra">
            <div
              className="vida-barra-preenchimento"
              style={{ width: `${vidaPercentual}%` }}
            />
          </div>
          <div className="vida-acoes">
            <button type="button" onClick={() => setVidaAtual(vidaMaxima)}>
              Vida cheia
            </button>
            <input
              type="text"
              className="vida-ajuste-input"
              value={vidaAjusteRapido}
              onChange={(e) => setVidaAjusteRapido(e.target.value)}
              placeholder="+2 ou -3"
              aria-label="Ajuste rápido de vida"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAplicarAjusteVida();
              }}
            />
            <button type="button" onClick={handleAplicarAjusteVida}>
              Aplicar
            </button>
            <input
              type="number"
              min={0}
              max={vidaMaxima}
              value={vidaAtual}
              onChange={(e) => {
                const next = Number.parseInt(e.target.value || "0", 10);
                setVidaAtual(
                  Number.isFinite(next)
                    ? Math.max(0, Math.min(vidaMaxima, next))
                    : 0
                );
              }}
              aria-label="Vida atual"
            />
          </div>
          <div className="vida-meta">Constituição: cada acerto vale 4 de vida.</div>
        </div>

        {/* Nível e pontos */}
        <div className="nivel-info">
          <span className="font-bold text-slate-700">
            🎯 Nível: <span className="text-lg">{nivel}</span>
          </span>
          <span className="font-bold text-slate-700">
            🎴 Acertos para distribuir:{" "}
            <span className="text-lg text-green-700">{pontosDistribuir}</span>
          </span>
          <button
            onClick={handleSubirNivel}
            className="py-2 px-5 border-2 border-slate-500 bg-slate-600 hover:bg-slate-700 text-white rounded-full cursor-pointer text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
          >
            ⬆ Subir Nível
          </button>
          <button
            type="button"
            onClick={() =>
              setModoEdicaoDecks((prev) => {
                const next = !prev;
                if (!next) setMostrarPainelCriticos(false);
                return next;
              })
            }
            className={`modo-edicao-toggle py-2 px-4 border-2 rounded-full cursor-pointer text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-md ${
              modoEdicaoDecks
                ? "border-amber-700 bg-amber-600 hover:bg-amber-700 text-white"
                : "border-slate-500 bg-slate-200 hover:bg-slate-300"
            }`}
          >
            {modoEdicaoDecks ? "✏️ Editando decks" : "✏️ Editar decks"}
          </button>
          {modoEdicaoDecks && (
            <button
              type="button"
              onClick={() => setMostrarPainelCriticos((prev) => !prev)}
              className="critico-toggle py-2 px-4 border-2 border-slate-500 bg-slate-200 hover:bg-slate-300 rounded-full cursor-pointer text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              ✨ Crítico
            </button>
          )}
          {planoSubida && (
            <span className="text-xs text-slate-600 font-semibold">
              {planoSubida.mode === "three_different"
                ? `Subida ativa: ${planoSubida.remaining} ponto(s) restante(s), em atributos diferentes.`
                : `Subida ativa: ${planoSubida.remaining} ponto(s) restante(s), no mesmo atributo${
                    planoSubida.lockedAttr ? ` (${planoSubida.lockedAttr})` : ""
                  }.`}
            </span>
          )}
          {mostrarEscolhaSubida && (
            <div className="subida-nivel-escolha">
              <p>Escolha o bônus desta subida:</p>
              <div className="subida-nivel-botoes">
                <button
                  type="button"
                  className="subida-nivel-opcao"
                  onClick={() => aplicarSubidaNivel("three_different")}
                >
                  +3 em atributos diferentes
                </button>
                <button
                  type="button"
                  className="subida-nivel-opcao"
                  onClick={() => aplicarSubidaNivel("two_same")}
                >
                  +2 no mesmo atributo
                </button>
                <button
                  type="button"
                  className="subida-nivel-cancelar"
                  onClick={() => setMostrarEscolhaSubida(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
          {modoEdicaoDecks && mostrarPainelCriticos && (
            <div className="criticos-fontes-panel">
              <div className="criticos-fontes-resumo">
                <strong>Fontes de critico:</strong>
                <span>Sabedoria: {transformacoesCriticoSabedoria}</span>
                <span>Itens: {criticosFontes.itens}</span>
                <span>Passivas: {criticosFontes.passivas}</span>
                <span>
                  Total: {transformacoesCriticoTotais} · Usados: {transformacoesCriticoUsadas} ·
                  Restantes: {transformacoesCriticoDisponiveis}
                </span>
              </div>
              <div className="criticos-fontes-controles">
                <div className="critico-fonte-item">
                  <label>Itens</label>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleAjustarCriticosFonte("itens", -1)}
                      disabled={criticosFontes.itens <= 0}
                    >
                      -
                    </button>
                    <span>{criticosFontes.itens}</span>
                    <button
                      type="button"
                      onClick={() => handleAjustarCriticosFonte("itens", 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="critico-fonte-item">
                  <label>Passivas</label>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleAjustarCriticosFonte("passivas", -1)}
                      disabled={criticosFontes.passivas <= 0}
                    >
                      -
                    </button>
                    <span>{criticosFontes.passivas}</span>
                    <button
                      type="button"
                      onClick={() => handleAjustarCriticosFonte("passivas", 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="principal">
          {/* Decks section */}
          <div className="decks-section">
            <div className="decks-grid">
              {ATRIBUTOS.map((attr) => (
                <DeckCard
                  key={attr}
                  attr={attr}
                  deck={decks[attr]}
                  acertosComuns={acertosComuns[attr]}
                  resultado={resultados[attr]}
                  pontosDistribuir={pontosDistribuir}
                  isFlipped={flipped[attr]}
                  criticosExtrasNoAtributo={criticosExtras[attr] || 0}
                  transformacoesCriticoDisponiveis={transformacoesCriticoDisponiveis}
                  mostrarControlesEdicao={modoEdicaoDecks}
                  onPuxar={(quantidade) => handlePuxar(attr, quantidade)}
                  onConcluirPuxada={(cartas) => handleConcluirPuxadaComChat(attr, cartas)}
                  onReembaralhar={() => handleReembaralhar(attr)}
                  onDecrement={() => handleDecrement(attr)}
                  onIncrement={() => handleIncrement(attr)}
                  onConverterAcertoEmCritico={() => handleConverterAcertoEmCritico(attr)}
                  onFlipBack={() => handleFlipBack(attr)}
                />
              ))}
            </div>
            <div className="text-center my-5">
              <button
                onClick={handleReembaralharTodos}
                className="py-3 px-8 border-2 border-slate-500 bg-slate-600 hover:bg-slate-700 text-white rounded-full cursor-pointer text-base font-bold transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                🔄 Reembaralhar todos os decks
              </button>
            </div>
          </div>

          {/* Painel lateral: Retrato e Afinidade */}
          <CharacterSidebar
            personagemImagem={personagemImagem}
            personagemImagemLink={personagemImagemLink}
            onPersonagemImagemLinkChange={setPersonagemImagemLink}
            onUsarImagemPorLink={handleUsarImagemPorLink}
            onRemoverImagem={() => setPersonagemImagem("")}
          />
        </div>

        {/* Painéis inferiores */}
        <div className="paineis-inferiores">
          <ReferencePanels />

          <NotesEditor
            title="Anotações"
            iconClass="fas fa-sticky-note"
            value={anotacoesHorizonte}
            onChange={setAnotacoesHorizonte}
            placeholder="Registre custos de tempo, consequências e urgências da cena..."
          />

          {/* Perícias & Engenhosidade */}
          <SkillsPanel
            pericias={pericias}
            engenhosidadeTotal={engenhosidadeTotal}
            onToggleBonusPericia={handleToggleBonusPericia}
            onToggleProficienciaPericia={handleToggleProficienciaPericia}
            onIncrementEngPericia={handleIncrementEngPericia}
            onDecrementEngPericia={handleDecrementEngPericia}
            onRolarPericia={(nomePericia) => {
              setRollPericiaEscolha(nomePericia);
            }}
            rollingPericiaNome={rollingPericiaNome}
          />

          <NotesEditor
            title="Características do personagem"
            iconClass="fas fa-pen"
            value={anotacoes}
            onChange={setAnotacoes}
            placeholder="Escreva observações da sessão, ideias de cena, nomes, pistas..."
            panelClassName="anotacoes-painel"
          />
        </div>

        <footer className="app-footer">
          <span>Criado por Rayan de Paula</span>
          <span className="app-footer-sep">·</span>
          <a
            href="https://github.com/RayanRodrigues"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <span className="app-footer-sep">·</span>
          <a
            href="https://www.linkedin.com/in/rayan-rodrigues-pontes-de-paula-24b9a5233/"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn
          </a>
        </footer>
      </div>
      {!chatCollapsed && (
        <aside className="chat-outside">
          <SessionChat
            title="Chat da Mesa"
            messages={chatMessages}
            draft={chatDraft}
            loading={chatLoading}
            canClear={isAdmin}
            clearing={chatClearing}
            collapsed={false}
            showToggle={false}
            onCollapsedChange={setChatCollapsed}
            disabled={!authUser}
            onDraftChange={setChatDraft}
            onSend={() => {
              void handleSendChatMessage();
            }}
            onClear={() => {
              void handleClearChat();
            }}
          />
        </aside>
      )}
      {rollPericiaEscolha && (
        <div className="dice-mode-modal-backdrop" role="dialog" aria-modal="true">
          <div className="dice-mode-modal">
            <h3>
              <i className="fas fa-dice-d20"></i> Escolher rolagem
            </h3>
            <p>
              Perícia: <strong>{rollPericiaEscolha}</strong>
            </p>
            <p>Selecione o modo do teste:</p>
            <div className="dice-mode-modal-actions">
              <button
                type="button"
                onClick={() => handleEscolherModoRolagemPericia("normal")}
              >
                Normal (100%)
              </button>
              <button
                type="button"
                onClick={() => handleEscolherModoRolagemPericia("half")}
              >
                Dificuldade 1/2
              </button>
              <button
                type="button"
                onClick={() => handleEscolherModoRolagemPericia("quarter")}
              >
                Dificuldade 1/4
              </button>
              <button
                type="button"
                className="dice-mode-cancel"
                onClick={() => setRollPericiaEscolha(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      <DiceRollerOverlay ref={diceRollerRef} />
      </div>
    </div>
  );
}















