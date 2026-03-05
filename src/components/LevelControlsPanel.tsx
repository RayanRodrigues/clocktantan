import { useState } from "react";
import type { CriticosFontesState, LevelUpPlan } from "../utils/gameState";

interface LevelControlsPanelProps {
  nivel: number;
  pontosDistribuir: number;
  planoSubida: LevelUpPlan | null;
  mostrarEscolhaSubida: boolean;
  modoEdicaoDecks: boolean;
  mostrarPainelCriticos: boolean;
  transformacoesCriticoSabedoria: number;
  transformacoesCriticoTotais: number;
  transformacoesCriticoUsadas: number;
  transformacoesCriticoDisponiveis: number;
  criticosFontes: CriticosFontesState;
  onSubirNivel: () => void;
  onToggleModoEdicaoDecks: () => void;
  onTogglePainelCriticos: () => void;
  onAplicarSubidaNivel: (mode: LevelUpPlan["mode"]) => void;
  onFecharEscolhaSubida: () => void;
  onAjustarCriticosFonte: (campo: keyof CriticosFontesState, delta: number) => void;
}

export function LevelControlsPanel({
  nivel,
  pontosDistribuir,
  planoSubida,
  mostrarEscolhaSubida,
  modoEdicaoDecks,
  mostrarPainelCriticos,
  transformacoesCriticoSabedoria,
  transformacoesCriticoTotais,
  transformacoesCriticoUsadas,
  transformacoesCriticoDisponiveis,
  criticosFontes,
  onSubirNivel,
  onToggleModoEdicaoDecks,
  onTogglePainelCriticos,
  onAplicarSubidaNivel,
  onFecharEscolhaSubida,
  onAjustarCriticosFonte,
}: LevelControlsPanelProps) {
  const [topbarIconFailed, setTopbarIconFailed] = useState<Record<string, boolean>>({});
  const TopbarIcon = ({
    name,
    fallbackClass,
  }: {
    name: string;
    fallbackClass: string;
  }) =>
    topbarIconFailed[name] ? (
      <i className={`fas ${fallbackClass}`} aria-hidden="true"></i>
    ) : (
      <img
        src={`/icons/topbar/${name}.svg`}
        alt=""
        className="topbar-icon"
        onError={() => setTopbarIconFailed((prev) => ({ ...prev, [name]: true }))}
      />
    );

  return (
    <div className="nivel-info">
      <span className="font-bold text-slate-700">
        <TopbarIcon name="nivel" fallbackClass="fa-bullseye" /> Nível:{" "}
        <span className="text-lg">{nivel}</span>
      </span>
      <span className="font-bold text-slate-700">
        <TopbarIcon name="acertos" fallbackClass="fa-clone" /> Acertos para distribuir:{" "}
        <span className="text-lg text-green-700">{pontosDistribuir}</span>
      </span>
      <button
        onClick={onSubirNivel}
        className="topbar-btn topbar-btn-primary"
      >
        <TopbarIcon name="subir-nivel" fallbackClass="fa-arrow-up" /> Subir Nível
      </button>
      <button
        type="button"
        onClick={onToggleModoEdicaoDecks}
        className={`modo-edicao-toggle topbar-btn ${
          modoEdicaoDecks ? "topbar-btn-accent" : "topbar-btn-neutral"
        }`}
      >
        <TopbarIcon name="editar-decks" fallbackClass="fa-pencil-alt" />{" "}
        {modoEdicaoDecks ? "Editando decks" : "Editar decks"}
      </button>
      {modoEdicaoDecks && (
        <button
          type="button"
          onClick={onTogglePainelCriticos}
          className="critico-toggle topbar-btn topbar-btn-neutral"
        >
          <TopbarIcon name="critico" fallbackClass="fa-star" /> Crítico
        </button>
      )}
      {planoSubida && (
        <span className="text-xs text-slate-600 font-semibold">
          {planoSubida.mode === "three_different"
            ? `Subida ativa: ${planoSubida.remaining} ponto(s) restante(s), em atributos diferentes.`
            : `Subida ativa: ${planoSubida.remaining} ponto(s) restante(s), no mesmo atributo${
                planoSubida.lockedAttr ? ` (${planoSubida.lockedAttr})` : ""
              }.`}
        </span>
      )}
      {mostrarEscolhaSubida && (
        <div className="subida-nivel-escolha">
          <p>Escolha o bônus desta subida:</p>
          <div className="subida-nivel-botoes">
            <button
              type="button"
              className="subida-nivel-opcao"
              onClick={() => onAplicarSubidaNivel("three_different")}
            >
              +3 em atributos diferentes
            </button>
            <button
              type="button"
              className="subida-nivel-opcao"
              onClick={() => onAplicarSubidaNivel("two_same")}
            >
              +2 no mesmo atributo
            </button>
            <button
              type="button"
              className="subida-nivel-cancelar"
              onClick={onFecharEscolhaSubida}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
      {modoEdicaoDecks && mostrarPainelCriticos && (
        <div className="criticos-fontes-panel">
          <div className="criticos-fontes-resumo">
            <strong>Fontes de critico:</strong>
            <span>Sabedoria: {transformacoesCriticoSabedoria}</span>
            <span>Itens: {criticosFontes.itens}</span>
            <span>Passivas: {criticosFontes.passivas}</span>
            <span>
              Total: {transformacoesCriticoTotais} · Usados: {transformacoesCriticoUsadas} ·
              Restantes: {transformacoesCriticoDisponiveis}
            </span>
          </div>
          <div className="criticos-fontes-controles">
            <div className="critico-fonte-item">
              <label>Itens</label>
              <div>
                <button
                  type="button"
                  onClick={() => onAjustarCriticosFonte("itens", -1)}
                  disabled={criticosFontes.itens <= 0}
                >
                  -
                </button>
                <span>{criticosFontes.itens}</span>
                <button
                  type="button"
                  onClick={() => onAjustarCriticosFonte("itens", 1)}
                >
                  +
                </button>
              </div>
            </div>
            <div className="critico-fonte-item">
              <label>Passivas</label>
              <div>
                <button
                  type="button"
                  onClick={() => onAjustarCriticosFonte("passivas", -1)}
                  disabled={criticosFontes.passivas <= 0}
                >
                  -
                </button>
                <span>{criticosFontes.passivas}</span>
                <button
                  type="button"
                  onClick={() => onAjustarCriticosFonte("passivas", 1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
