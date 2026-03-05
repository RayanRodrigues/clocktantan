interface LifePanelProps {
  vidaAtual: number;
  vidaMaxima: number;
  vidaPercentual: number;
  vidaAjusteRapido: string;
  caModificador: number;
  onVidaAjusteRapidoChange: (value: string) => void;
  onAplicarAjusteVida: () => void;
  onSetVidaAtual: (value: number) => void;
  onSetVidaCheia: () => void;
  onSetCaModificador: (value: number) => void;
}

export function LifePanel({
  vidaAtual,
  vidaMaxima,
  vidaPercentual,
  vidaAjusteRapido,
  caModificador,
  onVidaAjusteRapidoChange,
  onAplicarAjusteVida,
  onSetVidaAtual,
  onSetVidaCheia,
  onSetCaModificador,
}: LifePanelProps) {
  return (
    <div className="vida-painel">
      <div className="vida-topo">
        <span className="vida-titulo">❤️ Vida</span>
        <span className="vida-valor">
          {vidaAtual} / {vidaMaxima}
        </span>
        <div className="ca-controles" role="group" aria-label="Classe de Armadura">
          <span className="ca-label">CA</span>
          {([-2, -1, 0, 1, 2] as const).map((valor) => (
            <button
              key={`ca-${valor}`}
              type="button"
              className={`ca-opcao ${caModificador === valor ? "is-active" : ""}`}
              onClick={() => onSetCaModificador(valor)}
              aria-pressed={caModificador === valor}
            >
              {valor > 0 ? `+${valor}` : `${valor}`}
            </button>
          ))}
        </div>
      </div>
      <div className="vida-barra">
        <div
          className="vida-barra-preenchimento"
          style={{ width: `${vidaPercentual}%` }}
        />
      </div>
      <div className="vida-acoes">
        <button type="button" onClick={onSetVidaCheia}>
          Vida cheia
        </button>
        <input
          type="text"
          className="vida-ajuste-input"
          value={vidaAjusteRapido}
          onChange={(e) => onVidaAjusteRapidoChange(e.target.value)}
          placeholder="+2 ou -3"
          aria-label="Ajuste rápido de vida"
          onKeyDown={(e) => {
            if (e.key === "Enter") onAplicarAjusteVida();
          }}
        />
        <button type="button" onClick={onAplicarAjusteVida}>
          Aplicar
        </button>
        <input
          type="number"
          min={0}
          max={vidaMaxima}
          value={vidaAtual}
          onChange={(e) => {
            const next = Number.parseInt(e.target.value || "0", 10);
            onSetVidaAtual(
              Number.isFinite(next) ? Math.max(0, Math.min(vidaMaxima, next)) : 0
            );
          }}
          aria-label="Vida atual"
        />
      </div>
      <div className="vida-meta">Constituição: cada acerto vale 4 de vida.</div>
    </div>
  );
}
