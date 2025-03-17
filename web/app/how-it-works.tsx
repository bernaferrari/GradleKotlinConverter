import { Code, Coffee, ColumnsIcon, Zap } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

export const HowItWorks = () => {
  return (
    <Card className="w-full max-w-5xl bg-card/50">
      <CardContent className="p-6">
        <h2 className="mb-4 text-2xl font-semibold">How It Works</h2>
        <p className="mb-6 text-neutral-600 dark:text-neutral-300">
          Follow these simple steps to convert your Gradle scripts:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                <Code size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold text-base">1. Input Groovy Code</h3>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Paste your Groovy-based Gradle script into the left editor.
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                <Zap size={20} className="text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-base">
                2. Automatic Conversion
              </h3>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
              The tool processes your code and generates the Kotlin DSL
              equivalent.
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-lime-100 dark:bg-lime-900/40 rounded-lg">
                <ColumnsIcon size={20} className="text-lime-600 dark:text-lime-400" />
              </div>
              <h3 className="font-semibold text-base">3. Review Output</h3>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Check the converted Kotlin KTS code in the right panel and see if
              it worked well.
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                <Coffee
                  size={20}
                  className="text-yellow-600 dark:text-yellow-400"
                />
              </div>
              <h3 className="font-semibold text-base">4. Copy and Use</h3>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Use the copy button to transfer the code to your clipboard and
              integrate it into your project.
            </p>
          </div>
        </div>
        <p className="mt-6 text-neutral-600 dark:text-neutral-300">
          While the converter handles most cases, complex configurations might
          need manual adjustments. Please always review the output.
        </p>
      </CardContent>
    </Card>
  )
}
