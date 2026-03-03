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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState("");

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
            {(item.personagemNome || "Sem nome") + " - " + item.id}
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
        onClick={() => {
          setNewCharacterName("");
          setShowCreateModal(true);
        }}
      >
        {creating ? "Criando..." : "+ Criar ficha"}
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
            {(item.personagemNome || "Sem nome") + " - " + item.id}
          </button>
        ))}
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
                    await onCreateCharacter(nome);
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
