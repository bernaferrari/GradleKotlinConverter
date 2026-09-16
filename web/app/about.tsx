import { ArrowUpRight } from "lucide-react";
import { siteConfig } from "@/config/site";

export function About() {
  return (
    <footer className="flex flex-col justify-between gap-5 py-8 text-xs leading-6 text-muted-foreground sm:flex-row sm:items-center">
      <p>
        Created by{" "}
        <a
          href="https://github.com/bernaferrari"
          target="_blank"
          rel="noreferrer"
          className="text-foreground hover:underline"
        >
          Bernardo Ferrari
        </a>
      </p>
      <nav aria-label="Footer" className="flex flex-wrap items-center gap-6">
        <a
          href={siteConfig.links.github}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center hover:text-foreground hover:underline"
        >
          Free & open source
        </a>
        <a
          href="mailto:bernaferrari2@gmail.com"
          className="inline-flex min-h-11 items-center hover:text-foreground"
        >
          Contact
        </a>
        <a
          href={siteConfig.links.github}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-1 hover:text-foreground"
        >
          Contribute
          <ArrowUpRight className="size-3.5" />
        </a>
      </nav>
    </footer>
  );
}
