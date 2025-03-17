import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent } from "@/components/ui/card"

import Client from "./code-editors"
import { PostHogProvider } from "./providers"

export default function Component() {
  return (
    <div
      className={`flex min-h-screen flex-col transition-colors duration-300`}
    >
      <main className="flex grow flex-col items-center justify-start space-y-8 p-4 sm:p-6 lg:p-8">
        <PostHogProvider>
          <Client />
        </PostHogProvider>

        <Card className="w-full max-w-5xl bg-card/50 p-0">
          <CardContent className="p-6">
            <h2 className="mb-4 text-2xl font-semibold">How It Works</h2>
            <p className="mb-4">
              This tool converts Gradle build scripts from Groovy to Kotlin DSL
              (KTS - Kotlin Script) format. It's designed to assist developers
              in modernizing their Android projects by facilitating the
              migration from Groovy-based Gradle files to the more type-safe and
              IDE-friendly Kotlin DSL.
            </p>
            <ol className="mb-4 list-inside list-decimal space-y-2">
              <li>
                Input your Groovy-based Gradle code into the editor on the left.
              </li>
              <li>The tool automatically processes and converts your code.</li>
              <li>
                View the converted Kotlin KTS code in the output field on the
                right.
              </li>
              <li>
                Use the copy button to transfer the converted code to your
                clipboard.
              </li>
            </ol>
            <p className="mb-4">
              While this converter handles most common Gradle constructs
              effectively, please note that complex or custom configurations may
              require manual adjustments post-conversion.
            </p>
            <p>
              Developed in 2019, this tool filled a crucial gap in the Android
              development ecosystem, predating both the widespread adoption of
              Kotlin KTS and the availability of official conversion tools. It
              has since been refined through valuable contributions from the
              developer community. If you encounter any issues or have
              suggestions for improvement, please submit them on our{" "}
              <a
                href="https://github.com/bernaferrari/gradlekotlinconverter"
                className="underline hover:text-blue-500"
              >
                GitHub repository
              </a>
              .
            </p>
          </CardContent>
        </Card>

        <Card className="w-full max-w-5xl bg-card/50 p-0">
          <CardContent className="p-6">
            <h2 className="mb-4 text-2xl font-semibold">FAQ</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-start">
                  How can I troubleshoot conversion issues?
                </AccordionTrigger>
                <AccordionContent>
                  If you encounter problems during the conversion process:
                  <ol className="list-decimal pl-5 mt-2">
                    <li>
                      Try converting smaller sections of your Gradle script
                      incrementally.
                    </li>
                    <li>
                      Use an AI language model (LLM) for assistance with
                      specific syntax issues.
                    </li>
                    <li>
                      Utilize Android Studio's built-in conversion tool for
                      comparison or as an alternative.
                    </li>
                    <li>
                      Consult the{" "}
                      <a
                        href="https://docs.gradle.org/current/userguide/kotlin_dsl.html"
                        className="underline hover:text-blue-500"
                      >
                        official Kotlin DSL documentation
                      </a>{" "}
                      for correct syntax and best practices.
                    </li>
                    <li>
                      If issues persist, report them on our GitHub repository
                      for community support.
                    </li>
                  </ol>
                  Remember that manual adjustments may be necessary, especially
                  for complex configurations.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-start">
                  What are the limitations of this converter?
                </AccordionTrigger>
                <AccordionContent>
                  While our converter is effective for most common Gradle
                  constructs, it has some limitations:
                  <ul className="list-disc pl-5 mt-2">
                    <li>
                      Complex or custom plugin configurations may require manual
                      adjustments.
                    </li>
                    <li>
                      Certain Groovy-specific idioms might not have direct
                      Kotlin equivalents.
                    </li>
                    <li>
                      Project-specific customizations may need review after
                      conversion.
                    </li>
                    <li>
                      The tool may not capture all recent updates to Gradle or
                      the Kotlin DSL.
                    </li>
                  </ul>
                  Always review and test the converted code in your project
                  environment to ensure it functions as expected.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-start">
                  How can I contribute to improving this tool?
                </AccordionTrigger>
                <AccordionContent>
                  We welcome contributions to enhance the converter:
                  <ul className="list-disc pl-5 mt-2">
                    <li>
                      Report bugs or suggest improvements on our GitHub
                      repository.
                    </li>
                    <li>
                      Submit pull requests with code improvements or new
                      features.
                    </li>
                    <li>
                      Share your conversion experiences to help us identify
                      common issues.
                    </li>
                    <li>
                      Contribute to the documentation to help other users.
                    </li>
                  </ul>
                  Your input is valuable in making this tool more robust and
                  useful for the entire Android development community.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
