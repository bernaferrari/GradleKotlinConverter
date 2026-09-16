import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { About } from "./about";
import CodeEditors from "./code-editors";
import { FAQ } from "./faq";
import { HowItWorks } from "./how-it-works";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <main id="main-content" className="mx-auto w-full max-w-[1248px] px-5 sm:px-8">
      <section className="py-7 sm:py-8" aria-labelledby="page-title">
        <h1
          id="page-title"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-3xl font-semibold tracking-tighter sm:gap-x-5 sm:text-4xl"
        >
          <span>Groovy</span>
          <ArrowRight
            className="size-7 stroke-1 text-muted-foreground sm:size-8"
            aria-hidden="true"
          />
          <span className="sr-only">to</span>
          <span className="bg-linear-to-r from-brand-kotlin-start via-brand-kotlin-middle to-brand-kotlin-end bg-clip-text text-transparent">
            Kotlin DSL
          </span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
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
