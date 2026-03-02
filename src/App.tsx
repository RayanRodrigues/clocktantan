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
  initFlipped,
  initPericias,
  initResults,
  loadPersistedState,
  type AccuracyState,
  type CriticosExtrasState,
  type PersistedState,
  type DeckState,
  type ResultState,
  type FlipState,
  type SkillsState,
} from "./utils/gameState";

// ---------- Main App ----------
export function App() {
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
      decks,
      resultados,
      flipped,
      pericias,
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
      decks,
      resultados,
      flipped,
      pericias,
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
    setDecks(state.decks);
    setResultados(state.resultados);
    setFlipped(state.flipped);
    setPericias(state.pericias);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPersistedState()));
    } catch {
      // Ignore localStorage failures (private mode/quota/etc.)
    }
  }, [buildPersistedState]);

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
  } = useFirebaseCharacterSync({
    buildPersistedState,
    applyPersistedState,
  });

  const sabedoriaTotal =
    (acertosComuns["Sabedoria"] || ACERTOS_INICIAIS_COMUNS) +
    ACERTOS_CRITICOS_FIXOS;
  const transformacoesCriticoTotais = Math.floor(sabedoriaTotal / 10);
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
    (acertos: AccuracyState, rawExtras: CriticosExtrasState): CriticosExtrasState => {
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
      );
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
    (attr: string) => {
      const deck = decks[attr];
      if (deck.length === 0) {
        alert(`Deck de ${attr} vazio! Reembaralhe.`);
        return;
      }
      const novoDeck = [...deck];
      const carta = novoDeck.pop()!;
      setDecks((prev) => ({ ...prev, [attr]: novoDeck }));
      setResultados((prev) => ({ ...prev, [attr]: carta }));
      // Flip the card to show result
      setFlipped((prev) => ({ ...prev, [attr]: true }));
    },
    [decks]
  );

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
      setResultados((prev) => ({ ...prev, [attr]: null }));
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
      const novoAcertos = {
        ...acertosComuns,
        [attr]: acertosComuns[attr] + 1,
      };
      const novosCriticosExtras = normalizeCriticosExtras(novoAcertos, criticosExtras);
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
    },
    [acertosComuns, criticosExtras, normalizeCriticosExtras, pontosDistribuir]
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
      const novosCriticosExtras = normalizeCriticosExtras(novoAcertos, criticosExtras);
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
    [acertosComuns, criticosExtras, normalizeCriticosExtras]
  );

  const handleSubirNivel = useCallback(() => {
    setNivel((prev) => prev + 1);
    setPontosDistribuir((prev) => prev + 2);
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
      setResultados((prev) => ({ ...prev, [attr]: null }));
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
    <div className="app-bg">
      <div className="tool">
        <h1 className="text-center mt-0 text-slate-700 text-2xl md:text-3xl font-bold">
          ⏰ Clock Tan-Tan · Ferramenta do Mestre
        </h1>
        <div className="text-center mb-6 text-slate-600 italic">
          Gerenciamento de decks, progressão, perícias e regras
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
            ⬆ Subir Nível (+2 acertos)
          </button>
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
                  onPuxar={() => handlePuxar(attr)}
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




