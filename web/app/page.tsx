import { ArrowRight } from "lucide-react";

import { About } from "./about";
import CodeEditors from "./code-editors";
import { FAQ } from "./faq";
import { HowItWorks } from "./how-it-works";

export default function Home() {
  return (
    <main id="main-content" className="mx-auto w-full max-w-[1248px] px-5 sm:px-8">
      <section className="pt-12 pb-9 sm:pt-16 sm:pb-12" aria-labelledby="page-title">
        <h1
          id="page-title"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-3xl font-semibold tracking-tighter sm:gap-x-5 sm:text-5xl"
        >
          <span>Groovy</span>
          <ArrowRight
            className="size-7 stroke-1 text-muted-foreground sm:size-9"
            aria-hidden="true"
          />
          <span className="sr-only">to</span>
          <span className="bg-linear-to-r from-brand-kotlin-start via-brand-kotlin-middle to-brand-kotlin-end bg-clip-text text-transparent">
            Kotlin DSL
          </span>
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          Paste your Groovy build script. Edit and copy the Kotlin result.
        </p>
      </section>
      <CodeEditors />
      <HowItWorks />
      <FAQ />
      <About />
    </main>
  );
}
