import { useState, useCallback, useEffect, useRef } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { collection, doc, getDoc, getDocs, onSnapshot, setDoc } from "firebase/firestore";
import { DeckCard } from "./components/DeckCard";
import { auth, db } from "./firebase";
import {
  BASE_PERICIA,
  ACERTOS_CRITICOS_FIXOS,
  ACERTOS_INICIAIS_COMUNS,
  ATRIBUTOS,
  PERICIA_LIMITES,
  PERICIAS_POR_CATEGORIA,
  STORAGE_KEY,
  TODAS_PERICIAS,
  criarDeck,
  criarTodosDecks,
  getMaxEngStacksForBonus,
  initAcertos,
  initFlipped,
  initPericias,
  initResults,
  loadPersistedState,
  normalizePersistedState,
  toCloudState,
  toFirestoreSafeState,
  type AccuracyState,
  type PersistedState,
  type DeckState,
  type ResultState,
  type FlipState,
  type SkillsState,
  type SkillMark,
} from "./utils/gameState";

interface CharacterListItem {
  id: string;
  ownerUid: string;
  personagemNome: string;
}

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
  const anotacoesEditorRef = useRef<HTMLDivElement | null>(null);
  const anotacoesHorizonteEditorRef = useRef<HTMLDivElement | null>(null);
  const [nivel, setNivel] = useState(initialState?.nivel ?? 1);
  const [pontosDistribuir, setPontosDistribuir] = useState(
    initialState?.pontosDistribuir ?? 21
  );
  const [acertosComuns, setAcertosComuns] = useState<AccuracyState>(
    initialState?.acertosComuns ?? initAcertos()
  );
  const [decks, setDecks] = useState<DeckState>(
    initialState?.decks ?? criarTodosDecks(initialState?.acertosComuns ?? initAcertos())
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
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [charactersList, setCharactersList] = useState<CharacterListItem[]>([]);
  const [activeCharacterUid, setActiveCharacterUid] = useState<string | null>(null);
  const skipCloudSaveRef = useRef(false);
  const loadedCloudUidRef = useRef<string | null>(null);
  const desiredCharacterUidRef = useRef<string | null>(null);

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
    setDecks(state.decks);
    setResultados(state.resultados);
    setFlipped(state.flipped);
    setPericias(state.pericias);
  }, []);

  const loadCharacterFromCloud = useCallback(
    async (uid: string) => {
      if (!authUser) return;

      const ref = doc(db, "characters", uid);
      const snap = await getDoc(ref);
      if (desiredCharacterUidRef.current && desiredCharacterUidRef.current !== uid) return;

      if (snap.exists()) {
        const data = snap.data() as {
          state?: Partial<PersistedState>;
          stateJson?: string;
        };

        if (typeof data.stateJson === "string" && data.stateJson.trim().length > 0) {
          try {
            const parsed = JSON.parse(data.stateJson) as Partial<PersistedState>;
            skipCloudSaveRef.current = true;
            applyPersistedState(normalizePersistedState(parsed));
            loadedCloudUidRef.current = uid;
            return;
          } catch {
            // JSON inválido: tenta fallback abaixo.
          }
        }

        if (data.state && typeof data.state === "object") {
          skipCloudSaveRef.current = true;
          applyPersistedState(normalizePersistedState(data.state));
          loadedCloudUidRef.current = uid;
          return;
        }

        skipCloudSaveRef.current = true;
        applyPersistedState(normalizePersistedState({}));
        loadedCloudUidRef.current = uid;
        return;
      }

      if (uid === authUser.uid) {
        const localState = loadPersistedState() ?? normalizePersistedState({});
        const payload = toCloudState(toFirestoreSafeState(localState));
        await setDoc(ref, {
          ownerUid: authUser.uid,
          stateJson: JSON.stringify(payload),
        });
      }

      skipCloudSaveRef.current = true;
      applyPersistedState(normalizePersistedState({}));
      loadedCloudUidRef.current = uid;
    },
    [authUser, applyPersistedState]
  );

  const normalizeCharactersList = useCallback(
    (docs: Array<{ id: string; data: () => unknown }>): CharacterListItem[] => {
      const list: CharacterListItem[] = docs.map((d) => {
        const data = d.data() as {
          ownerUid?: string;
          state?: Partial<PersistedState>;
          stateJson?: string;
        };
        let personagemNome = "";
        if (typeof data.stateJson === "string" && data.stateJson.trim()) {
          try {
            const parsed = JSON.parse(data.stateJson) as Partial<PersistedState>;
            if (typeof parsed.personagemNome === "string") {
              personagemNome = parsed.personagemNome;
            }
          } catch {
            // ignore broken JSON from old docs
          }
        } else if (typeof data.state?.personagemNome === "string") {
          personagemNome = data.state.personagemNome;
        }
        return {
          id: d.id,
          ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : d.id,
          personagemNome,
        };
      });

      list.sort((a, b) => {
        const nameA = (a.personagemNome || "").toLowerCase();
        const nameB = (b.personagemNome || "").toLowerCase();
        if (nameA && nameB && nameA !== nameB) return nameA.localeCompare(nameB);
        if (nameA && !nameB) return -1;
        if (!nameA && nameB) return 1;
        return a.id.localeCompare(b.id);
      });

      return list;
    },
    []
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPersistedState()));
    } catch {
      // Ignore localStorage failures (private mode/quota/etc.)
    }
  }, [buildPersistedState]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthLoading(true);
      setAuthUser(user);
      loadedCloudUidRef.current = null;
      if (!user) {
        desiredCharacterUidRef.current = null;
        skipCloudSaveRef.current = true;
        applyPersistedState(normalizePersistedState({}));
        setIsAdmin(false);
        setActiveCharacterUid(null);
        setCharactersList([]);
        setAuthLoading(false);
        return;
      }

      try {
        const token = await user.getIdTokenResult();
        const admin = token.claims.admin === true;
        desiredCharacterUidRef.current = user.uid;
        setIsAdmin(admin);
        setActiveCharacterUid(user.uid);
      } catch {
        desiredCharacterUidRef.current = user.uid;
        setIsAdmin(false);
        setActiveCharacterUid(user.uid);
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authUser || !isAdmin) {
      setCharactersList([]);
      return;
    }
    void getDocs(collection(db, "characters"))
      .then((snap) => {
        setCharactersList(normalizeCharactersList(snap.docs));
      })
      .catch((err) => {
        console.error("Erro ao buscar fichas (admin/getDocs):", err);
      });

    const unsub = onSnapshot(
      collection(db, "characters"),
      (snap) => {
        setCharactersList(normalizeCharactersList(snap.docs));
      },
      (err) => {
        console.error("Erro ao listar fichas (admin):", err);
      }
    );
    return () => unsub();
  }, [authUser, isAdmin, normalizeCharactersList]);

  useEffect(() => {
    if (!authUser || !isAdmin) return;
    if (charactersList.length === 0) {
      if (activeCharacterUid !== null) {
        loadedCloudUidRef.current = null;
        setActiveCharacterUid(null);
      }
      return;
    }

    const hasActive = activeCharacterUid
      ? charactersList.some((item) => item.id === activeCharacterUid)
      : false;

    if (!hasActive) {
      loadedCloudUidRef.current = null;
      setActiveCharacterUid(charactersList[0].id);
    }
  }, [authUser, isAdmin, charactersList, activeCharacterUid]);

  const targetCharacterUid =
    authUser == null
      ? null
      : isAdmin
      ? activeCharacterUid ?? authUser.uid
      : authUser.uid;

  useEffect(() => {
    desiredCharacterUidRef.current = targetCharacterUid;
  }, [targetCharacterUid]);

    useEffect(() => {
    if (authLoading || !authUser || !targetCharacterUid) return;
    if (loadedCloudUidRef.current === targetCharacterUid) return;
    let cancelled = false;
    (async () => {
      setCloudLoading(true);
      try {
        await loadCharacterFromCloud(targetCharacterUid);
        if (cancelled) return;
      } catch (err) {
        console.error("Erro ao carregar ficha no Firestore:", err);
      } finally {
        if (!cancelled) setCloudLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, authUser, targetCharacterUid, loadCharacterFromCloud]);

  useEffect(() => {
    if (authLoading || !authUser || cloudLoading || !targetCharacterUid) return;
    // Evita sobrescrever a ficha-alvo durante a troca de seleção no modo admin.
    if (loadedCloudUidRef.current !== targetCharacterUid) return;
    if (skipCloudSaveRef.current) {
      skipCloudSaveRef.current = false;
      return;
    }

    const payload = toCloudState(toFirestoreSafeState(buildPersistedState()));
    const timer = setTimeout(() => {
      void setDoc(
        doc(db, "characters", targetCharacterUid),
        {
          ownerUid: targetCharacterUid,
          stateJson: JSON.stringify(payload),
        },
        { merge: true }
      ).catch((err) => console.error("Erro ao salvar ficha no Firestore:", err));
    }, 600);

    return () => clearTimeout(timer);
  }, [authLoading, authUser, cloudLoading, targetCharacterUid, buildPersistedState]);

  const sabedoriaTotal =
    (acertosComuns["Sabedoria"] || ACERTOS_INICIAIS_COMUNS) +
    ACERTOS_CRITICOS_FIXOS;

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
        [attr]: criarDeck(acertosComuns[attr]),
      }));
      setFlipped((prev) => ({ ...prev, [attr]: false }));
      setResultados((prev) => ({ ...prev, [attr]: null }));
    },
    [acertosComuns]
  );

  const handleReembaralharTodos = useCallback(() => {
    setDecks(criarTodosDecks(acertosComuns));
    setFlipped(initFlipped());
    setResultados(initResults());
  }, [acertosComuns]);

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
      setAcertosComuns(novoAcertos);
      setPontosDistribuir((prev) => prev - 1);
      setDecks((prev) => ({
        ...prev,
        [attr]: criarDeck(novoAcertos[attr]),
      }));
      setFlipped((prev) => ({ ...prev, [attr]: false }));
    },
    [acertosComuns, pontosDistribuir]
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
      setAcertosComuns(novoAcertos);
      setPontosDistribuir((prev) => prev + 1);
      setDecks((prev) => ({
        ...prev,
        [attr]: criarDeck(novoAcertos[attr]),
      }));
      setFlipped((prev) => ({ ...prev, [attr]: false }));
    },
    [acertosComuns]
  );

  const handleSubirNivel = useCallback(() => {
    setNivel((prev) => prev + 1);
    setPontosDistribuir((prev) => prev + 2);
  }, []);

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

  const syncAnotacoesFromEditor = useCallback(() => {
    setAnotacoes(anotacoesEditorRef.current?.innerHTML ?? "");
  }, []);

  const syncAnotacoesHorizonteFromEditor = useCallback(() => {
    setAnotacoesHorizonte(anotacoesHorizonteEditorRef.current?.innerHTML ?? "");
  }, []);

  const handleFormatClick = useCallback(
    (
      editor: "caracteristicas" | "horizonte",
      command: "bold" | "italic" | "underline" | "insertUnorderedList"
    ) => {
      document.execCommand(command, false);
      if (editor === "horizonte") {
        syncAnotacoesHorizonteFromEditor();
        anotacoesHorizonteEditorRef.current?.focus();
        return;
      }
      syncAnotacoesFromEditor();
      anotacoesEditorRef.current?.focus();
    },
    [syncAnotacoesFromEditor, syncAnotacoesHorizonteFromEditor]
  );

  const handleFontSizeChange = useCallback(
    (editor: "caracteristicas" | "horizonte", size: string) => {
      if (!size) return;
      document.execCommand("fontSize", false, size);
      if (editor === "horizonte") {
        syncAnotacoesHorizonteFromEditor();
        anotacoesHorizonteEditorRef.current?.focus();
        return;
      }
      syncAnotacoesFromEditor();
      anotacoesEditorRef.current?.focus();
    },
    [syncAnotacoesFromEditor, syncAnotacoesHorizonteFromEditor]
  );

  useEffect(() => {
    const editor = anotacoesEditorRef.current;
    if (!editor) return;
    if (editor.innerHTML !== anotacoes) {
      editor.innerHTML = anotacoes;
    }
  }, [anotacoes]);

  useEffect(() => {
    const editor = anotacoesHorizonteEditorRef.current;
    if (!editor) return;
    if (editor.innerHTML !== anotacoesHorizonte) {
      editor.innerHTML = anotacoesHorizonte;
    }
  }, [anotacoesHorizonte]);

  const totalPlus25 = TODAS_PERICIAS.filter(
    (nome) => pericias[nome].bonus === "plus25"
  ).length;
  const totalPlus15 = TODAS_PERICIAS.filter(
    (nome) => pericias[nome].bonus === "plus15"
  ).length;
  const totalProficientes = TODAS_PERICIAS.filter(
    (nome) => pericias[nome].proficient
  ).length;
  const totalEngGastos = TODAS_PERICIAS.reduce(
    (acc, nome) => acc + (pericias[nome].engStacks || 0),
    0
  );
  const engDisponivel = sabedoriaTotal - totalEngGastos;

  const handleToggleBonusPericia = useCallback(
    (nomePericia: string, bonus: "plus15" | "plus25") => {
      setPericias((prev) => {
        const atual = prev[nomePericia] ?? {
          bonus: "none",
          proficient: false,
          engStacks: 0,
        };
        const total25 = TODAS_PERICIAS.filter((n) => prev[n].bonus === "plus25").length;
        const total15 = TODAS_PERICIAS.filter((n) => prev[n].bonus === "plus15").length;
        const removendoMesmo = atual.bonus === bonus;

        if (!removendoMesmo) {
          if (bonus === "plus25" && atual.bonus !== "plus25" && total25 >= PERICIA_LIMITES.plus25) {
            alert("Limite de 3 perícias com +25% atingido.");
            return prev;
          }
          if (bonus === "plus15" && atual.bonus !== "plus15" && total15 >= PERICIA_LIMITES.plus15) {
            alert("Limite de 3 perícias com +15% atingido.");
            return prev;
          }
        }

        const novoBonus = removendoMesmo ? "none" : bonus;
        const maxStacks = getMaxEngStacksForBonus(novoBonus);
        return {
          ...prev,
          [nomePericia]: {
            ...atual,
            bonus: novoBonus,
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
        bonus: "none",
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
          bonus: "none",
          proficient: false,
          engStacks: 0,
        };
        const totalEngAtual = TODAS_PERICIAS.reduce(
          (acc, nome) => acc + (prev[nome].engStacks || 0),
          0
        );
        if (totalEngAtual >= sabedoriaTotal) {
          alert("Sem pontos de engenhosidade disponíveis.");
          return prev;
        }
        const maxStacks = getMaxEngStacksForBonus(atual.bonus);
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
    [sabedoriaTotal]
  );

  const handleDecrementEngPericia = useCallback((nomePericia: string) => {
    setPericias((prev) => {
      const atual = prev[nomePericia] ?? {
        bonus: "none",
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

  const handleLoginGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      console.error("Erro no login:", err);
      alert("Não foi possível entrar com Google.");
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Erro ao sair:", err);
      alert("Não foi possível sair da conta.");
    }
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
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-slate-700">
            {authLoading
              ? "Verificando login..."
              : authUser
              ? `Logado: ${authUser.email ?? authUser.uid}`
              : "Não logado (usando dados locais)"}
            {authUser && (
              <span className="ml-2 text-xs text-slate-500">
                {cloudLoading ? "Sincronizando..." : "Sincronizado com Firestore"}
              </span>
            )}
            {authUser && (
              <span className="ml-2 text-xs text-slate-500">
                {isAdmin
                  ? `(Admin) editando: ${targetCharacterUid}`
                  : `(UID: ${authUser.uid})`}
              </span>
            )}
          </div>
          {authUser ? (
            <button
              type="button"
              onClick={handleLogout}
              className="py-2 px-4 border-2 border-red-500 bg-red-600 hover:bg-red-700 text-white rounded-full cursor-pointer text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              Sair
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLoginGoogle}
              className="py-2 px-4 border-2 border-blue-500 bg-blue-600 hover:bg-blue-700 text-white rounded-full cursor-pointer text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              Entrar com Google
            </button>
          )}
        </div>
        {authUser && isAdmin && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-700">
              Ficha ativa:
            </span>
            <select
              className="border border-slate-400 rounded px-2 py-1 text-sm min-w-[280px]"
              value={targetCharacterUid ?? authUser.uid}
              onChange={async (e) => {
                const selectedUid = e.target.value;
                loadedCloudUidRef.current = null;
                desiredCharacterUidRef.current = selectedUid;
                setCloudLoading(true);
                setActiveCharacterUid(selectedUid);
                try {
                  await loadCharacterFromCloud(selectedUid);
                } catch (err) {
                  console.error("Erro ao trocar ficha ativa:", err);
                } finally {
                  setCloudLoading(false);
                }
              }}
            >
              {charactersList.map((item) => (
                <option key={item.id} value={item.id}>
                  {(item.personagemNome || "Sem nome")} · {item.id}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-600">
              {charactersList.length} ficha(s) no Firebase
            </span>
            <div className="w-full flex flex-wrap gap-2 mt-1">
              {charactersList.map((item) => (
                <button
                  key={`admin-list-${item.id}`}
                  type="button"
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    (targetCharacterUid ?? authUser.uid) === item.id
                      ? "bg-slate-700 text-white border-slate-700"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                  onClick={async () => {
                    loadedCloudUidRef.current = null;
                    desiredCharacterUidRef.current = item.id;
                    setCloudLoading(true);
                    setActiveCharacterUid(item.id);
                    try {
                      await loadCharacterFromCloud(item.id);
                    } catch (err) {
                      console.error("Erro ao trocar ficha ativa (lista):", err);
                    } finally {
                      setCloudLoading(false);
                    }
                  }}
                >
                  {(item.personagemNome || "Sem nome")} · {item.id}
                </button>
              ))}
            </div>
          </div>
        )}

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
                  onPuxar={() => handlePuxar(attr)}
                  onReembaralhar={() => handleReembaralhar(attr)}
                  onDecrement={() => handleDecrement(attr)}
                  onIncrement={() => handleIncrement(attr)}
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
          <div className="info-section">
            <div className="painel personagem-foto-painel">
              <h2 className="panel-title">
                <i className="fas fa-image"></i> Retrato do Personagem
              </h2>

              <div className="personagem-foto-box">
                {personagemImagem ? (
                  <img
                    src={personagemImagem}
                    alt="Retrato do personagem"
                    className="personagem-foto-img"
                  />
                ) : (
                  <div className="personagem-foto-placeholder">
                    Sem imagem
                  </div>
                )}
              </div>

              <div className="personagem-foto-acoes">
                <button
                  type="button"
                  className="personagem-foto-btn personagem-foto-remover"
                  onClick={() => setPersonagemImagem("")}
                  disabled={!personagemImagem}
                >
                  <i className="fas fa-trash"></i> Remover
                </button>
              </div>
              <div className="personagem-foto-link">
                <input
                  type="url"
                  value={personagemImagemLink}
                  onChange={(e) => setPersonagemImagemLink(e.target.value)}
                  placeholder="Cole um link de imagem (https://...)"
                />
                <button
                  type="button"
                  className="personagem-foto-btn"
                  onClick={handleUsarImagemPorLink}
                >
                  Usar link
                </button>
              </div>
            </div>
            <div className="painel">
              <h2 className="panel-title">
                <i className="fas fa-handshake"></i> Afinidade (Carisma)
              </h2>
              <table className="panel-table">
                <thead>
                  <tr>
                    <th>Pontos de Carisma</th>
                    <th>Afinidade</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>8-10</td>
                    <td>3</td>
                  </tr>
                  <tr>
                    <td>11-14</td>
                    <td>4</td>
                  </tr>
                  <tr>
                    <td>15-18</td>
                    <td>5</td>
                  </tr>
                  <tr>
                    <td>19-20</td>
                    <td>6</td>
                  </tr>
                  <tr>
                    <td>23-26</td>
                    <td>7</td>
                  </tr>
                  <tr>
                    <td>27-30</td>
                    <td>8</td>
                  </tr>
                  <tr>
                    <td>31-40</td>
                    <td>11</td>
                  </tr>
                  <tr>
                    <td>41-48</td>
                    <td>12</td>
                  </tr>
                  <tr>
                    <td>49-57</td>
                    <td>14</td>
                  </tr>
                  <tr>
                    <td>58-67</td>
                    <td>18</td>
                  </tr>
                  <tr>
                    <td>68-79</td>
                    <td>20</td>
                  </tr>
                  <tr>
                    <td>80-90</td>
                    <td>22</td>
                  </tr>
                  <tr>
                    <td>91-100</td>
                    <td>26</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2 text-xs text-gray-600">
                Espaço de artefatos: 1º:1, 2º:3, 3º:4, 4º:7, 5º:11
              </p>
            </div>
          </div>
        </div>

        {/* Painéis inferiores */}
        <div className="paineis-inferiores">
          {/* Tabela de classes */}
          <div className="painel">
            <h2 className="panel-title">
              <i className="fas fa-dragon"></i> Tabela de classes
            </h2>
            <table className="panel-table">
              <thead>
                <tr>
                  <th>Classe</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Variante</td>
                  <td>1</td>
                </tr>
                <tr>
                  <td>Feiticeiro</td>
                  <td>2</td>
                </tr>
                <tr>
                  <td>Santo vivo</td>
                  <td>3</td>
                </tr>
                <tr>
                  <td>Mago</td>
                  <td>4-6</td>
                </tr>
                <tr>
                  <td>Paladino</td>
                  <td>7-8</td>
                </tr>
                <tr>
                  <td>Bruxa</td>
                  <td>9-10</td>
                </tr>
                <tr>
                  <td>Guerreiro</td>
                  <td>10-100</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-600">
              Classes mágicas têm progressão própria.
            </p>
          </div>

          {/* Combate: A Trindade */}
          <div className="painel regras">
            <h2 className="panel-title">
              <i className="fas fa-fist-raised"></i> Combate: A Trindade
            </h2>
            <p>
              <strong>1ª Ação:</strong> Sacar 1 carta (acerto = sucesso).
            </p>
            <p>
              <strong>2ª Ação:</strong> Sacar 2 cartas (priorizar erro:
              qualquer erro anula).
            </p>
            <p>
              <strong>3ª Ação:</strong> Sacar 3 cartas (priorizar erro).
            </p>
            <p>
              <strong>Esquiva:</strong> d100: 1ª total, 2ª metade, 3ª quarto.
            </p>
            <p>
              <strong>Mitigação:</strong> usar ação para movimento/interação
              sem teste.
            </p>
            <p>
              <strong>Iniciativa:</strong> saque do deck de Destreza.
            </p>
          </div>

          {/* Horizonte de Eventos */}
          <div className="painel regras">
            <h2 className="panel-title">
              <i className="fas fa-hourglass-half"></i> Horizonte de Eventos
            </h2>
            <p>O tempo é recurso. Mestre define custo antes do teste.</p>
            <p>
              <strong>Pressa:</strong> metade do tempo, penalidade (priorizar
              erro ou -50% perícia).
            </p>
            <p>
              <strong>Cuidado:</strong> dobro do tempo, vantagem.
            </p>
            <p>Falha: tempo passa, nova tentativa custa mais.</p>
          </div>

          <div className="painel">
            <h2 className="panel-title">
              <i className="fas fa-sticky-note"></i> Anotações
            </h2>
            <div className="anotacoes-toolbar">
              <button
                type="button"
                onClick={() => handleFormatClick("horizonte", "bold")}
                title="Negrito"
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                onClick={() => handleFormatClick("horizonte", "italic")}
                title="Itálico"
              >
                <em>I</em>
              </button>
              <button
                type="button"
                onClick={() => handleFormatClick("horizonte", "underline")}
                title="Sublinhado"
              >
                <u>U</u>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleFormatClick("horizonte", "insertUnorderedList")
                }
                title="Lista"
              >
                • Lista
              </button>
              <select
                defaultValue=""
                onChange={(e) => {
                  handleFontSizeChange("horizonte", e.target.value);
                  e.currentTarget.value = "";
                }}
                title="Tamanho da fonte"
              >
                <option value="" disabled>
                  Fonte
                </option>
                <option value="1">Pequena</option>
                <option value="2">Normal</option>
                <option value="3">Média</option>
                <option value="4">Grande</option>
                <option value="5">Muito grande</option>
              </select>
            </div>
            <div
              ref={anotacoesHorizonteEditorRef}
              className="anotacoes-editor"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Registre custos de tempo, consequências e urgências da cena..."
              onInput={syncAnotacoesHorizonteFromEditor}
              onBlur={syncAnotacoesHorizonteFromEditor}
            />
          </div>

          {/* Perícias & Engenhosidade */}
          <div className="painel pericias-painel">
            <h2 className="panel-title">
              <i className="fas fa-dice-d20"></i> Perícias &amp; Engenhosidade
              (d100)
            </h2>
            <p className="text-sm">
              <strong>Base:</strong> Todas as perícias começam com 15%.
              Personagem inicia escolhendo:
            </p>
            <ul className="text-sm list-disc ml-5 my-2 space-y-1">
              <li>
                3 perícias para aumentar <strong>+25%</strong> (ficam com 40%)
              </li>
              <li>
                3 perícias para aumentar <strong>+15%</strong> (ficam com 30%)
              </li>
              <li>
                2 perícias para ser <strong>proficiente</strong> (vantagem: rola
                duas vezes e fica com o melhor resultado)
              </li>
            </ul>
            <p className="text-sm">
              <strong>Engenhosidade:</strong> Cada ponto de Sabedoria (acerto)
              dá <strong>4%</strong> para distribuir em qualquer perícia (máximo
              80% por perícia). Disponível:{" "}
              <strong>{Math.max(0, engDisponivel)}</strong> / {sabedoriaTotal}{" "}
              (gastos: {totalEngGastos}).
            </p>

            <div className="pericias-contadores">
              <span className="contador contador-25">
                +25 ({totalPlus25}/{PERICIA_LIMITES.plus25})
              </span>
              <span className="contador contador-15">
                +15 ({totalPlus15}/{PERICIA_LIMITES.plus15})
              </span>
              <span className="contador contador-prof">
                PROF ({totalProficientes}/{PERICIA_LIMITES.proficient})
              </span>
              <span className="contador contador-eng">
                ENG ({totalEngGastos}/{sabedoriaTotal})
              </span>
            </div>

            <div className="pericias-grid">
              {Object.entries(PERICIAS_POR_CATEGORIA).map(([categoria, lista]) => (
                <div key={categoria}>
                  <h3 className="text-base font-bold border-b border-gray-400 pb-1 mb-2">
                    {categoria}
                  </h3>
                  <ul className="list-none p-0 m-0">
                    {lista.map((nomePericia) => {
                      const mark = pericias[nomePericia];
                      const engBonus = (mark.engStacks || 0) * 4;
                      const percentual =
                        BASE_PERICIA +
                        (mark.bonus === "plus25" ? 25 : mark.bonus === "plus15" ? 15 : 0) +
                        engBonus;
                      return (
                        <li key={nomePericia} className="pericia-item">
                          <div className="pericia-linha-topo">
                            <span className="pericia-nome">{nomePericia}</span>
                            <span className="pericia-percentual">{percentual}%</span>
                          </div>
                          <div className="pericia-marcacoes">
                            <button
                              type="button"
                              className={`pericia-tag-btn ${
                                mark.bonus === "plus25" ? "ativo-25" : ""
                              }`}
                              onClick={() =>
                                handleToggleBonusPericia(nomePericia, "plus25")
                              }
                            >
                              +25
                            </button>
                            <button
                              type="button"
                              className={`pericia-tag-btn ${
                                mark.bonus === "plus15" ? "ativo-15" : ""
                              }`}
                              onClick={() =>
                                handleToggleBonusPericia(nomePericia, "plus15")
                              }
                            >
                              +15
                            </button>
                            <button
                              type="button"
                              className={`pericia-tag-btn ${
                                mark.proficient ? "ativo-prof" : ""
                              }`}
                              onClick={() =>
                                handleToggleProficienciaPericia(nomePericia)
                              }
                            >
                              PROF
                            </button>
                            <button
                              type="button"
                              className="pericia-tag-btn ativo-eng"
                              onClick={() => handleIncrementEngPericia(nomePericia)}
                              disabled={engDisponivel <= 0}
                              title="Adicionar +4% de engenhosidade"
                            >
                              +ENG
                            </button>
                            <button
                              type="button"
                              className="pericia-tag-btn"
                              onClick={() => handleDecrementEngPericia(nomePericia)}
                              disabled={(mark.engStacks || 0) <= 0}
                              title="Remover +4% de engenhosidade"
                            >
                              -ENG
                            </button>
                          </div>
                          <div className="pericia-badges">
                            {mark.bonus === "plus25" && (
                              <span className="badge badge-25">+25%</span>
                            )}
                            {mark.bonus === "plus15" && (
                              <span className="badge badge-15">+15%</span>
                            )}
                            {mark.proficient && (
                              <span className="badge badge-prof">★ Vantagem</span>
                            )}
                            {(mark.engStacks || 0) > 0 && (
                              <span className="badge badge-eng">
                                ENG x{mark.engStacks} (+{engBonus}%)
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <div className="bg-gray-200 p-2 rounded mt-3 text-sm">
              <i className="fas fa-info-circle"></i>{" "}
              <strong>Lembrete:</strong> Perícias são resolvidas com d100
              (rolar abaixo do valor). Dificuldade pode ser reduzida para
              metade ou quarto do valor em tarefas complexas.
            </div>
          </div>

          <div className="painel anotacoes-painel">
            <h2 className="panel-title">
              <i className="fas fa-pen"></i> Características do personagem
            </h2>
            <div className="anotacoes-toolbar">
              <button
                type="button"
                onClick={() => handleFormatClick("caracteristicas", "bold")}
                title="Negrito"
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                onClick={() => handleFormatClick("caracteristicas", "italic")}
                title="Itálico"
              >
                <em>I</em>
              </button>
              <button
                type="button"
                onClick={() => handleFormatClick("caracteristicas", "underline")}
                title="Sublinhado"
              >
                <u>U</u>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleFormatClick("caracteristicas", "insertUnorderedList")
                }
                title="Lista"
              >
                • Lista
              </button>
              <select
                defaultValue=""
                onChange={(e) => {
                  handleFontSizeChange("caracteristicas", e.target.value);
                  e.currentTarget.value = "";
                }}
                title="Tamanho da fonte"
              >
                <option value="" disabled>
                  Fonte
                </option>
                <option value="1">Pequena</option>
                <option value="2">Normal</option>
                <option value="3">Média</option>
                <option value="4">Grande</option>
                <option value="5">Muito grande</option>
              </select>
            </div>
            <div
              ref={anotacoesEditorRef}
              className="anotacoes-editor"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Escreva observações da sessão, ideias de cena, nomes, pistas..."
              onInput={syncAnotacoesFromEditor}
              onBlur={syncAnotacoesFromEditor}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

