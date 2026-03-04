import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";

interface DiceNotationResult {
  set?: unknown;
  result?: unknown;
  resultTotal?: unknown;
}

interface DiceBoxInstance {
  setDice: (notation: string) => void;
  start_throw: (
    beforeRoll?: (notation: unknown) => unknown,
    afterRoll?: (notation: DiceNotationResult) => void
  ) => void;
}

interface DiceGlobal {
  dice_box: new (container: HTMLElement) => DiceBoxInstance;
}

export interface DiceRollResult {
  value: number;
  notation: DiceNotationResult;
}

export interface DiceRollRequest {
  label?: string;
  notation?: string;
}

export interface DiceRollerOverlayHandle {
  rollD100: (request?: DiceRollRequest) => Promise<DiceRollResult>;
}

let diceLibLoader: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[data-dice-src="${src}"]`
    ) as HTMLScriptElement | null;
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Falha ao carregar ${src}`)), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.diceSrc = src;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.body.appendChild(script);
  });
}

function ensureDiceLib(): Promise<void> {
  if (diceLibLoader) return diceLibLoader;
  diceLibLoader = (async () => {
    await loadScript("/vendor/dice/libs/teal.js");
    await loadScript("/vendor/dice/libs/three.min.js");
    await loadScript("/vendor/dice/libs/cannon.min.js");
    await loadScript("/vendor/dice/dice.js");
    const w = window as Window & { DICE?: DiceGlobal };
    if (!w.DICE?.dice_box) {
      throw new Error("Biblioteca de dados nao foi carregada corretamente.");
    }
  })();
  return diceLibLoader;
}

function waitFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function expandNotationWithD9(notation: string): string {
  const matches = [...notation.matchAll(/(\d*)d100/gi)];
  const d100Count = matches.reduce((sum, m) => {
    const raw = m[1]?.trim();
    const count = raw ? Number.parseInt(raw, 10) : 1;
    return sum + (Number.isFinite(count) && count > 0 ? count : 1);
  }, 0);
  if (d100Count <= 0) return notation;
  const extra = Array.from({ length: d100Count }, () => "d9").join("+");
  return `${notation}+${extra}`;
}

function extractPercentile(notation: DiceNotationResult): number {
  const set = Array.isArray(notation.set) ? notation.set.map(String) : [];
  const result = Array.isArray(notation.result)
    ? notation.result.map((item) => Number(item))
    : [];

  const idxD100 = set.findIndex((face) => face === "d100");
  if (idxD100 >= 0 && Number.isFinite(result[idxD100])) {
    const idxD9 = set.findIndex((face, idx) => face === "d9" && idx > idxD100);
    const tens = result[idxD100];
    const ones = idxD9 >= 0 && Number.isFinite(result[idxD9]) ? result[idxD9] : 0;
    const combined = tens + ones;
    if (combined === 0) return 100;
    return Math.max(1, Math.min(100, combined));
  }

  if (typeof notation.resultTotal === "number" && Number.isFinite(notation.resultTotal)) {
    return Math.max(1, Math.min(100, notation.resultTotal));
  }
  return 100;
}

export const DiceRollerOverlay = forwardRef<DiceRollerOverlayHandle>(function DiceRollerOverlay(
  _,
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<DiceBoxInstance | null>(null);
  const rollingRef = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const [title, setTitle] = useState("Rolando d100");
  const [status, setStatus] = useState("Preparando...");

  const ensureBox = useCallback((): DiceBoxInstance => {
    if (boxRef.current) return boxRef.current;
    const w = window as Window & { DICE?: DiceGlobal };
    if (!containerRef.current || !w.DICE?.dice_box) {
      throw new Error("Rolador de dados indisponivel.");
    }
    boxRef.current = new w.DICE.dice_box(containerRef.current);
    return boxRef.current;
  }, []);

  const rollD100 = useCallback(
    async (request?: DiceRollRequest): Promise<DiceRollResult> => {
      if (rollingRef.current) {
        throw new Error("Ja existe uma rolagem em andamento.");
      }
      rollingRef.current = true;
      const notation = request?.notation?.trim() || "1d100";
      setTitle(request?.label?.trim() ? `Rolando ${request.label}` : "Rolando d100");
      setStatus("Carregando animação...");
      setIsVisible(true);

      try {
        await ensureDiceLib();
        await waitFrame();
        await waitFrame();
        const box = ensureBox();
        const notationWithD9 = expandNotationWithD9(notation);
        box.setDice(notationWithD9);
        setStatus("Rolando...");

        const rollResult = await new Promise<DiceRollResult>((resolve, reject) => {
          try {
            box.start_throw(
              () => null,
              (rolledNotation) => {
                try {
                  resolve({
                    value: extractPercentile(rolledNotation),
                    notation: rolledNotation,
                  });
                } catch (error) {
                  reject(error);
                }
              }
            );
          } catch (error) {
            reject(error);
          }
        });

        setStatus(`Resultado: ${rollResult.value}`);
        await new Promise((resolve) => setTimeout(resolve, 420));
        return rollResult;
      } finally {
        setIsVisible(false);
        rollingRef.current = false;
      }
    },
    [ensureBox]
  );

  useImperativeHandle(
    ref,
    () => ({
      rollD100,
    }),
    [rollD100]
  );

  return (
    <div
      className={`dice-overlay-backdrop ${isVisible ? "is-visible" : "is-hidden"}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isVisible}
    >
      <div className="dice-overlay-panel">
        <div className="dice-overlay-header">
          <i className="fas fa-dice-d20"></i>
          <strong>{title}</strong>
        </div>
        <div ref={containerRef} className="dice-overlay-canvas" />
        <div className="dice-overlay-status">{status}</div>
      </div>
    </div>
  );
});
