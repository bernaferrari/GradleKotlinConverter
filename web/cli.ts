#!/usr/bin/env node

/**
 * CLI tool for converting Gradle Groovy DSL to Kotlin DSL
 *
 * Usage:
 *   pnpm cli < build.gradle
 *   pnpm cli build.gradle
 *   cat build.gradle | pnpm cli
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { GradleToKtsConverter } from "./app/logic";

async function main() {
  try {
    const converter = new GradleToKtsConverter();
    let input = "";

    // Check if file is provided as argument
    if (process.argv[2]) {
      const filePath = resolve(process.argv[2]);
      try {
        input = readFileSync(filePath, "utf-8");
      } catch {
        console.error(`Error: File not found: ${filePath}`);
        process.exit(1);
      }
    }
    // Otherwise read from stdin
    else if (!process.stdin.isTTY) {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk as Buffer);
      }
      input = Buffer.concat(chunks).toString("utf-8");
    } else {
      console.error("Usage: pnpm cli <file> or pipe input via stdin");
      console.error("Examples:");
      console.error("  pnpm cli build.gradle");
      console.error("  pnpm cli build.gradle > build.gradle.kts");
      console.error("  cat build.gradle | pnpm cli");
      console.error("  pnpm cli < build.gradle");
      process.exit(1);
    }

    // Convert and output
    const output = converter.convert(input);
    console.log(output);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
