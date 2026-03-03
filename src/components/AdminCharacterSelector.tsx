import { useState } from "react";
import type { User } from "firebase/auth";
import type { CharacterListItem } from "../hooks/useFirebaseCharacterSync";

interface AdminCharacterSelectorProps {
  authUser: User | null;
  isAdmin: boolean;
  targetCharacterUid: string | null;
  charactersList: CharacterListItem[];
  onSelectCharacter: (uid: string) => void | Promise<void>;
  onCreateCharacter: (nome: string) => void | Promise<unknown>;
  onDeleteCharacter: (uid: string) => void | Promise<unknown>;
}

export function AdminCharacterSelector({
  authUser,
  isAdmin,
  targetCharacterUid,
  charactersList,
  onSelectCharacter,
  onCreateCharacter,
  onDeleteCharacter,
}: AdminCharacterSelectorProps) {
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!authUser || !isAdmin) return null;
  const activeUid = targetCharacterUid ?? authUser.uid;
  const activeItem = charactersList.find((item) => item.id === activeUid);
  const activeName = activeItem?.personagemNome || "Sem nome";

  return (
    <div className="admin-selector">
      <span className="admin-selector-label">Ficha ativa:</span>
      <select
        className="admin-selector-select"
        value={activeUid}
        onChange={(e) => {
          void onSelectCharacter(e.target.value);
        }}
      >
        {charactersList.map((item) => (
          <option key={item.id} value={item.id}>
            {(item.personagemNome || "Sem nome")} · {item.id}
          </option>
        ))}
      </select>
      <span className="admin-selector-meta">
        {charactersList.length} ficha(s) no Firebase
      </span>
      <button
        type="button"
        className="admin-selector-create-btn"
        disabled={creating}
        onClick={async () => {
          const nome = window.prompt("Nome da nova ficha:");
          if (!nome || !nome.trim()) return;
          setCreating(true);
          try {
            await onCreateCharacter(nome);
          } catch (err) {
            console.error("Erro ao criar ficha:", err);
            alert(
              "Não foi possível criar a ficha no Firebase. Verifique as regras do Firestore para permitir CREATE para admin."
            );
          } finally {
            setCreating(false);
          }
        }}
      >
        {creating ? "Criando..." : "+ Criar ficha"}
      </button>
      <button
        type="button"
        className="admin-selector-delete-btn"
        disabled={deleting || charactersList.length === 0}
        onClick={async () => {
          if (!activeUid) return;
          const ok = window.confirm(
            `Excluir a ficha ativa?\n\n${activeName} · ${activeUid}\n\nEssa ação não pode ser desfeita.`
          );
          if (!ok) return;
          setDeleting(true);
          try {
            await onDeleteCharacter(activeUid);
          } catch (err) {
            console.error("Erro ao excluir ficha:", err);
            alert("Não foi possível excluir a ficha no Firebase.");
          } finally {
            setDeleting(false);
          }
        }}
      >
        {deleting ? "Excluindo..." : "Excluir ficha ativa"}
      </button>
      <div className="admin-selector-list">
        {charactersList.map((item) => (
          <button
            key={`admin-list-${item.id}`}
            type="button"
            className={`admin-selector-item ${
              (targetCharacterUid ?? authUser.uid) === item.id ? "is-active" : ""
            }`}
            onClick={() => {
              void onSelectCharacter(item.id);
            }}
          >
            {(item.personagemNome || "Sem nome")} · {item.id}
          </button>
        ))}
      </div>
    </div>
  );
}
