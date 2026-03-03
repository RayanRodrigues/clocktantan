import { useCallback, useEffect, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  loadPersistedState,
  normalizePersistedState,
  toCloudState,
  toFirestoreSafeState,
  type PersistedState,
} from "../utils/gameState";

export interface CharacterListItem {
  id: string;
  ownerUid: string;
  personagemNome: string;
}

interface UseFirebaseCharacterSyncParams {
  buildPersistedState: () => PersistedState;
  applyPersistedState: (state: PersistedState) => void;
}

export function useFirebaseCharacterSync({
  buildPersistedState,
  applyPersistedState,
}: UseFirebaseCharacterSyncParams) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [charactersList, setCharactersList] = useState<CharacterListItem[]>([]);
  const [activeCharacterUid, setActiveCharacterUid] = useState<string | null>(
    null
  );

  const skipCloudSaveRef = useRef(false);
  const loadedCloudUidRef = useRef<string | null>(null);
  const desiredCharacterUidRef = useRef<string | null>(null);

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

  const loadCharacterFromCloud = useCallback(
    async (uid: string) => {
      if (!authUser) return;

      const ref = doc(db, "characters", uid);
      const snap = await getDoc(ref);
      if (desiredCharacterUidRef.current && desiredCharacterUidRef.current !== uid) {
        return;
      }

      if (snap.exists()) {
        const data = snap.data() as {
          state?: Partial<PersistedState>;
          stateJson?: string;
        };

        if (
          typeof data.stateJson === "string" &&
          data.stateJson.trim().length > 0
        ) {
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
  }, [applyPersistedState]);

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

  const handleSelectAdminCharacter = useCallback(
    async (selectedUid: string) => {
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
    },
    [loadCharacterFromCloud]
  );

  const handleCreateAdminCharacter = useCallback(
    async (personagemNome: string) => {
      if (!authUser || !isAdmin) return null;

      const nomeLimpo = personagemNome.trim();
      const baseState = normalizePersistedState({
        personagemNome: nomeLimpo,
      });
      const payload = toCloudState(toFirestoreSafeState(baseState));
      const ref = doc(collection(db, "characters"));

      try {
        await setDoc(ref, {
          ownerUid: authUser.uid,
          stateJson: JSON.stringify(payload),
        });
      } catch (err) {
        console.error("Erro ao criar ficha (admin):", err);
        throw err;
      }

      loadedCloudUidRef.current = null;
      desiredCharacterUidRef.current = ref.id;
      setActiveCharacterUid(ref.id);
      setCloudLoading(true);
      try {
        await loadCharacterFromCloud(ref.id);
      } finally {
        setCloudLoading(false);
      }

      return ref.id;
    },
    [authUser, isAdmin, loadCharacterFromCloud]
  );

  const handleDeleteAdminCharacter = useCallback(
    async (characterUid: string) => {
      if (!authUser || !isAdmin) return;
      if (!characterUid) return;

      await deleteDoc(doc(db, "characters", characterUid));

      if (activeCharacterUid === characterUid) {
        const fallbackUid =
          charactersList.find((item) => item.id !== characterUid)?.id ?? authUser.uid;
        loadedCloudUidRef.current = null;
        desiredCharacterUidRef.current = fallbackUid;
        setActiveCharacterUid(fallbackUid);
        try {
          await loadCharacterFromCloud(fallbackUid);
        } catch (err) {
          console.error("Erro ao carregar ficha após exclusão:", err);
        }
      }
    },
    [authUser, isAdmin, activeCharacterUid, charactersList, loadCharacterFromCloud]
  );

  return {
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
    handleDeleteAdminCharacter,
  };
}
