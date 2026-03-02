import type { User } from "firebase/auth";
import type { CharacterListItem } from "../hooks/useFirebaseCharacterSync";

interface AdminCharacterSelectorProps {
  authUser: User | null;
  isAdmin: boolean;
  targetCharacterUid: string | null;
  charactersList: CharacterListItem[];
  onSelectCharacter: (uid: string) => void | Promise<void>;
}

export function AdminCharacterSelector({
  authUser,
  isAdmin,
  targetCharacterUid,
  charactersList,
  onSelectCharacter,
}: AdminCharacterSelectorProps) {
  if (!authUser || !isAdmin) return null;

  return (
    <div className="mb-4 flex items-center gap-2 flex-wrap">
      <span className="text-sm font-semibold text-slate-700">Ficha ativa:</span>
      <select
        className="border border-slate-400 rounded px-2 py-1 text-sm min-w-[280px]"
        value={targetCharacterUid ?? authUser.uid}
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
