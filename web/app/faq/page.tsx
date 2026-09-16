import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { siteConfig } from "@/config/site";

const title = "Groovy to Kotlin DSL: Help & FAQ";
const description =
  "How to convert build.gradle to build.gradle.kts, review the Kotlin output, migrate modules gradually, and troubleshoot Gradle Kotlin DSL errors.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/faq" },
  openGraph: {
    title,
    description,
    url: "/faq",
    siteName: siteConfig.name,
    images: "/opengraph-image.png",
  },
  twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image.png"] },
};

const questions = [
  {
    id: "convert",
    question: "How do I convert build.gradle to build.gradle.kts?",
    answer:
      "Paste your Groovy script into the left editor. The Kotlin result updates as you edit. Review the result, then copy or download it. Save it as build.gradle.kts in the same module, replacing the original build.gradle after backing it up or committing it to version control. Sync Gradle and run your project's build and tests before committing the migration.",
  },
  {
    id: "syntax",
    question: "What changes between Groovy and Kotlin DSL?",
    answer:
      "Kotlin uses double-quoted strings and explicit function-call parentheses. Many property assignments need an equals sign. Gradle APIs and plugin configuration can also differ, so renaming the extension alone is not a migration. Here is a simple dependency declaration in both formats.",
  },
  {
    id: "coverage",
    question: "Will the converter handle my entire build?",
    answer:
      "It handles common patterns such as plugins, dependencies, Android configuration, and tasks. Treat the output as a migration starting point. Custom plugin APIs, dynamic Groovy code, and complex build logic can require manual changes. The converter does not run Gradle or verify that the result compiles with your project's plugin versions.",
  },
  {
    id: "incremental",
    question: "Do I have to migrate every module at once?",
    answer:
      "No. Groovy and Kotlin DSL scripts can coexist in one Gradle build. Migrate one script at a time and verify each change before moving to the next module. Each converted script should use its Kotlin filename; do not keep both versions of the same script as competing build files.",
  },
  {
    id: "settings",
    question: "What about settings.gradle and other build files?",
    answer:
      "A project's settings script and module build scripts have different responsibilities. Migrating build.gradle does not automatically migrate settings.gradle, convention plugins, or buildSrc. Review these separately. A Kotlin settings script uses the name settings.gradle.kts.",
  },
  {
    id: "errors",
    question: "Why does the converted script show unresolved references?",
    answer:
      "Check which plugin provides the referenced property or function and whether it is applied to that module. Consult that plugin's Kotlin DSL examples for your installed version. Some Groovy conventions have no direct Kotlin equivalent. Start with the first Gradle error, fix it, and sync again; later errors can be consequences of the first one.",
  },
  {
    id: "privacy",
    question: "Does the converter upload my build script?",
    answer:
      "The conversion engine runs in your browser and does not need a server request to translate the script. No account or API key is required. Conversion does not execute your script or resolve its dependencies.",
  },
  {
    id: "reporting",
    question: "How can I report an incorrect conversion?",
    answer:
      "Open a GitHub issue with a small Groovy example, the converter's output, and the Kotlin code you expected. Include relevant Gradle and plugin versions. Remove credentials, private repository addresses, and other sensitive project details before posting.",
  },
];

export default function FAQPage() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <ArrowLeft className="size-4" />
        Back to the converter
      </Link>
      <header className="mb-10 mt-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          A smoother move to Kotlin DSL.
        </h1>
        <p className="mt-4 max-w-prose text-base leading-7 text-muted-foreground">
          Answers to common conversion questions, with practical steps for taking the result back to
          your Gradle project.
        </p>
      </header>
      {questions.map(({ id, question, answer }) => (
        <section
          key={id}
          id={id}
          aria-labelledby={`${id}-title`}
          className="scroll-mt-24 border-t py-7"
        >
          <h2 id={`${id}-title`} className="text-lg font-medium tracking-tight">
            {question}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{answer}</p>
          {id === "syntax" && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                {
                  name: "build.gradle",
                  code: "dependencies {\n    implementation 'com.example:library:1.0'\n}",
                },
                {
                  name: "build.gradle.kts",
                  code: 'dependencies {\n    implementation("com.example:library:1.0")\n}',
                },
              ].map(({ name, code }) => (
                <figure key={name} className="min-w-0 overflow-hidden rounded-xl border bg-card">
                  <figcaption className="border-b px-4 py-3 font-mono text-xs text-muted-foreground">
                    {name}
                  </figcaption>
                  <pre className="overflow-x-auto p-4 font-mono text-xs leading-6">
                    <code>{code}</code>
                  </pre>
                </figure>
              ))}
            </div>
          )}
        </section>
      ))}
      <aside className="border-t py-7">
        <h2 className="text-lg font-medium">Keep the Gradle docs close</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          For plugin configuration and migration details, see the{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href="https://docs.gradle.org/current/userguide/migrating_from_groovy_to_kotlin_dsl.html"
          >
            official Groovy-to-Kotlin migration guide
          </a>
          .
        </p>
      </aside>
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t py-6 text-sm">
        <Link href="/" className="font-medium underline underline-offset-4">
          Convert a build script
        </Link>
        <a
          href={`${siteConfig.links.github}/issues`}
          className="text-muted-foreground hover:text-foreground"
        >
          Report a conversion issue
        </a>
      </footer>
    </main>
  );
}
