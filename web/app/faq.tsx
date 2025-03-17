import { BookOpen } from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent } from "@/components/ui/card"

export const FAQ = () => {
  return (
    <Card className="w-full max-w-5xl bg-card/50">
      <CardContent className="p-6">
        {/* FAQ Title with Icon */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
            <BookOpen size={20} />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {/* Item 1: Benefits of Converting to Kotlin DSL */}
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-start font-semibold">
              Why switch my Gradle scripts to Kotlin DSL?
            </AccordionTrigger>
            <AccordionContent className="text-neutral-600 dark:text-neutral-300">
              <p className="mb-2">
                Converting your Gradle scripts from Groovy to Kotlin DSL brings
                several key benefits:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Type Safety:</strong> Kotlin’s static typing catches
                  errors at compile time, reducing runtime surprises.
                </li>
                <li>
                  <strong>Enhanced IDE Support:</strong> Enjoy superior
                  autocompletion, navigation, and refactoring in tools like
                  Android Studio.
                </li>
                <li>
                  <strong>Project Consistency:</strong> Align your build scripts
                  with Kotlin-based app code for a unified codebase.
                </li>
                <li>
                  <strong>Modern Syntax:</strong> Use Kotlin’s concise and
                  expressive features to streamline your build logic.
                </li>
              </ul>
              <p className="mt-2">
                These advantages make your build process more reliable and
                efficient.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Item 2: Troubleshoot Conversion Issues */}
          <AccordionItem value="item-2">
            <AccordionTrigger className="text-start font-semibold">
              How do I fix conversion problems?
            </AccordionTrigger>
            <AccordionContent className="text-neutral-600 dark:text-neutral-300">
              <p className="mb-2">If you run into issues while converting:</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Convert small script sections step-by-step to pinpoint errors
                  early.
                </li>
                <li>
                  Use an AI tool (e.g., LLM) to resolve tricky syntax questions.
                </li>
                <li>
                  Compare results with Android Studio’s built-in converter.
                </li>
                <li>
                  Refer to the{" "}
                  <a
                    href="https://docs.gradle.org/current/userguide/kotlin_dsl.html"
                    className="underline hover:text-blue-500"
                  >
                    Kotlin DSL documentation
                  </a>{" "}
                  for guidance.
                </li>
                <li>Report persistent problems on our GitHub for help.</li>
              </ol>
              <p className="mt-2">
                Complex setups might need manual tweaks, so review carefully.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Item 3: Limitations of the Converter */}
          <AccordionItem value="item-3">
            <AccordionTrigger className="text-start font-semibold">
              What are the converter’s limits?
            </AccordionTrigger>
            <AccordionContent className="text-neutral-600 dark:text-neutral-300">
              <p className="mb-2">
                Our converter handles most Gradle setups well, but watch for:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Custom plugins needing manual tweaks.</li>
                <li>Groovy idioms without direct Kotlin matches.</li>
                <li>
                  Unique project configs requiring post-conversion review.
                </li>
                <li>
                  Potential gaps with the latest Gradle/Kotlin DSL updates.
                </li>
              </ul>
              <p className="mt-2">
                Test the output thoroughly to ensure it fits your project.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Item 4: Contributing to the Tool */}
          <AccordionItem value="item-4">
            <AccordionTrigger className="text-start font-semibold">
              How can I help improve this tool?
            </AccordionTrigger>
            <AccordionContent className="text-neutral-600 dark:text-neutral-300">
              <p className="mb-2">We’d love your input to make it better:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>File bug reports or ideas on our GitHub.</li>
                <li>Submit pull requests with fixes or features.</li>
                <li>Share your conversion stories to highlight pain points.</li>
                <li>Add to our docs to assist others.</li>
              </ul>
              <p className="mt-2">
                Your contributions strengthen this tool for all Android devs.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Item 5: Using the Converted Scripts */}
          <AccordionItem value="item-5">
            <AccordionTrigger className="text-start font-semibold">
              How do I use my converted Kotlin DSL scripts?
            </AccordionTrigger>
            <AccordionContent className="text-neutral-600 dark:text-neutral-300">
              <p className="mb-2">After conversion, here’s how to proceed:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Rename files (e.g., <code>build.gradle</code> to{" "}
                  <code>build.gradle.kts</code>).
                </li>
                <li>
                  Update any script references to the new <code>.kts</code>{" "}
                  extension.
                </li>
                <li>Run a Gradle sync in your IDE to validate the changes.</li>
                <li>
                  Test your build to confirm everything works as expected.
                </li>
              </ul>
              <p className="mt-2">
                Use version control to safely rollback if issues arise.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
