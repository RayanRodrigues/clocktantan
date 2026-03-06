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
  ACERTOS_CRITICOS_FIXOS,
  ACERTOS_INICIAIS_COMUNS,
  getPericiaPercentual,
  type Card,
  type PersistedState,
} from "./utils/gameState";
import { playSound } from "./utils/soundManager";

const THEME_STORAGE_KEY = "clock_tantan_theme_mode";
const COMBAT_WALLPAPER_STORAGE_KEY = "clock_tantan_combat_wallpaper";
const CHAT_ROOM_ID = "mesa-principal";
const COMBAT_CONFIG_PREFIX = "__COMBAT_CONFIG__:";
type ThemeMode = "light" | "dark";
type SkillRollMode = "normal" | "half" | "quarter";
type AppPage = "sheet" | "combat";

interface CombatantItem {
  id: string;
  name: string;
  currentHp: number;
  maxHp: number;
  imageUrl: string;
  level: number;
  caMod: number;
  type: "player" | "npc";
}

function orderByIds<T extends { id: string }>(items: T[], ids: string[]): T[] {
  const map = new Map(items.map((item) => [item.id, item]));
  const ordered: T[] = [];
  ids.forEach((id) => {
    const item = map.get(id);
    if (item) {
      ordered.push(item);
      map.delete(id);
    }
  });
  return [...ordered, ...Array.from(map.values())];
}

function moveIdInList(ids: string[], fromId: string, toId: string): string[] {
  if (fromId === toId) return ids;
  const fromIndex = ids.indexOf(fromId);
  const toIndex = ids.indexOf(toId);
  if (fromIndex < 0 || toIndex < 0) return ids;
  const next = [...ids];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function getPageFromHash(): AppPage {
  if (typeof window === "undefined") return "sheet";
  return window.location.hash === "#/combate" ? "combat" : "sheet";
}

function parseCharacterState(raw: {
  stateJson?: string;
  state?: Partial<PersistedState>;
}): Partial<PersistedState> | null {
  if (typeof raw.stateJson === "string" && raw.stateJson.trim().length > 0) {
    try {
      return JSON.parse(raw.stateJson) as Partial<PersistedState>;
    } catch {
      return null;
    }
  }
  if (raw.state && typeof raw.state === "object") {
    return raw.state;
  }
  return null;
}

function readConstituicaoValue(acertosComuns: unknown): number {
  if (!acertosComuns || typeof acertosComuns !== "object") {
    return ACERTOS_INICIAIS_COMUNS;
  }
  const record = acertosComuns as Record<string, unknown>;
  const key = Object.keys(record).find((k) => k.toLowerCase().includes("onstit"));
  const value = key ? record[key] : null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(ACERTOS_INICIAIS_COMUNS, Math.floor(value));
  }
  return ACERTOS_INICIAIS_COMUNS;
}

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
  const [currentPage, setCurrentPage] = useState<AppPage>(() => getPageFromHash());
  const [combatWallpaperDraft, setCombatWallpaperDraft] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(COMBAT_WALLPAPER_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [combatWallpaperUrl, setCombatWallpaperUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(COMBAT_WALLPAPER_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [combatants, setCombatants] = useState<CombatantItem[]>([]);
  const [selectedCombatantId, setSelectedCombatantId] = useState<string | null>(null);
  const [combatIncludedIds, setCombatIncludedIds] = useState<string[] | null>(null);
  const [combatOrderIds, setCombatOrderIds] = useState<string[] | null>(null);
  const [combatSelectionDraft, setCombatSelectionDraft] = useState<string[]>([]);
  const [combatOrderDraft, setCombatOrderDraft] = useState<string[]>([]);
  const [draggingCombatantId, setDraggingCombatantId] = useState<string | null>(null);
  const [publicCombatants, setPublicCombatants] = useState<CombatantItem[] | null>(null);
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

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleHashChange = () => setCurrentPage(getPageFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const targetHash = currentPage === "combat" ? "#/combate" : "#/ficha";
    if (window.location.hash !== targetHash) {
      window.history.replaceState(null, "", targetHash);
    }
  }, [currentPage]);

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
    if (currentPage !== "combat") return undefined;
    if (!authUser) {
      setCombatIncludedIds(null);
      setCombatOrderIds(null);
      setPublicCombatants(null);
      return undefined;
    }
    const q = query(
      collection(db, "rooms", CHAT_ROOM_ID, "messages"),
      orderBy("createdAt", "asc"),
      limit(400)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const configDocs = snap.docs
          .map((docSnap) =>
            docSnap.data() as {
              type?: string;
              text?: string;
            }
          )
          .filter(
            (data) =>
              data.type === "chat" &&
              typeof data.text === "string" &&
              data.text.startsWith(COMBAT_CONFIG_PREFIX)
          );
        const latest = configDocs[configDocs.length - 1];
        if (!latest) {
          setCombatIncludedIds(null);
          setPublicCombatants(null);
          return;
        }
        let parsedPayload: { includedIds?: unknown; orderIds?: unknown; participants?: unknown } | null = null;
        try {
          const rawJson = (latest.text as string).slice(COMBAT_CONFIG_PREFIX.length);
          parsedPayload = JSON.parse(rawJson) as {
            includedIds?: unknown;
            orderIds?: unknown;
            participants?: unknown;
          };
        } catch {
          parsedPayload = null;
        }
        let resolvedOrderIds: string[] = [];
        if (!parsedPayload || !Array.isArray(parsedPayload.includedIds)) {
          setCombatIncludedIds(null);
          setCombatOrderIds(null);
        } else {
          const ids = parsedPayload.includedIds.filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0
          );
          setCombatIncludedIds(ids);
          if (Array.isArray(parsedPayload.orderIds)) {
            const orderIds = parsedPayload.orderIds.filter(
              (value): value is string => typeof value === "string" && value.trim().length > 0
            );
            setCombatOrderIds(orderIds);
            resolvedOrderIds = orderIds;
          } else {
            setCombatOrderIds(ids);
            resolvedOrderIds = ids;
          }
        }
        if (!parsedPayload || !Array.isArray(parsedPayload.participants)) {
          setPublicCombatants(null);
          return;
        }
        const participants = parsedPayload.participants
          .map((value) => {
            if (!value || typeof value !== "object") return null;
            const row = value as Partial<CombatantItem>;
            if (!row.id || !row.name) return null;
            return {
              id: String(row.id),
              name: String(row.name),
              currentHp:
                typeof row.currentHp === "number" && Number.isFinite(row.currentHp)
                  ? Math.max(0, Math.floor(row.currentHp))
                  : 0,
              maxHp:
                typeof row.maxHp === "number" && Number.isFinite(row.maxHp)
                  ? Math.max(1, Math.floor(row.maxHp))
                  : 1,
              imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : "",
              level:
                typeof row.level === "number" && Number.isFinite(row.level)
                  ? Math.max(1, Math.floor(row.level))
                  : 1,
              caMod:
                typeof row.caMod === "number" && Number.isFinite(row.caMod)
                  ? Math.floor(row.caMod)
                  : 0,
              type: row.type === "npc" ? "npc" : "player",
            } as CombatantItem;
          })
          .filter((item): item is CombatantItem => item !== null);
        setPublicCombatants(orderByIds(participants, resolvedOrderIds));
      },
      (err) => {
        console.error("Erro ao carregar configuracao do tracker:", err);
        setCombatIncludedIds(null);
        setCombatOrderIds(null);
        setPublicCombatants(null);
      }
    );
    return () => unsub();
  }, [authUser, currentPage]);

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
        const items: SessionChatMessage[] = snap.docs
          .map((docSnap) => {
            const data = docSnap.data() as {
              type?: "chat" | "roll" | "combat_config";
              text?: string;
              senderName?: string;
              createdAt?: { toDate?: () => Date };
            };
            if (
              data.type === "chat" &&
              typeof data.text === "string" &&
              data.text.startsWith(COMBAT_CONFIG_PREFIX)
            ) {
              return null;
            }
            if (data.type !== "chat" && data.type !== "roll") return null;
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
          })
          .filter((item): item is SessionChatMessage => item !== null);
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

  const localCombatant = useCallback(
    (): CombatantItem => ({
      id: targetCharacterUid ?? authUser?.uid ?? "local",
      name: personagemNome.trim() || "Personagem local",
      currentHp: Math.max(0, Math.floor(vidaAtual)),
      maxHp: Math.max(1, Math.floor(vidaMaxima)),
      imageUrl: personagemImagem || "",
      level: Math.max(1, Math.floor(nivel)),
      caMod: Math.floor(caModificador),
      type: "player",
    }),
    [
      authUser?.uid,
      caModificador,
      nivel,
      personagemImagem,
      personagemNome,
      targetCharacterUid,
      vidaAtual,
      vidaMaxima,
    ]
  );

  useEffect(() => {
    if (currentPage !== "combat") return undefined;

    if (!authUser || !isAdmin) {
      setCombatants([localCombatant()]);
      return undefined;
    }

    const unsub = onSnapshot(
      collection(db, "characters"),
      (snap) => {
        const rows: CombatantItem[] = snap.docs.map((docSnap) => {
          const raw = docSnap.data() as {
            stateJson?: string;
            state?: Partial<PersistedState>;
            type?: "player" | "npc";
          };
          const parsed = parseCharacterState(raw);
          const name = parsed?.personagemNome?.trim() || `Personagem ${docSnap.id.slice(0, 6)}`;
          const constituicao = readConstituicaoValue(parsed?.acertosComuns);
          const maxHp = Math.max(
            1,
            (constituicao + ACERTOS_CRITICOS_FIXOS) * 4
          );
          const currentBase =
            typeof parsed?.vidaAtual === "number" && Number.isFinite(parsed.vidaAtual)
              ? parsed.vidaAtual
              : maxHp;
          const currentHp = Math.max(0, Math.min(maxHp, Math.floor(currentBase)));
          const levelBase =
            typeof parsed?.nivel === "number" && Number.isFinite(parsed.nivel)
              ? parsed.nivel
              : 1;
          const caBase =
            typeof parsed?.caModificador === "number" && Number.isFinite(parsed.caModificador)
              ? parsed.caModificador
              : 0;
          return {
            id: docSnap.id,
            name,
            currentHp,
            maxHp,
            imageUrl: parsed?.personagemImagem?.trim() || "",
            level: Math.max(1, Math.floor(levelBase)),
            caMod: Math.floor(caBase),
            type: raw.type === "npc" ? "npc" : "player",
          };
        });

        rows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
        setCombatants(rows);
      },
      (err) => {
        console.error("Erro ao carregar tracker de combate:", err);
        setCombatants([localCombatant()]);
      }
    );

    return () => unsub();
  }, [authUser, currentPage, localCombatant]);

  useEffect(() => {
    if (!isAdmin) return;
    if (combatIncludedIds === null) {
      const allIds = combatants.map((item) => item.id);
      setCombatSelectionDraft(allIds);
      setCombatOrderDraft(allIds);
      return;
    }
    setCombatSelectionDraft(combatIncludedIds);
    const baseOrder = combatOrderIds ?? combatIncludedIds;
    setCombatOrderDraft(baseOrder);
  }, [combatIncludedIds, combatOrderIds, combatants, isAdmin]);

  const handleToggleCombatSelection = useCallback((characterId: string) => {
    setCombatSelectionDraft((prev) =>
      prev.includes(characterId)
        ? prev.filter((id) => id !== characterId)
        : [...prev, characterId]
    );
    setCombatOrderDraft((prev) =>
      prev.includes(characterId)
        ? prev.filter((id) => id !== characterId)
        : [...prev, characterId]
    );
  }, []);

  const handleMoveCombatDraft = useCallback((id: string, delta: -1 | 1) => {
    setCombatOrderDraft((prev) => {
      const index = prev.indexOf(id);
      if (index < 0) return prev;
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }, []);

  const handleDropCombatDraft = useCallback((targetId: string) => {
    if (!draggingCombatantId) return;
    setCombatOrderDraft((prev) => moveIdInList(prev, draggingCombatantId, targetId));
    setDraggingCombatantId(null);
  }, [draggingCombatantId]);

  const handleSaveCombatSelection = useCallback(async () => {
    if (!authUser || !isAdmin) return;
    const validSelectedIds = combatSelectionDraft.filter((id) =>
      combatants.some((item) => item.id === id)
    );
    const orderedSelectedIds = orderByIds(
      validSelectedIds.map((id) => ({ id })),
      combatOrderDraft
    ).map((item) => item.id);
    const participants = orderByIds(
      combatants.filter((item) => orderedSelectedIds.includes(item.id)),
      orderedSelectedIds
    );
    const payload = JSON.stringify({
      includedIds: validSelectedIds,
      orderIds: orderedSelectedIds,
      participants,
    });
    try {
      await addDoc(collection(db, "rooms", CHAT_ROOM_ID, "messages"), {
        type: "chat",
        text: `${COMBAT_CONFIG_PREFIX}${payload}`,
        senderName: authUser.displayName || authUser.email || "Admin",
        uid: authUser.uid,
        characterUid: targetCharacterUid ?? authUser.uid,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Erro ao salvar participantes do tracker:", err);
      alert("Nao foi possivel salvar os participantes do tracker.");
    }
  }, [authUser, combatOrderDraft, combatSelectionDraft, combatants, isAdmin, targetCharacterUid]);

  useEffect(() => {
    const draftIncluded = isAdmin ? combatSelectionDraft : combatIncludedIds;
    const draftOrder = isAdmin ? combatOrderDraft : combatOrderIds;
    const src = isAdmin
      ? combatants
      : publicCombatants && publicCombatants.length > 0
      ? publicCombatants
      : combatants;
    const filtered =
      draftIncluded === null
        ? src
        : src.filter((item) => draftIncluded.includes(item.id));
    const visibleIds = orderByIds(filtered, draftOrder ?? []).map((item) => item.id);
    if (visibleIds.length === 0) {
      setSelectedCombatantId(null);
      return;
    }
    const hasSelected = selectedCombatantId
      ? visibleIds.includes(selectedCombatantId)
      : false;
    if (!hasSelected) {
      setSelectedCombatantId(visibleIds[0]);
    }
  }, [
    combatIncludedIds,
    combatOrderDraft,
    combatOrderIds,
    combatSelectionDraft,
    combatants,
    isAdmin,
    publicCombatants,
    selectedCombatantId,
  ]);

  const handleApplyCombatWallpaper = useCallback(() => {
    const next = combatWallpaperDraft.trim();
    if (!next) {
      setCombatWallpaperUrl("");
      try {
        window.localStorage.removeItem(COMBAT_WALLPAPER_STORAGE_KEY);
      } catch {
        // ignore localStorage failures
      }
      return;
    }
    const validLink = /^https?:\/\//i.test(next) || next.startsWith("/");
    if (!validLink) {
      alert("Use um link valido (https://...) ou caminho local (/arquivo.png).");
      return;
    }
    setCombatWallpaperUrl(next);
    try {
      window.localStorage.setItem(COMBAT_WALLPAPER_STORAGE_KEY, next);
    } catch {
      // ignore localStorage failures
    }
  }, [combatWallpaperDraft]);

  const combatPageStyle = combatWallpaperUrl
    ? {
        backgroundImage: `url("${combatWallpaperUrl}")`,
      }
    : undefined;
  const sourceCombatants = isAdmin
    ? combatants
    : publicCombatants && publicCombatants.length > 0
    ? publicCombatants
    : combatants;
  const baseIncludedIds = isAdmin
    ? combatSelectionDraft
    : combatIncludedIds;
  const baseOrderIds = isAdmin
    ? combatOrderDraft
    : combatOrderIds;
  const filteredCombatants =
    baseIncludedIds === null
      ? sourceCombatants
      : sourceCombatants.filter((item) => baseIncludedIds.includes(item.id));
  const visibleCombatants = orderByIds(filteredCombatants, baseOrderIds ?? []);
  const selectedCombatant =
    visibleCombatants.find((item) => item.id === selectedCombatantId) ?? visibleCombatants[0] ?? null;


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

        <div className="page-switch-bar">
          <button
            type="button"
            className={`page-switch-btn ${currentPage === "sheet" ? "is-active" : ""}`}
            onClick={() => setCurrentPage("sheet")}
          >
            <i className="fas fa-scroll"></i> Ficha
          </button>
          <button
            type="button"
            className={`page-switch-btn ${currentPage === "combat" ? "is-active" : ""}`}
            onClick={() => setCurrentPage("combat")}
          >
            <i className="fas fa-shield-halved"></i> Combate
          </button>
        </div>

        {currentPage === "sheet" ? (
          <>
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
          </>
        ) : (
          <section className="combat-page" style={combatPageStyle}>
            <div className="combat-page-header">
              <h2>
                <i className="fas fa-skull-crossbones"></i> Tracker de Combate
              </h2>
              <p>
                Vida de todos os personagens na mesma tela.
              </p>
            </div>

            {isAdmin && (
              <div className="combat-wallpaper-box">
                <label htmlFor="combat-wallpaper-link">Wallpaper por link</label>
                <div className="combat-wallpaper-controls">
                  <input
                    id="combat-wallpaper-link"
                    type="url"
                    value={combatWallpaperDraft}
                    onChange={(e) => setCombatWallpaperDraft(e.target.value)}
                    placeholder="https://site.com/imagem.jpg"
                  />
                  <button type="button" onClick={handleApplyCombatWallpaper}>
                    Aplicar fundo
                  </button>
                  <button
                    type="button"
                    className="is-secondary"
                    onClick={() => {
                      setCombatWallpaperDraft("");
                      setCombatWallpaperUrl("");
                      try {
                        window.localStorage.removeItem(COMBAT_WALLPAPER_STORAGE_KEY);
                      } catch {
                        // ignore localStorage failures
                      }
                    }}
                  >
                    Limpar
                  </button>
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="combat-admin-box">
                <div className="combat-admin-header">
                  <strong>Participantes no tracker</strong>
                  <div className="combat-admin-actions">
                    <button
                      type="button"
                      className="is-secondary"
                      onClick={() => {
                        const allIds = combatants.map((item) => item.id);
                        setCombatSelectionDraft(allIds);
                        setCombatOrderDraft(allIds);
                      }}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      className="is-secondary"
                      onClick={() => {
                        setCombatSelectionDraft([]);
                        setCombatOrderDraft([]);
                      }}
                    >
                      Limpar
                    </button>
                    <button type="button" onClick={() => void handleSaveCombatSelection()}>
                      Salvar participantes
                    </button>
                  </div>
                </div>
                <p className="combat-admin-hint">
                  Arraste os cards abaixo para reordenar (ou use as setas). So o ADM pode alterar a ordem.
                </p>
                <div className="combat-admin-list">
                  {combatants.map((combatant) => (
                    <label key={combatant.id} className="combat-admin-item">
                      <input
                        type="checkbox"
                        checked={combatSelectionDraft.includes(combatant.id)}
                        onChange={() => handleToggleCombatSelection(combatant.id)}
                      />
                      <span>{combatant.name}</span>
                      <small>{combatant.type === "npc" ? "NPC" : "Jogador"}</small>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="combat-grid">
              <div className="combat-strip" role="tablist" aria-label="Participantes do combate">
                {visibleCombatants.map((combatant) => {
                  const hpPercent = Math.max(
                    0,
                    Math.min(100, combatant.maxHp > 0 ? (combatant.currentHp / combatant.maxHp) * 100 : 0)
                  );
                  const hpPercentRounded = Math.round(hpPercent);
                  const isActive = selectedCombatant?.id === combatant.id;
                  return (
                    <button
                      key={combatant.id}
                      type="button"
                      className={`combat-token ${combatant.type === "npc" ? "is-npc" : "is-player"} ${isActive ? "is-active" : ""}`}
                      onClick={() => setSelectedCombatantId(combatant.id)}
                      draggable={isAdmin}
                      onDragStart={() => setDraggingCombatantId(combatant.id)}
                      onDragOver={(e) => {
                        if (!isAdmin) return;
                        e.preventDefault();
                      }}
                      onDrop={() => {
                        if (!isAdmin) return;
                        handleDropCombatDraft(combatant.id);
                      }}
                      onDragEnd={() => setDraggingCombatantId(null)}
                    >
                      {isAdmin && (
                        <span className="combat-token-order-controls">
                          <span
                            className="combat-token-order-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveCombatDraft(combatant.id, -1);
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label="Mover para esquerda"
                            onKeyDown={(e) => {
                              if (e.key !== "Enter" && e.key !== " ") return;
                              e.preventDefault();
                              e.stopPropagation();
                              handleMoveCombatDraft(combatant.id, -1);
                            }}
                          >
                            <i className="fas fa-chevron-left"></i>
                          </span>
                          <span
                            className="combat-token-order-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveCombatDraft(combatant.id, 1);
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label="Mover para direita"
                            onKeyDown={(e) => {
                              if (e.key !== "Enter" && e.key !== " ") return;
                              e.preventDefault();
                              e.stopPropagation();
                              handleMoveCombatDraft(combatant.id, 1);
                            }}
                          >
                            <i className="fas fa-chevron-right"></i>
                          </span>
                        </span>
                      )}
                      {combatant.imageUrl ? (
                        <img src={combatant.imageUrl} alt={combatant.name} className="combat-token-image" />
                      ) : (
                        <span className="combat-token-fallback">
                          <i className="fas fa-user-shield"></i>
                        </span>
                      )}
                      <span className="combat-token-hp">
                        {isAdmin
                          ? `${combatant.currentHp}/${combatant.maxHp}`
                          : `${hpPercentRounded}%`}
                      </span>
                      <span className="combat-token-bar">
                        <span style={{ width: `${hpPercent}%` }} />
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedCombatant ? (
                <article className="combat-detail-card">
                  <div className="combat-detail-top">
                    <h3>{selectedCombatant.name}</h3>
                    <span className={`combat-detail-type ${selectedCombatant.type === "npc" ? "is-npc" : "is-player"}`}>
                      {selectedCombatant.type === "npc" ? "NPC" : "Jogador"}
                    </span>
                  </div>
                  <p className="combat-detail-sub">
                    Nivel {selectedCombatant.level}
                  </p>
                  <ul className="combat-detail-stats">
                    <li>
                      <i className="fas fa-heart"></i>
                      <span>
                        {isAdmin
                          ? `${selectedCombatant.currentHp}/${selectedCombatant.maxHp} HP`
                          : `${Math.round(
                              selectedCombatant.maxHp > 0
                                ? (selectedCombatant.currentHp / selectedCombatant.maxHp) * 100
                                : 0
                            )}% de vida`}
                      </span>
                    </li>
                    <li>
                      <i className="fas fa-shield-halved"></i>
                      <span>CA {selectedCombatant.caMod >= 0 ? `+${selectedCombatant.caMod}` : selectedCombatant.caMod}</span>
                    </li>
                    {isAdmin && (
                      <li>
                        <i className="fas fa-chart-line"></i>
                        <span>
                          {Math.round(
                            selectedCombatant.maxHp > 0
                              ? (selectedCombatant.currentHp / selectedCombatant.maxHp) * 100
                              : 0
                          )}
                          % de vida
                        </span>
                      </li>
                    )}
                  </ul>
                </article>
              ) : (
                <article className="combat-detail-card">
                  <div className="combat-detail-top">
                    <h3>Sem participantes</h3>
                  </div>
                  <p className="combat-detail-sub">
                    {isAdmin
                      ? "Selecione quem deve aparecer e clique em salvar participantes."
                      : "Aguardando o ADM definir quem aparece no tracker."}
                  </p>
                </article>
              )}
            </div>
          </section>
        )}

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















