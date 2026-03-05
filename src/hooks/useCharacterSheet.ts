import { useCallback, useEffect, useState } from "react";
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
  type Card,
  type CriticosExtrasState,
  type CriticosFontesState,
  type DeckState,
  type FlipState,
  type LevelUpPlan,
  type PersistedState,
  type ResultState,
  type SkillsState,
} from "../utils/gameState";

export function useCharacterSheet() {
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

  const sabedoriaTotal =
    (acertosComuns["Sabedoria"] || ACERTOS_INICIAIS_COMUNS) +
    ACERTOS_CRITICOS_FIXOS;
  const vidaMaxima =
    ((acertosComuns["Constituição"] || ACERTOS_INICIAIS_COMUNS) +
      ACERTOS_CRITICOS_FIXOS) *
    4;
  const vidaPercentual = Math.max(
    0,
    Math.min(100, vidaMaxima > 0 ? (vidaAtual / vidaMaxima) * 100 : 0)
  );
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
      // Ignore localStorage failures
    }
  }, [buildPersistedState]);

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

  const handleToggleModoEdicaoDecks = useCallback(() => {
    setModoEdicaoDecks((prev) => {
      const next = !prev;
      if (!next) setMostrarPainelCriticos(false);
      return next;
    });
  }, []);

  const handleTogglePainelCriticos = useCallback(() => {
    setMostrarPainelCriticos((prev) => !prev);
  }, []);

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

  return {
    personagemNome,
    setPersonagemNome,
    personagemIdade,
    setPersonagemIdade,
    personagemImagem,
    setPersonagemImagem,
    personagemImagemLink,
    setPersonagemImagemLink,
    vidaAtual,
    setVidaAtual,
    vidaMaxima,
    vidaPercentual,
    vidaAjusteRapido,
    setVidaAjusteRapido,
    caModificador,
    setCaModificador,
    anotacoes,
    setAnotacoes,
    anotacoesHorizonte,
    setAnotacoesHorizonte,
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
    mostrarEscolhaSubida,
    setMostrarEscolhaSubida,
    mostrarPainelCriticos,
    modoEdicaoDecks,
    sabedoriaTotal,
    transformacoesCriticoSabedoria,
    transformacoesCriticoTotais,
    transformacoesCriticoUsadas,
    transformacoesCriticoDisponiveis,
    engenhosidadeTotal,
    buildPersistedState,
    applyPersistedState,
    handlePuxar,
    handleConcluirPuxada,
    handleFlipBack,
    handleReembaralhar,
    handleReembaralharTodos,
    handleIncrement,
    handleDecrement,
    handleAjustarCriticosFonte,
    aplicarSubidaNivel,
    handleSubirNivel,
    handleToggleModoEdicaoDecks,
    handleTogglePainelCriticos,
    handleConverterAcertoEmCritico,
    handleUsarImagemPorLink,
    handleAplicarAjusteVida,
    handleToggleBonusPericia,
    handleToggleProficienciaPericia,
    handleIncrementEngPericia,
    handleDecrementEngPericia,
  };
}
