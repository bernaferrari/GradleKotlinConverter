"use client"

import { useEffect, useRef, useState } from "react"
import Editor, { OnMount } from "@monaco-editor/react"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { AnimationControls, motion, useAnimation } from "framer-motion"
import {
  ArrowDown,
  ArrowRight,
  CheckIcon,
  ClipboardPasteIcon,
  CopyIcon,
  RotateCcwIcon,
} from "lucide-react"
import * as monaco from "monaco-editor"
import { useTheme } from "next-themes"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { BorderBeam } from "@/components/magicui/border-beam"

import { defaultExample } from "./default-example"
import { GradleToKtsConverter } from "./logic"

const converter = new GradleToKtsConverter() // Assuming you've imported this class

export default function CodeEditors() {
  const [gradleInput, setGradleInput] = useState(defaultExample)
  const [kotlinOutput, setKotlinOutput] = useState("")
  const gradleEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null
  )
  const kotlinEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null
  )
  const { resolvedTheme } = useTheme()
  const [editorTheme, setEditorTheme] = useState<"vs-dark" | "light">("vs-dark")
  const [conversionSuccess, setConversionSuccess] = useState(false)
  const [copyButtonClicked, setCopyButtonClicked] = useState(false)

  // Update editor theme when app theme changes
  useEffect(() => {
    setEditorTheme(resolvedTheme === "dark" ? "vs-dark" : "light")
  }, [resolvedTheme])

  const handleClick = async () => {
    setCopyButtonClicked(true)
    await navigator.clipboard.writeText(
      kotlinEditorRef.current?.getValue() || ""
    )
    toast.success("Copied")

    setTimeout(() => {
      setCopyButtonClicked(false)
    }, 1000)
  }

  useEffect(() => {
    const convertGradleToKotlin = () => {
      if (gradleInput.trim() === "") {
        setKotlinOutput("")
        setConversionSuccess(false)
        return null
      }
      try {
        const converted = converter.convert(gradleInput)
        setKotlinOutput(converted)
        setConversionSuccess(true)
        setTimeout(() => setConversionSuccess(false), 750)
      } catch (error) {
        console.error("Conversion error:", error)
        setConversionSuccess(false)
        toast.error("Conversion Failed", {
          description: "An error occurred during the conversion process.",
        })
      }
    }

    const debounce = setTimeout(convertGradleToKotlin, 300)
    return () => clearTimeout(debounce)
  }, [gradleInput])

  const handleGradleEditorDidMount: OnMount = (editor) => {
    gradleEditorRef.current = editor
  }

  const handleKotlinEditorDidMount: OnMount = (editor) => {
    kotlinEditorRef.current = editor
  }

  const handleReset = () => {
    setGradleInput(defaultExample)
    toast.info("Restored to default")
  }

  const handlePaste = () => {
    navigator.clipboard.readText().then((text) => setGradleInput(text))
  }

  return (
    <Card className="w-full max-w-5xl bg-card/50 p-0">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4 items-start">
          <div className="space-y-2">
            <div className="flex w-full justify-between items-center gap-2 min-h-8">
              <div className="font-medium flex items-center gap-2">
                <GroovyIcon />
                <span className="text-muted-foreground">Input:</span> Groovy
              </div>
              <div className="flex justify-center gap-2">
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handlePaste}
                        size={"icon"}
                        className="w-8 h-8"
                        variant="outline"
                      >
                        <ClipboardPasteIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Paste</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleReset}
                        size={"icon"}
                        className="w-8 h-8"
                        variant="outline"
                      >
                        <RotateCcwIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Restore to default</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
                <KotlinIcon />
                <span className="text-muted-foreground">Output:</span> Kotlin
                DSL (KTS)
              </div>

              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => handleClick()}
                      variant="outline"
                      className="w-8 h-8"
                    >
                      <div className="w-4 h-4 relative flex items-center justify-center">
                        <CheckIcon
                          size={16}
                          className={cn(
                            "absolute self-center opacity-0 scale-0 transition-all",
                            copyButtonClicked &&
                              "opacity-100 scale-100 text-primary"
                          )}
                        />
                        <CopyIcon
                          size={16}
                          className={cn(
                            "absolute self-center opacity-100 scale-100 transition-all",
                            copyButtonClicked && "opacity-0 scale-0"
                          )}
                        />
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy</TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
                  conversionSuccess ? "opacity-100" : "opacity-0"
                )}
              >
                <BorderBeam size={400} duration={2} className="rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const GroovyIcon = () => {
  return (
    <svg
      width="128"
      height="128"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6 text-foreground"
    >
      <g clipPath="url(#clip0_170_8)">
        <path
          d="M103.93 17.205C99.7775 17.7738 95.9029 19.614 92.838 22.473C92.6481 22.6523 92.4956 22.8675 92.3891 23.106C92.2827 23.3446 92.2246 23.6019 92.218 23.863C92.2216 24.3885 92.4288 24.8921 92.796 25.268L95.321 27.881C95.6503 28.2107 96.0873 28.4106 96.5521 28.444C97.0168 28.4775 97.478 28.3422 97.851 28.063C99.8565 26.5493 102.302 25.7341 104.815 25.742C107.118 25.7333 109.372 26.4094 111.29 27.6844C113.208 28.9594 114.704 30.7758 115.588 32.9028C116.471 35.0298 116.703 37.3714 116.253 39.6302C115.803 41.889 114.691 43.9631 113.06 45.589C96.95 61.701 75.444 16.565 26.637 39.786C25.8076 40.1742 25.0676 40.7299 24.4634 41.4181C23.8592 42.1063 23.4039 42.9121 23.1263 43.7847C22.8486 44.6574 22.7546 45.5781 22.8501 46.4889C22.9455 47.3997 23.2285 48.2809 23.681 49.077L32.046 63.553C32.9194 65.0587 34.3493 66.1611 36.0277 66.6225C37.7062 67.084 39.4987 66.8676 41.019 66.02L41.222 65.906L41.062 66.02L44.772 63.938C48.9066 61.3697 52.813 58.4509 56.448 55.214C56.8205 54.8947 57.2949 54.7192 57.7855 54.7192C58.2761 54.7192 58.7506 54.8947 59.123 55.214C59.3479 55.3897 59.5303 55.6138 59.6567 55.8697C59.7831 56.1256 59.8502 56.4066 59.853 56.692C59.8578 56.97 59.8031 57.2457 59.6925 57.5008C59.582 57.7559 59.4181 57.9844 59.212 58.171C55.3835 61.5698 51.2644 64.6265 46.902 67.306H46.782L43.07 69.377C41.5017 70.2628 39.7293 70.724 37.928 70.715C36.0665 70.7158 34.237 70.2295 32.6215 69.3045C31.006 68.3795 29.6607 67.0479 28.719 65.442L20.807 51.768C5.61304 62.5 -3.60696 83.18 1.34504 109.416C1.43297 109.855 1.66934 110.25 2.01442 110.536C2.3595 110.821 2.79228 110.979 3.24004 110.983H12.255C12.7236 110.983 13.176 110.811 13.5268 110.501C13.8777 110.19 14.1029 109.762 14.16 109.297C14.5619 106.107 16.1141 103.173 18.5255 101.047C20.9368 98.9202 24.0414 97.7467 27.2565 97.7467C30.4717 97.7467 33.5763 98.9202 35.9876 101.047C38.3989 103.173 39.9512 106.107 40.353 109.297C40.4137 109.763 40.6414 110.19 40.9939 110.5C41.3464 110.811 41.7995 110.982 42.269 110.983H51.055C51.5236 110.983 51.976 110.811 52.3268 110.501C52.6777 110.19 52.9029 109.762 52.96 109.297C53.3725 106.113 54.93 103.188 57.3417 101.069C59.7533 98.9495 62.854 97.7806 66.0645 97.7806C69.2751 97.7806 72.3758 98.9495 74.7874 101.069C77.199 103.188 78.7566 106.113 79.169 109.297C79.2261 109.762 79.4514 110.19 79.8022 110.501C80.1531 110.811 80.6055 110.983 81.074 110.983H89.746C90.2511 110.985 90.7365 110.787 91.097 110.433C91.4576 110.08 91.6641 109.598 91.672 109.093C91.879 96.87 95.175 82.826 104.576 75.79C137.138 51.431 128.583 30.55 121.045 22.967C118.83 20.751 116.133 19.0776 113.164 18.078C110.194 17.0784 107.034 16.7796 103.93 17.205ZM84.692 52.866C85.5673 52.6726 86.4825 52.7864 87.2837 53.1884C88.0849 53.5904 88.7233 54.256 89.0915 55.0732C89.4597 55.8905 89.5353 56.8097 89.3056 57.6761C89.0759 58.5426 88.5548 59.3035 87.83 59.831V59.811L81.62 56.692C81.6166 55.7989 81.9198 54.9317 82.479 54.2353C83.0381 53.539 83.8193 53.0556 84.692 52.866Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_170_8">
          <rect width="128" height="128" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

const KotlinIcon = () => {
  return (
    <svg
      width="128"
      height="128"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-6 h-6 text-foreground"
    >
      <path
        d="M112.484 112.484H15.5161V15.516H112.484L64.0001 64L112.484 112.484Z"
        fill="url(#paint0_linear_170_6)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_170_6"
          x1="112.485"
          y1="15.5146"
          x2="15.5153"
          y2="112.484"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.003" stopColor="#E44857" />
          <stop offset="0.469" stopColor="#C711E1" />
          <stop offset="1" stopColor="#7F52FF" />
        </linearGradient>
      </defs>
    </svg>
  )
}

interface AnimatedArrowProps {
  className?: string
  gradleInput: string
}

const AnimatedArrowRight: React.FC<AnimatedArrowProps> = ({
  className,
  gradleInput,
}) => {
  const controls: AnimationControls = useAnimation()

  useEffect(() => {
    const animateArrow = async (): Promise<void> => {
      await controls.start({ x: 5, transition: { duration: 0.2 } })
      await controls.start({ x: 0, transition: { duration: 0.2 } })
    }

    animateArrow()
  }, [gradleInput, controls])

  return (
    <motion.div animate={controls}>
      <ArrowRight className={className} />
    </motion.div>
  )
}

const AnimatedArrowDown: React.FC<AnimatedArrowProps> = ({
  className,
  gradleInput,
}) => {
  const controls: AnimationControls = useAnimation()

  useEffect(() => {
    const animateArrow = async (): Promise<void> => {
      await controls.start({ y: 5, transition: { duration: 0.2 } })
      await controls.start({ y: 0, transition: { duration: 0.2 } })
    }

    animateArrow()
  }, [gradleInput, controls])

  return (
    <motion.div animate={controls}>
      <ArrowDown className={className} />
    </motion.div>
  )
}
