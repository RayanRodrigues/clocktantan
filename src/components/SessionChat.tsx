export interface SessionChatMessage {
  id: string;
  type: "chat" | "roll";
  senderName: string;
  text: string;
  createdAtLabel: string;
}

interface SessionChatProps {
  title?: string;
  messages: SessionChatMessage[];
  draft: string;
  disabled?: boolean;
  loading?: boolean;
  canClear?: boolean;
  clearing?: boolean;
  collapsed?: boolean;
  showToggle?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onClear?: () => void;
}

export function SessionChat({
  title = "Chat da mesa",
  messages,
  draft,
  disabled = false,
  loading = false,
  canClear = false,
  clearing = false,
  collapsed = false,
  showToggle = true,
  onCollapsedChange,
  onDraftChange,
  onSend,
  onClear,
}: SessionChatProps) {
  return (
    <section className={`session-chat painel ${collapsed ? "is-collapsed" : ""}`}>
      <div className="session-chat-header">
        <h3 className="panel-title">
          <i className="fas fa-comments"></i> {title}
        </h3>
        <div className="session-chat-header-actions">
          {canClear && (
            <button
              type="button"
              className="session-chat-clear-btn"
              onClick={onClear}
              disabled={clearing}
            >
              {clearing ? "Limpando..." : "Limpar chat"}
            </button>
          )}
          {showToggle && (
            <button
              type="button"
              className="session-chat-toggle-btn"
              onClick={() => onCollapsedChange?.(!collapsed)}
              title={collapsed ? "Expandir chat" : "Minimizar chat"}
              aria-label={collapsed ? "Expandir chat" : "Minimizar chat"}
            >
              {collapsed ? "Expandir" : "Minimizar"}
            </button>
          )}
        </div>
      </div>
      {!collapsed && (
        <>
          <div className="session-chat-feed">
            {loading && <div className="session-chat-system">Carregando mensagens...</div>}
            {!loading && messages.length === 0 && (
              <div className="session-chat-system">Sem mensagens ainda.</div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`session-chat-msg ${msg.type === "roll" ? "is-roll" : ""}`}>
                <div className="session-chat-msg-meta">
                  <strong>{msg.senderName}</strong>
                  <span>{msg.createdAtLabel}</span>
                </div>
                <div className="session-chat-msg-text">{msg.text}</div>
              </div>
            ))}
          </div>
          <div className="session-chat-compose">
            <input
              type="text"
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder={disabled ? "Entre com Google para usar o chat" : "Digite uma mensagem..."}
              maxLength={300}
              disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSend();
              }}
            />
            <button type="button" onClick={onSend} disabled={disabled || !draft.trim()}>
              Enviar
            </button>
          </div>
        </>
      )}
    </section>
  );
}
