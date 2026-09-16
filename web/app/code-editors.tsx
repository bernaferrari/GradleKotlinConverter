"use client";

import { useEffect, useRef, useState } from "react";
import Editor, { type BeforeMount } from "@monaco-editor/react";
import { AlertCircle, Check, ClipboardPaste, Copy, Download, RotateCcw } from "lucide-react";
import type { editor } from "monaco-editor";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { BorderBeam } from "@/components/magicui/border-beam";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { editorExamples } from "./editor-examples";
import { GradleToKtsConverter } from "./logic";

const converter = new GradleToKtsConverter();
const initialInput = editorExamples[0].input;
const editorOptions: editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  lineHeight: 23,
  fontFamily: 'var(--font-jetbrains-mono), "SFMono-Regular", Consolas, monospace',
  lineNumbersMinChars: 3,
  padding: { top: 20, bottom: 20 },
  scrollBeyondLastLine: false,
  renderLineHighlight: "none",
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  folding: false,
  automaticLayout: true,
  tabSize: 4,
  wordWrap: "on",
  scrollbar: {
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 8,
    alwaysConsumeMouseWheel: false,
  },
};

const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("converter-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#ffffff",
      "editorLineNumber.foreground": "#9d9aa7",
      "editor.lineHighlightBackground": "#f8f7fb",
      "editor.selectionBackground": "#e7dffa",
    },
  });
  monaco.editor.defineTheme("converter-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1c1b20",
      "editorLineNumber.foreground": "#76717f",
      "editor.lineHighlightBackground": "#25232c",
      "editor.selectionBackground": "#483660",
    },
  });
};

export default function CodeEditors() {
  const [input, setInput] = useState(initialInput);
  const [result, setResult] = useState(() => ({
    source: initialInput,
    output: converter.convert(initialInput),
    error: "",
  }));
  const [copied, setCopied] = useState(false);
  const [outputLoaded, setOutputLoaded] = useState(false);
  const [recentConversion, setRecentConversion] = useState(true);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { resolvedTheme } = useTheme();
  const pending = input !== result.source;
  const hasOutput = Boolean(result.output.trim()) && !pending && !result.error;
  const output = input.trim() ? result.output : "";

  useEffect(() => {
    if (input === result.source) return;
    const timer = setTimeout(() => {
      try {
        setResult({
          source: input,
          output: input.trim() ? converter.convert(input) : "",
          error: "",
        });
      } catch {
        setResult({
          source: input,
          output: "",
          error:
            "Couldn’t convert this script. Try a smaller section to find the unsupported syntax.",
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [input, result.source]);

  useEffect(() => {
    setCopied(false);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, [result.output]);

  useEffect(() => {
    setRecentConversion(true);
    const timer = setTimeout(() => setRecentConversion(false), 1200);
    return () => clearTimeout(timer);
  }, [result.source, outputLoaded]);

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Clipboard access unavailable", {
        description: "Select the Kotlin code and copy it with your keyboard.",
      });
    }
  }

  async function pasteInput() {
    try {
      setInput(await navigator.clipboard.readText());
    } catch {
      toast.error("Paste directly into the Groovy editor", {
        description: "Your browser didn’t allow clipboard access. Use ⌘V or Ctrl+V instead.",
      });
    }
  }

  function downloadOutput() {
    const url = URL.createObjectURL(
      new Blob([result.output], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "build.gradle.kts";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Downloaded build.gradle.kts");
  }

  return (
    <section aria-label="Gradle to Kotlin converter">
      <div className="grid min-w-0 overflow-hidden rounded-lg border bg-card md:grid-cols-2">
        <div className="min-w-0 border-b md:border-r md:border-b-0">
          <div className="relative flex h-12 items-center border-b bg-muted/20 pr-28 pl-5">
            <div className="flex items-center gap-3">
              <Icons.groovy className="size-5 shrink-0" aria-hidden="true" />
              <h2 className="font-mono text-xs font-medium" aria-label="Groovy: build.gradle">
                build.gradle
              </h2>
            </div>
            <div className="absolute top-1/2 right-3 -translate-y-1/2 flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="editor-icon"
                      aria-label="Paste Groovy code"
                      onClick={pasteInput}
                    >
                      <ClipboardPaste className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent>Paste Groovy code</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="editor-icon"
                      aria-label="Restore example"
                      disabled={input === initialInput}
                      onClick={() => {
                        setInput(initialInput);
                        toast.info("Example restored");
                      }}
                    >
                      <RotateCcw className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent>Restore example</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="relative h-[420px] lg:h-[500px]">
            <Editor
              height="100%"
              language="java"
              value={input}
              onChange={(value) => setInput(value ?? "")}
              beforeMount={defineThemes}
              theme={resolvedTheme === "dark" ? "converter-dark" : "converter-light"}
              options={{ ...editorOptions, ariaLabel: "Groovy source code" }}
              loading={
                <EditorFallback label="Groovy source code" value={input} onChange={setInput} />
              }
            />
            {!input && (
              <div className="pointer-events-none absolute top-5 right-4 left-14 text-sm leading-6 text-muted-foreground">
                Paste your Groovy script here.
              </div>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <div className="relative flex h-12 items-center border-b bg-muted/20 pr-28 pl-5">
            <div className="flex items-center gap-3">
              <Icons.kotlin className="size-5 shrink-0" aria-hidden="true" />
              <h2
                className="font-mono text-xs font-medium"
                aria-label="Kotlin DSL: build.gradle.kts"
              >
                build.gradle.kts
              </h2>
            </div>
            <div className="absolute top-1/2 right-3 -translate-y-1/2 flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="editor-icon"
                      aria-label="Download Kotlin script"
                      disabled={!hasOutput}
                      onClick={downloadOutput}
                    >
                      <Download className="size-4" />
                    </Button>
                  }
                />
                <TooltipContent>Download build.gradle.kts</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="editor-icon"
                      aria-label={copied ? "Copied!" : "Copy Kotlin code"}
                      disabled={!hasOutput}
                      onClick={copyOutput}
                    >
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  }
                />
                <TooltipContent>{copied ? "Copied!" : "Copy Kotlin code"}</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="relative h-[420px] lg:h-[500px]" aria-busy={pending}>
            <Editor
              height="100%"
              language="kotlin"
              onMount={() => setOutputLoaded(true)}
              value={output}
              onChange={(value) => {
                if (!pending) setResult((previous) => ({ ...previous, output: value ?? "" }));
              }}
              beforeMount={defineThemes}
              theme={resolvedTheme === "dark" ? "converter-dark" : "converter-light"}
              options={{
                ...editorOptions,
                readOnly: pending || !input.trim() || Boolean(result.error),
                ariaLabel: "Kotlin DSL output",
              }}
              loading={<EditorFallback label="Kotlin DSL output" value={output} />}
            />
            {input.trim() && !result.error && (pending || !outputLoaded || recentConversion) && (
              <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
                <BorderBeam
                  size={200}
                  duration={1.2}
                  colorFrom="var(--color-brand-kotlin-middle)"
                  colorTo="var(--color-brand-kotlin-end)"
                />
              </div>
            )}
            {!output && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-muted-foreground">
                <p>
                  {pending
                    ? "Converting…"
                    : result.error
                      ? "Unable to convert this script."
                      : "Kotlin output will appear here."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <span role="status" className="sr-only">
        {copied ? "Kotlin code copied to clipboard." : ""}
      </span>
      {result.error && (
        <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {result.error}
        </p>
      )}
    </section>
  );
}

function EditorFallback({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
}) {
  return (
    <textarea
      aria-label={label}
      value={value}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      readOnly={!onChange}
      spellCheck={false}
      className="h-full w-full resize-none bg-card p-5 font-mono text-sm leading-6 -outline-offset-2"
    />
  );
}
