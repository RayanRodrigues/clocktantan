import { useState, useCallback, useEffect } from "react";
import { AdminCharacterSelector } from "./components/AdminCharacterSelector";
import { AuthBar } from "./components/AuthBar";
import { DeckCard } from "./components/DeckCard";
import { CharacterSidebar } from "./components/CharacterSidebar";
import { NotesEditor } from "./components/NotesEditor";
import { ReferencePanels } from "./components/ReferencePanels";
import { SkillsPanel } from "./components/SkillsPanel";
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
type ThemeMode = "light" | "dark";

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
  const [personagemNome, setPersonagemNome] = useState(
    initialState?.personagemNome ?? ""
  );
  const [personagemIdade, setPersonagemIdade] = useState(
    initialState?.personagemIdade ?? ""
  );
  const [personagemImagem, setPersonagemImagem] = useState(
    initialState?.personagemImagem ?? ""
  );
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
  const buildPersistedState = useCallback(
    (): PersistedState => ({
      personagemNome,
      personagemIdade,
      personagemImagem,
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


  return (
    <div className={`app-bg ${themeMode === "dark" ? "dark-mode" : ""}`}>
      <div className="tool">
        <div className="top-header">
          <div className="top-header-center">
            <h1 className="text-center mt-0 text-slate-700 text-2xl md:text-3xl font-bold">
              ⏰ Clock Tan-Tan · Ferramenta do Mestre
            </h1>
            <div className="text-center mb-6 text-slate-600 italic">
              Gerenciamento de decks, progressão, perícias e regras
            </div>
          </div>
          <div className="top-header-right">
            <button
              type="button"
              className={`theme-toggle ${
                themeMode === "dark" ? "theme-toggle-dark" : "theme-toggle-light"
              }`}
              onClick={() =>
                setThemeMode((prev) => (prev === "dark" ? "light" : "dark"))
              }
              title={themeMode === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
              aria-label={themeMode === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
            >
              <span className="theme-toggle-text">
                {themeMode === "dark" ? "NIGHT MODE" : "DAY MODE"}
              </span>
              <span className="theme-toggle-knob">
                <i className={`fas ${themeMode === "dark" ? "fa-moon" : "fa-sun"}`}></i>
              </span>
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
                  onConcluirPuxada={(cartas) => handleConcluirPuxada(attr, cartas)}
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

          {/* Painel lateral: Afinidade */}
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
      </div>
    </div>
  );
}





