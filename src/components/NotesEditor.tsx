import { useCallback, useEffect, useRef } from "react";

interface NotesEditorProps {
  title: string;
  iconClass: string;
  value: string;
  onChange: (html: string) => void;
  placeholder: string;
  panelClassName?: string;
}

export function NotesEditor({
  title,
  iconClass,
  value,
  onChange,
  placeholder,
  panelClassName,
}: NotesEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  const syncFromEditor = useCallback(() => {
    onChange(editorRef.current?.innerHTML ?? "");
  }, [onChange]);

  const handleFormatClick = useCallback(
    (command: "bold" | "italic" | "underline" | "insertUnorderedList") => {
      document.execCommand(command, false);
      syncFromEditor();
      editorRef.current?.focus();
    },
    [syncFromEditor]
  );

  const handleFontSizeChange = useCallback(
    (size: string) => {
      if (!size) return;
      document.execCommand("fontSize", false, size);
      syncFromEditor();
      editorRef.current?.focus();
    },
    [syncFromEditor]
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.innerHTML !== value) {
      editor.innerHTML = value;
    }
  }, [value]);

  return (
    <div className={`painel ${panelClassName ?? ""}`.trim()}>
      <h2 className="panel-title">
        <i className={iconClass}></i> {title}
      </h2>
      <div className="anotacoes-toolbar">
        <button
          type="button"
          onClick={() => handleFormatClick("bold")}
          title="Negrito"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => handleFormatClick("italic")}
          title="Itálico"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => handleFormatClick("underline")}
          title="Sublinhado"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          onClick={() => handleFormatClick("insertUnorderedList")}
          title="Lista"
        >
          • Lista
        </button>
        <select
          defaultValue=""
          onChange={(e) => {
            handleFontSizeChange(e.target.value);
            e.currentTarget.value = "";
          }}
          title="Tamanho da fonte"
        >
          <option value="" disabled>
            Fonte
          </option>
          <option value="1">Pequena</option>
          <option value="2">Normal</option>
          <option value="3">Média</option>
          <option value="4">Grande</option>
          <option value="5">Muito grande</option>
        </select>
      </div>
      <div
        ref={editorRef}
        className="anotacoes-editor"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={syncFromEditor}
        onBlur={syncFromEditor}
      />
    </div>
  );
}
