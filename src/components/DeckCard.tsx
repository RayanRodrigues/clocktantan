import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ACERTOS_CRITICOS_FIXOS,
  ATTR_THEMES,
  ERROS_COMUNS_FIXOS,
  ERROS_CRITICOS_FIXOS,
  type Card,
} from "../utils/gameState";

type DrawPhase = "moving" | "center";

interface DrawAnimState {
  left: number;
  top: number;
  width: number;
  height: number;
  cardWidth: number;
  gap: number;
  tx: number;
  ty: number;
}

const ATTR_BACK_IMAGE: Record<string, string> = {
  forca: "/cards/For-Card.png",
  destreza: "/cards/Des-Card.png",
  constituicao: "/cards/Con-Card.png",
  inteligencia: "/cards/Int-Card.png",
  sabedoria: "/cards/Sab-Card.png",
  carisma: "/cards/Car-Card.png",
};

const RESULT_IMAGE_BY_TYPE: Record<Card["tipo"], string> = {
  acerto: "/cards/Acerto-Card.png",
  acerto_critico: "/cards/AcertoCrit-Card.png",
  erro: "/cards/Erro-Card.png",
  erro_critico: "/cards/ErroCrit-Card.png",
};

function normalizeAttrKey(attr: string): string {
  return attr
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function calcularBonus(attr: string, acertosComuns: number) {
  const totalAcertos = acertosComuns + ACERTOS_CRITICOS_FIXOS;
  switch (normalizeAttrKey(attr)) {
    case "forca":
      return { dano: Math.floor(totalAcertos / 3), carga: totalAcertos };
    case "destreza":
      return { esquiva: Math.min(totalAcertos, 75) };
    case "constituicao":
      return { vida: totalAcertos * 4 };
    case "inteligencia":
      return {
        investigacao: totalAcertos,
        progresso: Math.floor(totalAcertos / 10),
      };
    case "sabedoria":
      return {
        percepcao: totalAcertos,
        engenhosidade: totalAcertos,
        transformacoes: Math.floor(totalAcertos / 10),
      };
    case "carisma": {
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
  switch (normalizeAttrKey(attr)) {
    case "forca":
      return (
        <>
          <p>⚔️ Dano: <strong>+{bonus.dano}</strong></p>
          <p>📦 Carga: <strong>{bonus.carga}kg</strong></p>
        </>
      );
    case "destreza":
      return <p>💨 Esquiva: <strong>{bonus.esquiva}%</strong></p>;
    case "constituicao":
      return <p>❤️ Vida: <strong>+{bonus.vida}</strong></p>;
    case "inteligencia":
      return (
        <>
          <p>🔍 Investigação: <strong>{bonus.investigacao}%</strong></p>
          <p>📈 Progresso: <strong>+{bonus.progresso}</strong></p>
        </>
      );
    case "sabedoria":
      return (
        <>
          <p>👁️ Percepção: <strong>{bonus.percepcao}%</strong></p>
          <p>🧠 Engenh.: <strong>{bonus.engenhosidade}</strong></p>
          <p>✨ Críticos: <strong>+{bonus.transformacoes}</strong></p>
        </>
      );
    case "carisma":
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

function getResultImage(card: Card): string {
  return RESULT_IMAGE_BY_TYPE[card.tipo];
}

function getAttrBackImage(attr: string): string {
  const slug = normalizeAttrKey(attr);
  return ATTR_BACK_IMAGE[slug] ?? "";
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
  onConcluirPuxada,
  onReembaralhar,
  onDecrement,
  onIncrement,
  onConverterAcertoEmCritico,
  onFlipBack,
}: {
  attr: string;
  deck: Card[];
  acertosComuns: number;
  resultado: Card[];
  pontosDistribuir: number;
  isFlipped: boolean;
  criticosExtrasNoAtributo: number;
  transformacoesCriticoDisponiveis: number;
  mostrarControlesEdicao: boolean;
  onPuxar: (quantidade: number) => Card[] | null;
  onConcluirPuxada: (cartas: Card[]) => void;
  onReembaralhar: () => void;
  onDecrement: () => void;
  onIncrement: () => void;
  onConverterAcertoEmCritico: () => void;
  onFlipBack: () => void;
}) {
  const theme = ATTR_THEMES[attr];
  const [pullCount, setPullCount] = useState<1 | 2 | 3>(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPhase, setDrawPhase] = useState<DrawPhase>("moving");
  const [canCenterFlip, setCanCenterFlip] = useState(false);
  const [centerFlipped, setCenterFlipped] = useState(false);
  const [previewCards, setPreviewCards] = useState<Card[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [drawAnim, setDrawAnim] = useState<DrawAnimState | null>(null);

  const flipCardRef = useRef<HTMLDivElement | null>(null);
  const moveTimerRef = useRef<number | null>(null);
  const stepTimerRef = useRef<number | null>(null);
  const dismissTimerRef = useRef<number | null>(null);

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
    "--card-back-image": `url("${getAttrBackImage(attr)}")`,
  } as CSSProperties;

  const primaryResult = resultado[0] ?? null;
  const resultInfo = primaryResult ? getResultInfo(primaryResult) : null;
  useEffect(() => {
    return () => {
      if (moveTimerRef.current != null) window.clearTimeout(moveTimerRef.current);
      if (stepTimerRef.current != null) window.clearTimeout(stepTimerRef.current);
      if (dismissTimerRef.current != null) window.clearTimeout(dismissTimerRef.current);
    };
  }, []);

  const closeCenterFlow = () => {
    setIsDrawing(false);
    setCanCenterFlip(false);
    setCenterFlipped(false);
    setPreviewCards([]);
    setPreviewIndex(0);
    setDrawAnim(null);
  };

  const handleAnimatedPuxar = () => {
    if (isDrawing) return;
    const quantidade = Math.max(1, Math.min(3, pullCount));
    if (total < quantidade) {
      alert(`Deck de ${attr} não possui ${quantidade} carta(s).`);
      return;
    }
    const drawn = onPuxar(quantidade);
    if (!drawn || drawn.length === 0) return;

    const rect = flipCardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const qtd = drawn.length;
    const gap = 14;
    const cardAspect = 1.52; // card height / width
    const maxWidth = window.innerWidth * 0.94;
    const maxHeight = window.innerHeight * 0.74;

    let cardWidth = Math.max(170, rect.width * 0.7);
    cardWidth = Math.min(
      cardWidth,
      (maxWidth - gap * (qtd - 1)) / qtd,
      maxHeight / cardAspect
    );
    const width = cardWidth * qtd + gap * (qtd - 1);
    const height = cardWidth * cardAspect;
    const left = rect.left + (rect.width - cardWidth) / 2;
    const top = rect.top + (rect.height - height) / 2;
    const centerLeft = window.innerWidth / 2 - width / 2;
    const centerTop = window.innerHeight / 2 - height / 2;

    setPreviewCards(drawn);
    setPreviewIndex(0);
    setCenterFlipped(false);
    setCanCenterFlip(false);
    setDrawPhase("moving");
    setDrawAnim({
      left,
      top,
      width,
      height,
      cardWidth,
      gap,
      tx: centerLeft - left,
      ty: centerTop - top,
    });
    setIsDrawing(true);
    requestAnimationFrame(() => setDrawPhase("center"));

    moveTimerRef.current = window.setTimeout(() => {
      setCanCenterFlip(true);
    }, 560);
  };

  const handleCenterCardClick = () => {
    if (!isDrawing || !canCenterFlip || centerFlipped || previewCards.length === 0) return;
    setCenterFlipped(true);
    setCanCenterFlip(false);

    const isLast = previewIndex >= previewCards.length - 1;
    if (isLast) {
      dismissTimerRef.current = window.setTimeout(() => {
        onConcluirPuxada(previewCards);
        closeCenterFlow();
      }, 900);
      return;
    }

    stepTimerRef.current = window.setTimeout(() => {
      setPreviewIndex((prev) => prev + 1);
      setCenterFlipped(false);
      setCanCenterFlip(true);
    }, 700);
  };

  const hasMultipleResults = resultado.length > 1;

  return (
    <div className="card-wrapper" style={cssVars}>
      <div ref={flipCardRef} className={`flip-card ${isDrawing ? "drawing" : ""}`}>
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
                  className="card-puxar-hint"
                  style={{
                    textAlign: "center",
                    fontSize: "0.72rem",
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
                    {hasMultipleResults ? (
                      <div className="result-image-row">
                        {resultado.map((card, idx) => (
                          <img
                            key={`${card.tipo}-${idx}`}
                            src={getResultImage(card)}
                            alt={getResultInfo(card).text}
                            className="result-image-card result-image-small"
                          />
                        ))}
                      </div>
                    ) : (
                      <img
                        src={getResultImage(resultado[0])}
                        alt={resultInfo.text}
                        className="result-image-card"
                      />
                    )}
                    <div className="result-text" style={{ color: resultInfo.textColor }}>
                      {hasMultipleResults
                        ? `${resultado.length} CARTAS SACADAS`
                        : resultInfo.text}
                    </div>
                    {hasMultipleResults && (
                      <div className="draw-results-inline">
                        {resultado.map((card, idx) => {
                          const info = getResultInfo(card);
                          return (
                            <span key={`${card.tipo}-${idx}`} title={info.text}>
                              <i className={`fas ${info.icon} ${info.iconClass}`}></i>
                            </span>
                          );
                        })}
                      </div>
                    )}
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

      <div className={`card-controls ${mostrarControlesEdicao ? "edit-mode" : ""}`}>
        {mostrarControlesEdicao && (
          <div className="deck-edit-controls" role="group" aria-label={`Editar deck de ${attr}`}>
            <button
              className="edit-btn edit-btn-minus btn-decrement"
              onClick={(e) => {
                e.stopPropagation();
                onDecrement();
              }}
              disabled={isDrawing || acertosComuns <= 0}
              title="Remover acerto"
            >
              -
            </button>
            <button
              className="edit-btn edit-btn-plus btn-increment"
              onClick={(e) => {
                e.stopPropagation();
                onIncrement();
              }}
              disabled={isDrawing || pontosDistribuir <= 0}
              title="Adicionar acerto"
            >
              +
            </button>
            <button
              className="edit-btn edit-btn-crit btn-increment"
              onClick={(e) => {
                e.stopPropagation();
                onConverterAcertoEmCritico();
              }}
              disabled={
                isDrawing ||
                transformacoesCriticoDisponiveis <= 0 ||
                criticosExtrasNoAtributo >= acertosComuns
              }
              title="Converter 1 acerto em 1 acerto crítico"
            >
              ✦
            </button>
          </div>
        )}
        {!mostrarControlesEdicao && (
          <>
            <div className="pull-count-group" role="group" aria-label={`Qtd ${attr}`}>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`pull-count-btn ${pullCount === n ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPullCount(n as 1 | 2 | 3);
                  }}
                  disabled={isDrawing}
                  title={`Puxar ${n} carta(s)`}
                >
                  {n}x
                </button>
              ))}
            </div>
            <button
              className="btn-puxar"
              onClick={(e) => {
                e.stopPropagation();
                handleAnimatedPuxar();
              }}
              disabled={isDrawing || total < pullCount}
            >
              <i className="fas fa-hand-point-up"></i> Puxar
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReembaralhar();
              }}
              disabled={isDrawing}
            >
              <i className="fas fa-sync-alt"></i> Reemb.
            </button>
          </>
        )}
      </div>

      {isDrawing && drawAnim && previewCards.length > 0 && (
        <div className="draw-overlay">
          <div
            className={`draw-center-card ${drawPhase === "center" ? "at-center" : ""} ${
              previewIndex > 0 ? "revealed" : ""
            } ${canCenterFlip && !centerFlipped ? "can-flip" : ""}`}
            style={
              {
                left: `${drawAnim.left}px`,
                top: `${drawAnim.top}px`,
                width: `${drawAnim.width}px`,
                height: `${drawAnim.height}px`,
                "--draw-tx": `${drawAnim.tx}px`,
                "--draw-ty": `${drawAnim.ty}px`,
              } as CSSProperties
            }
            onClick={handleCenterCardClick}
          >
            <div
              className="draw-center-strip"
              style={
                {
                  "--center-gap": `${drawAnim.gap}px`,
                } as CSSProperties
              }
            >
              {previewCards.map((card, idx) => {
                const info = getResultInfo(card);
                const isRevealed = idx < previewIndex || (idx === previewIndex && centerFlipped);
                return (
                  <div
                    key={`${card.tipo}-${idx}`}
                    className={`draw-center-slot ${isRevealed ? "revealed" : ""} ${
                      idx === previewIndex && canCenterFlip && !centerFlipped ? "active-next" : ""
                    }`}
                    style={{ width: `${drawAnim.cardWidth}px`, height: `${drawAnim.height}px` }}
                  >
                    <div className="draw-center-slot-inner">
                      <div className="draw-center-slot-front">
                        <div className="card-back-frame">
                          <div className="card-back-inner has-image">
                            <div className="card-back-progress card-back-overlay-text">
                              Carta {idx + 1}/{previewCards.length}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="draw-center-slot-back">
                        <img
                          src={getResultImage(card)}
                          alt={info.text}
                          className="center-result-image"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {canCenterFlip && !centerFlipped && (
              <div className="card-back-click-hint center-hint">Clique para virar a próxima</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

