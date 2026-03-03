import { useState } from "react";
import type { User } from "firebase/auth";
import type { CharacterListItem } from "../hooks/useFirebaseCharacterSync";

interface AdminCharacterSelectorProps {
  authUser: User | null;
  isAdmin: boolean;
  targetCharacterUid: string | null;
  charactersList: CharacterListItem[];
  onSelectCharacter: (uid: string) => void | Promise<void>;
  onCreateCharacter: (nome: string, type: "player" | "npc") => void | Promise<unknown>;
  onUpdateCharacterType: (uid: string, type: "player" | "npc") => void | Promise<unknown>;
  onDeleteCharacter: (uid: string) => void | Promise<unknown>;
}

export function AdminCharacterSelector({
  authUser,
  isAdmin,
  targetCharacterUid,
  charactersList,
  onSelectCharacter,
  onCreateCharacter,
  onUpdateCharacterType,
  onDeleteCharacter,
}: AdminCharacterSelectorProps) {
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingType, setUpdatingType] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState("");
  const [newCharacterType, setNewCharacterType] = useState<"player" | "npc">("player");
  const [filterType, setFilterType] = useState<"all" | "player" | "npc">("all");

  if (!authUser || !isAdmin) return null;

  const activeUid = targetCharacterUid ?? authUser.uid;
  const activeItem = charactersList.find((item) => item.id === activeUid);
  const activeName = activeItem?.personagemNome || "Sem nome";
  const activeType = activeItem?.type ?? "player";
  const filteredCharacters = charactersList.filter((item) => {
    if (filterType === "all") return true;
    return item.type === filterType;
  });
  const playerCount = charactersList.filter((item) => item.type === "player").length;
  const npcCount = charactersList.filter((item) => item.type === "npc").length;
  const selectOptions = filteredCharacters.some((item) => item.id === activeUid)
    ? filteredCharacters
    : activeItem
    ? [activeItem, ...filteredCharacters]
    : filteredCharacters;

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
        {selectOptions.map((item) => (
          <option key={item.id} value={item.id}>
            {(item.personagemNome || "Sem nome") +
              " - " +
              item.id +
              " [" +
              item.type.toUpperCase() +
              "]"}
          </option>
        ))}
      </select>
      <span className="admin-selector-meta">
        {charactersList.length} ficha(s) no Firebase · Player: {playerCount} · NPC: {npcCount}
      </span>

      <button
        type="button"
        className="admin-selector-create-btn"
        disabled={creating}
        onClick={() => {
          setNewCharacterName("");
          setNewCharacterType("player");
          setShowCreateModal(true);
        }}
      >
        {creating ? "Criando..." : "+ Criar ficha"}
      </button>
      <button
        type="button"
        className="admin-selector-type-btn"
        disabled={updatingType || charactersList.length === 0}
        onClick={async () => {
          if (!activeUid) return;
          const nextType = activeType === "player" ? "npc" : "player";
          setUpdatingType(true);
          try {
            await onUpdateCharacterType(activeUid, nextType);
          } catch (err) {
            console.error("Erro ao atualizar tipo da ficha:", err);
            alert("Nao foi possivel atualizar o tipo da ficha.");
          } finally {
            setUpdatingType(false);
          }
        }}
      >
        {updatingType
          ? "Atualizando tipo..."
          : `Tipo: ${activeType.toUpperCase()} (trocar)`}
      </button>

      <button
        type="button"
        className="admin-selector-delete-btn"
        disabled={deleting || charactersList.length === 0}
        onClick={() => {
          setShowDeleteModal(true);
        }}
      >
        {deleting ? "Excluindo..." : "Excluir ficha ativa"}
      </button>

      <div className="admin-selector-filters">
        <button
          type="button"
          className={`admin-filter-btn ${filterType === "all" ? "is-active" : ""}`}
          onClick={() => setFilterType("all")}
        >
          Todos ({charactersList.length})
        </button>
        <button
          type="button"
          className={`admin-filter-btn ${filterType === "player" ? "is-active" : ""}`}
          onClick={() => setFilterType("player")}
        >
          Players ({playerCount})
        </button>
        <button
          type="button"
          className={`admin-filter-btn ${filterType === "npc" ? "is-active" : ""}`}
          onClick={() => setFilterType("npc")}
        >
          NPCs ({npcCount})
        </button>
      </div>

      <div className="admin-selector-list">
        {filteredCharacters.map((item) => (
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
            {(item.personagemNome || "Sem nome") +
              " - " +
              item.id +
              " [" +
              item.type.toUpperCase() +
              "]"}
          </button>
        ))}
        {filteredCharacters.length === 0 && (
          <span className="admin-selector-empty">Nenhuma ficha neste filtro.</span>
        )}
      </div>

      {showCreateModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" role="dialog" aria-modal="true">
            <h3 className="admin-modal-title">Criar nova ficha</h3>
            <p className="admin-modal-text">Digite o nome da nova ficha.</p>
            <input
              type="text"
              className="admin-modal-input"
              value={newCharacterName}
              onChange={(e) => setNewCharacterName(e.target.value)}
              placeholder="Ex.: Arion"
              maxLength={60}
            />
            <label className="admin-modal-type-label" htmlFor="admin-new-type">
              Tipo da ficha
            </label>
            <select
              id="admin-new-type"
              className="admin-modal-select"
              value={newCharacterType}
              onChange={(e) => {
                const next = e.target.value === "npc" ? "npc" : "player";
                setNewCharacterType(next);
              }}
            >
              <option value="player">Player</option>
              <option value="npc">NPC</option>
            </select>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-cancel"
                disabled={creating}
                onClick={() => setShowCreateModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="admin-modal-confirm"
                disabled={creating}
                onClick={async () => {
                  const nome = newCharacterName.trim();
                  if (!nome) {
                    alert("Informe um nome para a ficha.");
                    return;
                  }
                  setCreating(true);
                  try {
                    await onCreateCharacter(nome, newCharacterType);
                    setShowCreateModal(false);
                  } catch (err) {
                    console.error("Erro ao criar ficha:", err);
                    alert(
                      "Nao foi possivel criar a ficha no Firebase. Verifique as regras do Firestore para permitir CREATE para admin."
                    );
                  } finally {
                    setCreating(false);
                  }
                }}
              >
                {creating ? "Criando..." : "Criar ficha"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" role="dialog" aria-modal="true">
            <h3 className="admin-modal-title">Excluir ficha</h3>
            <p className="admin-modal-text">{activeName + " - " + activeUid}</p>
            <p className="admin-modal-text admin-modal-warning">
              Essa acao nao pode ser desfeita.
            </p>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-cancel"
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="admin-modal-delete"
                disabled={deleting}
                onClick={async () => {
                  if (!activeUid) return;
                  setDeleting(true);
                  try {
                    await onDeleteCharacter(activeUid);
                    setShowDeleteModal(false);
                  } catch (err) {
                    console.error("Erro ao excluir ficha:", err);
                    alert("Nao foi possivel excluir a ficha no Firebase.");
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? "Excluindo..." : "Excluir ficha"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
