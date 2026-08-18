"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorState, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  WidgetType,
  keymap,
  lineNumbers,
  highlightActiveLine,
  drawSelection,
  type DecorationSet,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  redo,
  undo,
} from "@codemirror/commands";
import { openSearchPanel, searchKeymap } from "@codemirror/search";
import { linter, type Diagnostic as CmDiagnostic } from "@codemirror/lint";
import {
  FileDown,
  FilePlus2,
  FileUp,
  Menu,
  Redo2,
  Search,
  Undo2,
} from "lucide-react";
import { APP_CONFIG } from "@/config/app";
import { parse } from "@/lib/core/parser";
import { lint } from "@/lib/core/linter";
import {
  decodeText,
  encodeShiftJis,
  ShiftJisEncodeError,
} from "@/lib/encoding";
import { loadDraft, saveDraft } from "@/lib/storage";
import { validateDraftName } from "@/lib/editor-name";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { ThemeSwitch } from "./theme-provider";
import { DisplaySettingsButton, useDisplaySettings } from "./display-settings";
import { DocumentRenderer } from "./document-renderer";

type SaveState = "保存中" | "保存済み" | "保存失敗";
const initialSource = "";

export function EditorWorkspace() {
  const hostRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const syncOriginRef = useRef<"editor" | "preview" | null>(null);
  const syncTimerRef = useRef<number | undefined>(undefined);
  const restoredDraftRef = useRef({
    text: "",
    anchor: 0,
    head: 0,
    scrollOffset: 0,
  });
  const workerRef = useRef<Worker | null>(null);
  const [text, setText] = useState(initialSource);
  const [name, setName] = useState("untitled.txt");
  const [nameError, setNameError] = useState<string>();
  const [saveState, setSaveState] = useState<SaveState>("保存済み");
  const [exportError, setExportError] = useState<string>();
  const [ready, setReady] = useState(false);
  const [mobilePane, setMobilePane] = useState<"editor" | "preview">("editor");
  const [ratio, setRatio] = useState(50);
  const [settings, setSettings] = useDisplaySettings("preview");
  const [parsed, setParsed] = useState(() => parse(""));

  useEffect(() => {
    void loadDraft().then((draft) => {
      if (draft) {
        restoredDraftRef.current = draft;
        setText(draft.text);
        setName(draft.name);
        setParsed(parse(draft.text));
      }
      setReady(true);
    });
  }, []);
  useEffect(() => {
    const worker = new Worker(
      new URL("../app/editor/parser.worker.ts", import.meta.url),
    );
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<ReturnType<typeof parse>>) =>
      setParsed(event.data);
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);
  useEffect(() => {
    workerRef.current?.postMessage({ source: text });
  }, [text]);
  const updateText = useCallback((next: string) => {
    setText(next);
    setSaveState("保存中");
  }, []);
  const holdSyncOrigin = useCallback((origin: "editor" | "preview") => {
    syncOriginRef.current = origin;
    window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      if (syncOriginRef.current === origin) syncOriginRef.current = null;
    }, 180);
  }, []);
  const scrollPreviewTo = useCallback((offset: number) => {
    const element =
      previewRef.current?.querySelector<HTMLElement>(
        `[data-source-from="${offset}"]`,
      ) ??
      [
        ...(previewRef.current?.querySelectorAll<HTMLElement>(
          "[data-source-from]",
        ) ?? []),
      ]
        .reverse()
        .find((item) => Number(item.dataset.sourceFrom) <= offset);
    element?.scrollIntoView({ block: "center", inline: "center" });
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      const view = viewRef.current;
      void saveDraft({
        name,
        text,
        anchor: view?.state.selection.main.anchor ?? 0,
        head: view?.state.selection.main.head ?? 0,
        scrollOffset: view?.scrollDOM.scrollTop ?? 0,
      })
        .then(() => setSaveState("保存済み"))
        .catch(() => setSaveState("保存失敗"));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [name, ready, text]);

  useEffect(() => {
    if (!ready || !hostRef.current || viewRef.current) return;
    const restored = restoredDraftRef.current;
    const state = EditorState.create({
      doc: restored.text,
      selection: {
        anchor: Math.min(restored.anchor, restored.text.length),
        head: Math.min(restored.head, restored.text.length),
      },
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        EditorView.lineWrapping,
        invisibleCharacters(),
        linter((view): CmDiagnostic[] =>
          lint(view.state.doc.toString()).map((item) => ({
            from: item.from,
            to: Math.max(item.to, item.from + 1),
            severity: item.severity === "info" ? "info" : item.severity,
            message: [item.message, item.suggestion].filter(Boolean).join("\n"),
          })),
        ),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) updateText(update.state.doc.toString());
        }),
        EditorView.theme({
          "&": { height: "100%", backgroundColor: "var(--surface)" },
          ".cm-scroller": {
            fontFamily: '"BIZ UDGothic", "Yu Gothic", monospace',
            lineHeight: "1.7",
          },
          ".cm-content": { padding: "1rem 0 5rem" },
          ".cm-gutters": {
            backgroundColor: "var(--muted)",
            color: "var(--subtle)",
            borderColor: "var(--border)",
          },
        }),
      ],
    });
    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    requestAnimationFrame(() => {
      view.scrollDOM.scrollTop = restored.scrollOffset;
    });
    const syncPreview = () => {
      if (syncOriginRef.current === "preview") return;
      holdSyncOrigin("editor");
      const scrollerBounds = view.scrollDOM.getBoundingClientRect();
      const contentBounds = view.contentDOM.getBoundingClientRect();
      const sourceOffset = view.posAtCoords(
        {
          x: contentBounds.left + 1,
          y: scrollerBounds.top + scrollerBounds.height / 2,
        },
        false,
      );
      scrollPreviewTo(sourceOffset);
    };
    view.scrollDOM.addEventListener("scroll", syncPreview, { passive: true });
    return () => {
      view.scrollDOM.removeEventListener("scroll", syncPreview);
      view.destroy();
      viewRef.current = null;
    };
  }, [holdSyncOrigin, ready, scrollPreviewTo, updateText]);

  function replaceDocument(next: string) {
    const view = viewRef.current;
    if (view)
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: next },
        selection: { anchor: 0 },
      });
    else setText(next);
  }
  function scrollEditorTo(offset: number) {
    const view = viewRef.current;
    if (!view || syncOriginRef.current === "editor") return;
    holdSyncOrigin("preview");
    view.dispatch({
      effects: EditorView.scrollIntoView(
        Math.min(offset, view.state.doc.length),
        { y: "center" },
      ),
    });
  }
  function changeName(next: string) {
    const error = validateDraftName(next);
    setNameError(error);
    if (!error) {
      setName(next);
      setSaveState("保存中");
    }
  }
  function insertNotation(before: string, after = "") {
    const view = viewRef.current;
    if (!view) return;
    const selection = view.state.selection.main;
    const selected = view.state.sliceDoc(selection.from, selection.to);
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: `${before}${selected}${after}`,
      },
      selection: {
        anchor: selection.from + before.length,
        head: selection.from + before.length + selected.length,
      },
    });
    view.focus();
  }
  async function importFile(file: File) {
    try {
      const decoded = decodeText(new Uint8Array(await file.arrayBuffer()));
      replaceDocument(decoded.text);
      setName(file.name);
      setNameError(undefined);
      setExportError(undefined);
    } catch {
      setExportError("ファイルを読み込めませんでした");
    }
  }
  function exportFile() {
    try {
      const bytes = encodeShiftJis(text);
      const data = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      const blob = new Blob([data], { type: "text/plain;charset=shift_jis" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportError(undefined);
    } catch (error) {
      setExportError(
        error instanceof ShiftJisEncodeError
          ? `Shift_JISへ変換できない文字があります（${error.characters.map((item) => item.character).join("、")}）`
          : "Exportできませんでした",
      );
    }
  }
  function resetDraft() {
    replaceDocument("");
    setName("untitled.txt");
    setNameError(undefined);
    setExportError(undefined);
  }
  function startResize(event: React.PointerEvent) {
    const container = event.currentTarget.parentElement;
    if (!container) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      setRatio(
        Math.max(
          25,
          Math.min(75, ((moveEvent.clientX - rect.left) / rect.width) * 100),
        ),
      );
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  const manuscriptCount = [...text].length;
  const bodyCount = [
    ...parsed.document.children
      .flatMap((block) =>
        "children" in block
          ? block.children
              .map((node) =>
                node.type === "text"
                  ? node.value
                  : node.type === "ruby"
                    ? node.base
                    : "",
              )
              .join("")
          : "",
      )
      .join("\n"),
  ].length;
  const lineCount = text.length ? text.split(/\r\n|\r|\n/).length : 1;
  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <header className="z-20 flex h-12 shrink-0 items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface)] px-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Editor操作">
              <Menu size={19} />
            </Button>
          </DialogTrigger>
          <DialogContent title="Editor操作" className="operation-panel">
            <div className="grid gap-3">
              <Button variant="ghost" onClick={resetDraft}>
                <FilePlus2 size={18} />
                新規原稿
              </Button>
              <Button variant="ghost" onClick={() => fileRef.current?.click()}>
                <FileUp size={18} />
                ファイルを開く
              </Button>
              <Button variant="ghost" onClick={exportFile}>
                <FileDown size={18} />
                Shift_JIS Export
              </Button>
              <ThemeSwitch />
              <Button asChild variant="ghost">
                <Link href="/">ホームへ戻る</Link>
              </Button>
              <input
                ref={fileRef}
                hidden
                type="file"
                accept=".txt,text/plain"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importFile(file);
                  event.currentTarget.value = "";
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
        <input
          aria-label="原稿名"
          className="input h-8 w-44 shrink-0"
          value={name}
          onChange={(event) => changeName(event.target.value)}
        />
        <span className="mx-1 h-6 border-l border-[var(--border)]" />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => insertNotation("｜", "《ルビ》")}
        >
          ルビ
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            insertNotation("［＃ここから傍点］", "［＃ここで傍点終わり］")
          }
        >
          傍点
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => insertNotation("［＃大見出し］")}
        >
          見出し
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Undo"
          onClick={() => viewRef.current && undo(viewRef.current)}
        >
          <Undo2 size={18} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Redo"
          onClick={() => viewRef.current && redo(viewRef.current)}
        >
          <Redo2 size={18} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="検索・置換"
          onClick={() => viewRef.current && openSearchPanel(viewRef.current)}
        >
          <Search size={18} />
        </Button>
        <div className="ml-auto">
          <DisplaySettingsButton settings={settings} onChange={setSettings} />
        </div>
      </header>
      {(nameError || exportError) && (
        <div
          className="shrink-0 border-b border-red-400 bg-red-50 px-4 py-2 text-sm text-red-800"
          role="alert"
        >
          {nameError ?? exportError}
        </div>
      )}
      <div className="flex border-b border-[var(--border)] md:hidden">
        <button
          className={`flex-1 p-2 ${mobilePane === "editor" ? "bg-[var(--muted)] font-semibold" : ""}`}
          onClick={() => setMobilePane("editor")}
        >
          Editor
        </button>
        <button
          className={`flex-1 p-2 ${mobilePane === "preview" ? "bg-[var(--muted)] font-semibold" : ""}`}
          onClick={() => setMobilePane("preview")}
        >
          Preview
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1">
        <section
          className={`${mobilePane === "editor" ? "block" : "hidden"} h-full min-w-0 md:block`}
          style={{ width: `${ratio}%` }}
          aria-label="Editor"
        >
          <div ref={hostRef} className="h-full" />
        </section>
        <div
          className="hidden w-1 cursor-col-resize bg-[var(--border)] hover:bg-[var(--accent)] md:block"
          onPointerDown={startResize}
          role="separator"
          aria-orientation="vertical"
        />
        <section
          ref={previewRef}
          className={`${mobilePane === "preview" ? "block" : "hidden"} h-full min-w-0 flex-1 overflow-auto md:block`}
          aria-label="Preview"
          onScroll={(event) =>
            handleSourceScroll(
              event.currentTarget,
              settings.writingMode,
              scrollEditorTo,
            )
          }
        >
          <DocumentRenderer
            document={parsed.document}
            settings={settings}
            allowedImageHosts={APP_CONFIG.allowedImageHosts}
            onVisibleOffset={scrollEditorTo}
          />
        </section>
      </div>
      <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-[var(--border)] bg-[var(--surface)] px-3 text-xs">
        <span>{saveState}</span>
        <span>原稿 {manuscriptCount}字</span>
        <span>本文 {bodyCount}字</span>
        <span>{lineCount}行</span>
      </footer>
    </main>
  );
}

function handleSourceScroll(
  container: HTMLElement,
  writingMode: "horizontal" | "vertical",
  callback: (offset: number) => void,
) {
  const bounds = container.getBoundingClientRect();
  const center =
    writingMode === "vertical"
      ? bounds.left + bounds.width / 2
      : bounds.top + bounds.height / 2;
  let selected: HTMLElement | undefined;
  let distance = Infinity;
  container
    .querySelectorAll<HTMLElement>("[data-source-from]")
    .forEach((element) => {
      const rect = element.getBoundingClientRect();
      const elementCenter =
        writingMode === "vertical"
          ? rect.left + rect.width / 2
          : rect.top + rect.height / 2;
      const next = Math.abs(center - elementCenter);
      if (next < distance) {
        distance = next;
        selected = element;
      }
    });
  if (selected) callback(Number(selected.dataset.sourceFrom));
}

function invisibleCharacters() {
  const field = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(value, transaction) {
      if (transaction.docChanged || value === Decoration.none) {
        const marks = [];
        for (const range of transaction.state.doc.iter()) {
          void range;
        }
        for (
          let lineNumber = 1;
          lineNumber <= transaction.state.doc.lines;
          lineNumber++
        ) {
          const line = transaction.state.doc.line(lineNumber);
          for (const match of line.text.matchAll(/[ \t　]/g)) {
            const label =
              match[0] === "\t" ? "→" : match[0] === "　" ? "□" : "·";
            marks.push(
              Decoration.replace({
                widget: new CharacterWidget(label, match[0]),
              }).range(line.from + match.index, line.from + match.index + 1),
            );
          }
          marks.push(
            Decoration.widget({
              widget: new CharacterWidget("↵", ""),
              side: 1,
            }).range(line.to),
          );
        }
        return Decoration.set(marks);
      }
      return value.map(transaction.changes);
    },
    provide: (value) => EditorView.decorations.from(value),
  });
  return field;
}

class CharacterWidget extends WidgetType {
  constructor(
    private readonly label: string,
    private readonly original: string,
  ) {
    super();
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = "text-[var(--subtle)] opacity-60";
    span.textContent = this.label;
    span.title =
      this.original === ""
        ? "改行"
        : this.original === " "
          ? "半角スペース"
          : this.original === "　"
            ? "全角スペース"
            : "タブ";
    return span;
  }
  eq(other: CharacterWidget) {
    return other.label === this.label && other.original === this.original;
  }
}
