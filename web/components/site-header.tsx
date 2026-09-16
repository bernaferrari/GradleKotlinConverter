import Link from "next/link";

import { siteConfig } from "@/config/site";
import { Icons } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-card focus:p-4"
      >
        Skip to converter
      </a>
      <div className="mx-auto flex h-14 max-w-[1248px] items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-3 text-sm font-semibold tracking-tight"
        >
          <Icons.logo className="size-8" aria-hidden="true" />
          <span>
            Gradle <span className="font-normal text-muted-foreground">to</span> Kotlin
          </span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-1">
          <a
            href={siteConfig.links.github}
            target="_blank"
            rel="noreferrer"
            className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="View source on GitHub (opens in a new tab)"
          >
            <Icons.gitHub className="size-4" />
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
