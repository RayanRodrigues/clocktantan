import type { User } from "firebase/auth";

interface AuthBarProps {
  authLoading: boolean;
  authUser: User | null;
  cloudLoading: boolean;
  isAdmin: boolean;
  targetCharacterUid: string | null;
  onLoginGoogle: () => void;
  onLogout: () => void;
}

export function AuthBar({
  authLoading,
  authUser,
  cloudLoading,
  isAdmin,
  targetCharacterUid,
  onLoginGoogle,
  onLogout,
}: AuthBarProps) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="auth-status">
        {authLoading
          ? "Verificando login..."
          : authUser
          ? `Logado: ${authUser.email ?? authUser.uid}`
          : "Não logado (usando dados locais)"}
        {authUser && (
          <span className="auth-status-meta">
            {cloudLoading ? "Sincronizando..." : "Sincronizado com Firestore"}
          </span>
        )}
        {authUser && (
          <span className="auth-status-meta">
            {isAdmin ? `(Admin) editando: ${targetCharacterUid}` : `(UID: ${authUser.uid})`}
          </span>
        )}
      </div>
      {authUser ? (
        <button
          type="button"
          onClick={onLogout}
          className="py-2 px-4 border-2 border-red-500 bg-red-600 hover:bg-red-700 text-white rounded-full cursor-pointer text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
        >
          Sair
        </button>
      ) : (
        <button
          type="button"
          onClick={onLoginGoogle}
          className="py-2 px-4 border-2 border-blue-500 bg-blue-600 hover:bg-blue-700 text-white rounded-full cursor-pointer text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-md"
        >
          Entrar com Google
        </button>
      )}
    </div>
  );
}
