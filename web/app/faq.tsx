import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { siteConfig } from "@/config/site";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const questions = [
  {
    question: "Will this convert my entire build?",
    answer:
      "The converter handles common Gradle patterns, including plugins, dependencies, Android configuration, and tasks. Custom plugins and complex Groovy logic may need manual changes. Review the output and run your build before committing it.",
  },
  {
    question: "Why use Kotlin DSL?",
    answer:
      "Kotlin DSL brings static typing, code completion, and refactoring support to your build scripts. It can make build logic easier to navigate, especially if your project already uses Kotlin.",
  },
  {
    question: "Where does the conversion happen?",
    answer:
      "The conversion engine runs locally in your browser. No server request is needed to translate your script, and no account or API key is required.",
  },
];

export function FAQ() {
  return (
    <section
      aria-labelledby="faq-title"
      className="grid gap-6 border-b py-8 sm:py-10 md:grid-cols-[1fr_1.7fr] md:gap-16"
    >
      <div>
        <h2 id="faq-title" className="text-base font-semibold">
          Common questions
        </h2>
        <Link
          href="/faq"
          className="mt-2 block text-sm text-foreground underline underline-offset-4"
        >
          Read the migration FAQ
        </Link>
        <a
          href={`${siteConfig.links.github}/issues`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:underline"
        >
          Report a conversion issue
          <ArrowUpRight className="size-4" />
        </a>
      </div>
      <Accordion className="w-full">
        {questions.map(({ question, answer }, index) => (
          <AccordionItem key={question} value={`question-${index}`}>
            <AccordionTrigger>{question}</AccordionTrigger>
            <AccordionContent className="max-w-prose">{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
