import {
  BASE_PERICIA,
  PERICIA_LIMITES,
  PERICIAS_POR_CATEGORIA,
  TODAS_PERICIAS,
  type SkillsState,
} from "../utils/gameState";

interface SkillsPanelProps {
  pericias: SkillsState;
  engenhosidadeTotal: number;
  onToggleBonusPericia: (nomePericia: string, bonus: "plus15" | "plus25") => void;
  onToggleProficienciaPericia: (nomePericia: string) => void;
  onIncrementEngPericia: (nomePericia: string) => void;
  onDecrementEngPericia: (nomePericia: string) => void;
}

export function SkillsPanel({
  pericias,
  engenhosidadeTotal,
  onToggleBonusPericia,
  onToggleProficienciaPericia,
  onIncrementEngPericia,
  onDecrementEngPericia,
}: SkillsPanelProps) {
  const totalPlus25 = TODAS_PERICIAS.filter(
    (nome) => pericias[nome].plus25
  ).length;
  const totalPlus15 = TODAS_PERICIAS.filter(
    (nome) => pericias[nome].plus15
  ).length;
  const totalProficientes = TODAS_PERICIAS.filter(
    (nome) => pericias[nome].proficient
  ).length;
  const totalEngGastos = TODAS_PERICIAS.reduce(
    (acc, nome) => acc + (pericias[nome].engStacks || 0),
    0
  );
  const engDisponivel = engenhosidadeTotal - totalEngGastos;

  return (
    <div className="painel pericias-painel">
      <h2 className="panel-title">
        <i className="fas fa-dice-d20"></i> Perícias &amp; Engenhosidade (d100)
      </h2>
      <p className="text-sm">
        <strong>Base:</strong> Todas as perícias começam com 15%. Personagem
        inicia escolhendo:
      </p>
      <ul className="text-sm list-disc ml-5 my-2 space-y-1">
        <li>
          3 perícias para aumentar <strong>+25%</strong> (ficam com 40%)
        </li>
        <li>
          3 perícias para aumentar <strong>+15%</strong> (ficam com 30%)
        </li>
        <li>
          2 perícias para ser <strong>proficiente</strong> (vantagem: rola duas
          vezes e fica com o melhor resultado)
        </li>
      </ul>
      <p className="text-sm">
        <strong>Engenhosidade:</strong> Cada ponto de Sabedoria acima do padrão
        inicial dá <strong>4%</strong> para distribuir em qualquer perícia
        (máximo 80% por perícia). Disponível:{" "}
        <strong>{Math.max(0, engDisponivel)}</strong> / {engenhosidadeTotal}{" "}
        (gastos: {totalEngGastos}).
      </p>

      <div className="pericias-contadores">
        <span className="contador contador-25">
          +25 ({totalPlus25}/{PERICIA_LIMITES.plus25})
        </span>
        <span className="contador contador-15">
          +15 ({totalPlus15}/{PERICIA_LIMITES.plus15})
        </span>
        <span className="contador contador-prof">
          PROF ({totalProficientes}/{PERICIA_LIMITES.proficient})
        </span>
        <span className="contador contador-eng">
          ENG ({totalEngGastos}/{engenhosidadeTotal})
        </span>
      </div>

      <div className="pericias-grid">
        {Object.entries(PERICIAS_POR_CATEGORIA).map(([categoria, lista]) => (
          <div key={categoria}>
            <h3 className="text-base font-bold border-b border-gray-400 pb-1 mb-2">
              {categoria}
            </h3>
            <ul className="list-none p-0 m-0">
              {lista.map((nomePericia) => {
                const mark = pericias[nomePericia];
                const engBonus = (mark.engStacks || 0) * 4;
                const percentual =
                  BASE_PERICIA +
                  (mark.plus25 ? 25 : 0) +
                  (mark.plus15 ? 15 : 0) +
                  engBonus;
                return (
                  <li key={nomePericia} className="pericia-item">
                    <div className="pericia-linha-topo">
                      <span className="pericia-nome">{nomePericia}</span>
                      <span className="pericia-percentual">{percentual}%</span>
                    </div>
                    <div className="pericia-marcacoes">
                      <button
                        type="button"
                        className={`pericia-tag-btn ${
                          mark.plus25 ? "ativo-25" : ""
                        }`}
                        onClick={() => onToggleBonusPericia(nomePericia, "plus25")}
                      >
                        +25
                      </button>
                      <button
                        type="button"
                        className={`pericia-tag-btn ${
                          mark.plus15 ? "ativo-15" : ""
                        }`}
                        onClick={() => onToggleBonusPericia(nomePericia, "plus15")}
                      >
                        +15
                      </button>
                      <button
                        type="button"
                        className={`pericia-tag-btn ${
                          mark.proficient ? "ativo-prof" : ""
                        }`}
                        onClick={() => onToggleProficienciaPericia(nomePericia)}
                      >
                        PROF
                      </button>
                      <button
                        type="button"
                        className="pericia-tag-btn ativo-eng"
                        onClick={() => onIncrementEngPericia(nomePericia)}
                        disabled={engDisponivel <= 0}
                        title="Adicionar +4% de engenhosidade"
                      >
                        +ENG
                      </button>
                      <button
                        type="button"
                        className="pericia-tag-btn"
                        onClick={() => onDecrementEngPericia(nomePericia)}
                        disabled={(mark.engStacks || 0) <= 0}
                        title="Remover +4% de engenhosidade"
                      >
                        -ENG
                      </button>
                    </div>
                    <div className="pericia-badges">
                      {mark.plus25 && (
                        <span className="badge badge-25">+25%</span>
                      )}
                      {mark.plus15 && (
                        <span className="badge badge-15">+15%</span>
                      )}
                      {mark.proficient && (
                        <span className="badge badge-prof">★ Vantagem</span>
                      )}
                      {(mark.engStacks || 0) > 0 && (
                        <span className="badge badge-eng">
                          ENG x{mark.engStacks} (+{engBonus}%)
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-gray-200 p-2 rounded mt-3 text-sm">
        <i className="fas fa-info-circle"></i> <strong>Lembrete:</strong>{" "}
        Perícias são resolvidas com d100 (rolar abaixo do valor). Dificuldade
        pode ser reduzida para metade ou quarto do valor em tarefas complexas.
      </div>
    </div>
  );
}
