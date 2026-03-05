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
import { LifePanel } from "./components/LifePanel";
import { LevelControlsPanel } from "./components/LevelControlsPanel";
import { NotesEditor } from "./components/NotesEditor";
import { ReferencePanels } from "./components/ReferencePanels";
import { SessionChat, type SessionChatMessage } from "./components/SessionChat";
import { SkillsPanel } from "./components/SkillsPanel";
import { db } from "./firebase";
import { useCharacterSheet } from "./hooks/useCharacterSheet";
import { useFirebaseCharacterSync } from "./hooks/useFirebaseCharacterSync";
import {
  ATRIBUTOS,
  getPericiaPercentual,
  type Card,
} from "./utils/gameState";
import { playSound } from "./utils/soundManager";

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
  const [headerIconFailed, setHeaderIconFailed] = useState(false);
  const headerIconSrc =
    themeMode === "dark"
      ? "/icons/topbar/logo-dark.png"
      : "/icons/topbar/logo-light.png";

  useEffect(() => {
    setHeaderIconFailed(false);
  }, [headerIconSrc]);
  const {
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
  } = useCharacterSheet();
  const [chatMessages, setChatMessages] = useState<SessionChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatClearing, setChatClearing] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [rollingPericiaNome, setRollingPericiaNome] = useState<string | null>(null);
  const [rollPericiaEscolha, setRollPericiaEscolha] = useState<string | null>(null);
  const diceRollerRef = useRef<DiceRollerOverlayHandle | null>(null);

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
              <span className="app-main-logo-wrap">
                {headerIconFailed ? (
                  <i className="fas fa-dice-d20 app-title-icon-fallback" aria-hidden="true"></i>
                ) : (
                  <img
                    src={headerIconSrc}
                    alt=""
                    className="app-main-logo"
                    onError={() => setHeaderIconFailed(true)}
                  />
                )}
              </span>
            </h1>
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

        <LifePanel
          vidaAtual={vidaAtual}
          vidaMaxima={vidaMaxima}
          vidaPercentual={vidaPercentual}
          vidaAjusteRapido={vidaAjusteRapido}
          caModificador={caModificador}
          onVidaAjusteRapidoChange={setVidaAjusteRapido}
          onAplicarAjusteVida={handleAplicarAjusteVida}
          onSetVidaAtual={setVidaAtual}
          onSetVidaCheia={() => setVidaAtual(vidaMaxima)}
          onSetCaModificador={setCaModificador}
        />

        <LevelControlsPanel
          nivel={nivel}
          pontosDistribuir={pontosDistribuir}
          planoSubida={planoSubida}
          mostrarEscolhaSubida={mostrarEscolhaSubida}
          modoEdicaoDecks={modoEdicaoDecks}
          mostrarPainelCriticos={mostrarPainelCriticos}
          transformacoesCriticoSabedoria={transformacoesCriticoSabedoria}
          transformacoesCriticoTotais={transformacoesCriticoTotais}
          transformacoesCriticoUsadas={transformacoesCriticoUsadas}
          transformacoesCriticoDisponiveis={transformacoesCriticoDisponiveis}
          criticosFontes={criticosFontes}
          onSubirNivel={handleSubirNivel}
          onToggleModoEdicaoDecks={handleToggleModoEdicaoDecks}
          onTogglePainelCriticos={handleTogglePainelCriticos}
          onAplicarSubidaNivel={aplicarSubidaNivel}
          onFecharEscolhaSubida={() => setMostrarEscolhaSubida(false)}
          onAjustarCriticosFonte={handleAjustarCriticosFonte}
        />

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
                onClick={() => {
                  playSound("shuffle");
                  handleReembaralharTodos();
                }}
                className="global-reemb-btn"
              >
                <img src="/icons/acoes/reemb.svg" alt="" className="action-btn-icon" /> Reembaralhar todos os decks
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















