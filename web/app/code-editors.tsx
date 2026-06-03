"use client";

import { useEffect, useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { motion, useAnimation } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  CheckIcon,
  ClipboardPasteIcon,
  CopyIcon,
  RotateCcwIcon,
} from "lucide-react";
import * as monaco from "monaco-editor";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BorderBeam } from "@/components/magicui/border-beam";

import { defaultExample } from "./default-example";
import { GradleToKtsConverter } from "./logic";

const converter = new GradleToKtsConverter(); // Assuming you've imported this class

export default function CodeEditors() {
  const [gradleInput, setGradleInput] = useState(defaultExample);
  const [kotlinOutput, setKotlinOutput] = useState("");
  const gradleEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const kotlinEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { resolvedTheme } = useTheme();
  const [editorTheme, setEditorTheme] = useState<"vs-dark" | "light">("vs-dark");
  const [conversionSuccess, setConversionSuccess] = useState(false);
  const [copyButtonClicked, setCopyButtonClicked] = useState(false);

  // Update editor theme when app theme changes
  useEffect(() => {
    setEditorTheme(resolvedTheme === "dark" ? "vs-dark" : "light");
  }, [resolvedTheme]);

  const handleClick = async () => {
    setCopyButtonClicked(true);
    await navigator.clipboard.writeText(kotlinEditorRef.current?.getValue() || "");
    toast.success("Copied");

    setTimeout(() => {
      setCopyButtonClicked(false);
    }, 1000);
  };

  useEffect(() => {
    const convertGradleToKotlin = () => {
      if (gradleInput.trim() === "") {
        setKotlinOutput("");
        setConversionSuccess(false);
        return null;
      }
      try {
        const converted = converter.convert(gradleInput);
        setKotlinOutput(converted);
        setConversionSuccess(true);
        setTimeout(() => setConversionSuccess(false), 750);
      } catch (error) {
        console.error("Conversion error:", error);
        setConversionSuccess(false);
        toast.error("Conversion Failed", {
          description: "An error occurred during the conversion process.",
        });
      }
    };

    const debounce = setTimeout(convertGradleToKotlin, 300);
    return () => clearTimeout(debounce);
  }, [gradleInput]);

  const handleGradleEditorDidMount: OnMount = (editor) => {
    gradleEditorRef.current = editor;
  };

  const handleKotlinEditorDidMount: OnMount = (editor) => {
    kotlinEditorRef.current = editor;
  };

  const handleReset = () => {
    setGradleInput(defaultExample);
    toast.info("Restored to default");
  };

  const handlePaste = () => {
    navigator.clipboard.readText().then((text) => setGradleInput(text));
  };

  return (
    <Card className="w-full max-w-5xl bg-card/50">
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4 items-start">
          <div className="space-y-2">
            <div className="flex w-full justify-between items-center gap-2 min-h-8">
              <div className="font-medium flex items-center gap-2">
                <Icons.groovy className="w-6 h-6 text-foreground" />
                <span className="text-muted-foreground">Input:</span> Groovy
              </div>
              <div className="flex justify-center gap-2">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        onClick={handlePaste}
                        size={"icon"}
                        className="w-8 h-8"
                        variant="outline"
                      >
                        <ClipboardPasteIcon className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <TooltipContent>Paste</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        onClick={handleReset}
                        size={"icon"}
                        className="w-8 h-8"
                        variant="outline"
                      >
                        <RotateCcwIcon className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <TooltipContent>Restore to default</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <Editor
              height={500}
              className="rounded-lg overflow-hidden"
              defaultLanguage="java"
              value={gradleInput}
              onChange={(value) => setGradleInput(value || "")}
              onMount={handleGradleEditorDidMount}
              theme={editorTheme}
              options={{
                minimap: { enabled: false },
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                fontSize: 14,
              }}
            />
          </div>
          <div className="flex items-center justify-center h-full">
            <AnimatedArrowRight
              className="h-6 w-6 text-purple-500 hidden sm:flex"
              gradleInput={gradleInput}
            />
            <AnimatedArrowDown
              className="h-6 w-6 text-purple-500 sm:hidden"
              gradleInput={gradleInput}
            />
          </div>
          <div className="space-y-2">
            <div className="flex w-full justify-between items-center gap-2 min-h-8">
              <div className="font-medium flex gap-2 items-center min-h-8">
                <Icons.kotlin className="w-6 h-6 text-foreground" />
                <span className="text-muted-foreground">Output:</span> Kotlin DSL (KTS)
              </div>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button onClick={() => handleClick()} variant="outline" className="w-8 h-8">
                      <div className="w-4 h-4 relative flex items-center justify-center">
                        <CheckIcon
                          size={16}
                          className={cn(
                            "absolute self-center opacity-0 scale-0 transition-all",
                            copyButtonClicked && "opacity-100 scale-100 text-primary",
                          )}
                        />
                        <CopyIcon
                          size={16}
                          className={cn(
                            "absolute self-center opacity-100 scale-100 transition-all",
                            copyButtonClicked && "opacity-0 scale-0",
                          )}
                        />
                      </div>
                    </Button>
                  }
                />
                <TooltipContent>Copy</TooltipContent>
              </Tooltip>
            </div>

            <div className="relative overflow-hidden">
              <div>
                <Editor
                  className="rounded-lg overflow-hidden"
                  height={500}
                  defaultLanguage="kotlin"
                  value={kotlinOutput}
                  onMount={handleKotlinEditorDidMount}
                  theme={editorTheme}
                  options={{
                    scrollbar: {
                      vertical: "visible",
                      horizontal: "visible",
                    },
                    minimap: { enabled: false },
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                  }}
                />
              </div>

              <div
                className={cn(
                  "transition-all duration-300",
                  conversionSuccess ? "opacity-100" : "opacity-0",
                )}
              >
                <BorderBeam size={400} duration={2} className="rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AnimatedArrowProps {
  className?: string;
  gradleInput: string;
}

const AnimatedArrowRight: React.FC<AnimatedArrowProps> = ({ className, gradleInput }) => {
  const controls = useAnimation();

  useEffect(() => {
    const animateArrow = async (): Promise<void> => {
      await controls.start({ x: 5, transition: { duration: 0.2 } });
      await controls.start({ x: 0, transition: { duration: 0.2 } });
    };

    animateArrow();
  }, [gradleInput, controls]);

  return (
    <motion.div animate={controls}>
      <ArrowRight className={className} />
    </motion.div>
  );
};

const AnimatedArrowDown: React.FC<AnimatedArrowProps> = ({ className, gradleInput }) => {
  const controls = useAnimation();

  useEffect(() => {
    const animateArrow = async (): Promise<void> => {
      await controls.start({ y: 5, transition: { duration: 0.2 } });
      await controls.start({ y: 0, transition: { duration: 0.2 } });
    };

    animateArrow();
  }, [gradleInput, controls]);

  return (
    <motion.div animate={controls}>
      <ArrowDown className={className} />
    </motion.div>
  );
};
