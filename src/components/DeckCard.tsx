import { type CSSProperties } from "react";
import {
  ACERTOS_CRITICOS_FIXOS,
  ATTR_THEMES,
  ERROS_COMUNS_FIXOS,
  ERROS_CRITICOS_FIXOS,
  type Card,
} from "../utils/gameState";

function calcularBonus(attr: string, acertosComuns: number) {
  const totalAcertos = acertosComuns + ACERTOS_CRITICOS_FIXOS;
  switch (attr) {
    case "Força":
      return { dano: Math.floor(totalAcertos / 3), carga: totalAcertos };
    case "Destreza":
      return { esquiva: Math.min(totalAcertos, 75) };
    case "Constituição":
      return { vida: totalAcertos * 4 };
    case "Inteligência":
      return {
        investigacao: totalAcertos,
        progresso: Math.floor(totalAcertos / 10),
      };
    case "Sabedoria":
      return {
        percepcao: totalAcertos,
        engenhosidade: totalAcertos,
        transformacoes: Math.floor(totalAcertos / 10),
      };
    case "Carisma": {
      let afinidade = 0;
      if (totalAcertos >= 91) afinidade = 26;
      else if (totalAcertos >= 80) afinidade = 22;
      else if (totalAcertos >= 68) afinidade = 20;
      else if (totalAcertos >= 58) afinidade = 18;
      else if (totalAcertos >= 49) afinidade = 14;
      else if (totalAcertos >= 41) afinidade = 12;
      else if (totalAcertos >= 31) afinidade = 11;
      else if (totalAcertos >= 27) afinidade = 8;
      else if (totalAcertos >= 23) afinidade = 7;
      else if (totalAcertos >= 19) afinidade = 6;
      else if (totalAcertos >= 15) afinidade = 5;
      else if (totalAcertos >= 11) afinidade = 4;
      else if (totalAcertos >= 8) afinidade = 3;
      return { astucia: totalAcertos, afinidade };
    }
    default:
      return {};
  }
}

function getBonusContent(
  attr: string,
  bonus: Record<string, number>
): React.ReactNode {
  switch (attr) {
    case "Força":
      return (
        <>
          <p>⚔️ Dano: <strong>+{bonus.dano}</strong></p>
          <p>📦 Carga: <strong>{bonus.carga}kg</strong></p>
        </>
      );
    case "Destreza":
      return <p>💨 Esquiva: <strong>{bonus.esquiva}%</strong></p>;
    case "Constituição":
      return <p>❤️ Vida: <strong>+{bonus.vida}</strong></p>;
    case "Inteligência":
      return (
        <>
          <p>🔍 Investigação: <strong>{bonus.investigacao}%</strong></p>
          <p>📈 Progresso: <strong>+{bonus.progresso}</strong></p>
        </>
      );
    case "Sabedoria":
      return (
        <>
          <p>👁️ Percepção: <strong>{bonus.percepcao}%</strong></p>
          <p>🧠 Engenh.: <strong>{bonus.engenhosidade}</strong></p>
          <p>✨ Críticos: <strong>+{bonus.transformacoes}</strong></p>
        </>
      );
    case "Carisma":
      return (
        <>
          <p>🎭 Astúcia: <strong>{bonus.astucia}%</strong></p>
          <p>🔮 Afinidade: <strong>{bonus.afinidade}</strong></p>
        </>
      );
    default:
      return null;
  }
}

function getResultInfo(card: Card): {
  icon: string;
  iconClass: string;
  text: string;
  textColor: string;
  glowClass: string;
  bgColor: string;
} {
  switch (card.tipo) {
    case "acerto":
      return {
        icon: "fa-check-circle",
        iconClass: "text-green-500",
        text: "ACERTO",
        textColor: "#16a34a",
        glowClass: "glow-acerto",
        bgColor: "#f0fdf4",
      };
    case "acerto_critico":
      return {
        icon: "fa-star",
        iconClass: "text-yellow-500",
        text: "ACERTO CRÍTICO",
        textColor: "#ca8a04",
        glowClass: "glow-acerto-critico",
        bgColor: "#fefce8",
      };
    case "erro":
      return {
        icon: "fa-times-circle",
        iconClass: "text-red-500",
        text: "ERRO",
        textColor: "#dc2626",
        glowClass: "glow-erro",
        bgColor: "#fef2f2",
      };
    case "erro_critico":
      return {
        icon: "fa-skull-crossbones",
        iconClass: "text-red-900",
        text: "ERRO CRÍTICO",
        textColor: "#7f1d1d",
        glowClass: "glow-erro-critico",
        bgColor: "#fef2f2",
      };
  }
}

export function DeckCard({
  attr,
  deck,
  acertosComuns,
  resultado,
  pontosDistribuir,
  isFlipped,
  criticosExtrasNoAtributo,
  transformacoesCriticoDisponiveis,
  mostrarControlesEdicao,
  onPuxar,
  onReembaralhar,
  onDecrement,
  onIncrement,
  onConverterAcertoEmCritico,
  onFlipBack,
}: {
  attr: string;
  deck: Card[];
  acertosComuns: number;
  resultado: Card | null;
  pontosDistribuir: number;
  isFlipped: boolean;
  criticosExtrasNoAtributo: number;
  transformacoesCriticoDisponiveis: number;
  mostrarControlesEdicao: boolean;
  onPuxar: () => void;
  onReembaralhar: () => void;
  onDecrement: () => void;
  onIncrement: () => void;
  onConverterAcertoEmCritico: () => void;
  onFlipBack: () => void;
}) {
  const theme = ATTR_THEMES[attr];
  const acertosNo = deck.filter(
    (c) => c.tipo === "acerto" || c.tipo === "acerto_critico"
  ).length;
  const errosNo = deck.filter(
    (c) => c.tipo === "erro" || c.tipo === "erro_critico"
  ).length;
  const total = deck.length;
  const bonus = calcularBonus(attr, acertosComuns) as Record<string, number>;

  const cssVars = {
    "--card-gradient": `linear-gradient(135deg, ${theme.gradientFrom}, ${theme.gradientTo})`,
    "--card-border": theme.borderColor,
    "--card-bg": theme.bgLight,
    "--card-bonus-bg": theme.bonusBg,
    "--card-pattern": theme.pattern,
  } as CSSProperties;

  const resultInfo = resultado ? getResultInfo(resultado) : null;

  return (
    <div className="card-wrapper" style={cssVars}>
      <div className="flip-card">
        <div className={`flip-card-inner ${isFlipped ? "flipped" : ""}`}>
          <div className="flip-card-front">
            <div className="card-face">
              <div className="card-header">
                <div className="card-header-icon">
                  <i className={`fas ${theme.icon}`}></i>
                </div>
                <div className="card-header-text">
                  <h3>{attr}</h3>
                  <p className="card-subtitle">{theme.subtitle}</p>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    fontSize: "1.8rem",
                    position: "relative",
                    zIndex: 2,
                    filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
                  }}
                >
                  {theme.emoji}
                </div>
              </div>

              <div className="card-body">
                <div className="card-stats">
                  <span style={{ color: "#16a34a" }}>OK {acertosNo}</span>
                  <span style={{ color: "#dc2626" }}>ER {errosNo}</span>
                  <span style={{ color: "#ca8a04" }}>CR+ {criticosExtrasNoAtributo}</span>
                  <span style={{ color: "#6b7280" }}>T {total}</span>
                </div>

                <div className="card-bonus">{getBonusContent(attr, bonus)}</div>

                <div className="card-deck-count">
                  Total no deck: {acertosComuns + ACERTOS_CRITICOS_FIXOS} acertos
                  · {ERROS_COMUNS_FIXOS + ERROS_CRITICOS_FIXOS} erros
                </div>

                <div
                  style={{
                    textAlign: "center",
                    fontSize: "0.72rem",
                    color: "#aaa",
                    marginTop: "auto",
                    paddingTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                  }}
                >
                  <i className="fas fa-hand-pointer"></i> Clique em "Puxar"
                  para sacar
                </div>
              </div>
            </div>
          </div>

          <div className="flip-card-back">
            <div
              className={`card-face ${resultInfo ? resultInfo.glowClass : ""}`}
              style={
                resultInfo
                  ? {
                      borderColor: resultInfo.textColor,
                    }
                  : undefined
              }
            >
              <div className="card-header">
                <div className="card-header-icon">
                  <i className={`fas ${theme.icon}`}></i>
                </div>
                <div className="card-header-text">
                  <h3>{attr}</h3>
                  <p className="card-subtitle">Resultado do Saque</p>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    fontSize: "1.8rem",
                    position: "relative",
                    zIndex: 2,
                    filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
                  }}
                >
                  {theme.emoji}
                </div>
              </div>

              <div
                className="card-result-body"
                onClick={onFlipBack}
                style={{
                  background: resultInfo ? resultInfo.bgColor : theme.bgLight,
                  cursor: "pointer",
                }}
              >
                {resultInfo ? (
                  <>
                    <div className="result-icon">
                      <i
                        className={`fas ${resultInfo.icon} ${resultInfo.iconClass}`}
                      ></i>
                    </div>
                    <div
                      className="result-text"
                      style={{ color: resultInfo.textColor }}
                    >
                      {resultInfo.text}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#888",
                        marginTop: "4px",
                      }}
                    >
                      Restam: {total} cartas
                    </div>
                  </>
                ) : (
                  <span style={{ color: "#aaa", fontSize: "1.1rem" }}>
                    Nenhuma carta sacada
                  </span>
                )}
                <div className="result-hint">
                  <i className="fas fa-undo-alt"></i> Clique para voltar
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-controls">
        {mostrarControlesEdicao && (
          <>
            <button
              className="btn-decrement"
              onClick={(e) => {
                e.stopPropagation();
                onDecrement();
              }}
              disabled={acertosComuns <= 0}
              title="Remover acerto"
            >
              -
            </button>
            <button
              className="btn-increment"
              onClick={(e) => {
                e.stopPropagation();
                onIncrement();
              }}
              disabled={pontosDistribuir <= 0}
              title="Adicionar acerto"
            >
              +
            </button>
            <button
              className="btn-increment"
              onClick={(e) => {
                e.stopPropagation();
                onConverterAcertoEmCritico();
              }}
              disabled={
                transformacoesCriticoDisponiveis <= 0 ||
                criticosExtrasNoAtributo >= acertosComuns
              }
              title="Converter 1 acerto em 1 acerto critico"
            >
              *
            </button>
          </>
        )}
        <button
          className="btn-puxar"
          onClick={(e) => {
            e.stopPropagation();
            onPuxar();
          }}
          disabled={total === 0}
        >
          <i className="fas fa-hand-point-up"></i> Puxar
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReembaralhar();
          }}
        >
          <i className="fas fa-sync-alt"></i> Reemb.
        </button>
      </div>
    </div>
  );
}


