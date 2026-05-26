import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import { GradleToKtsConverter } from "./logic";

const fixturesDir = join(__dirname, "fixtures/golden");
const fixtureInputs = readdirSync(fixturesDir)
  .filter((file) => file.endsWith(".gradle"))
  .sort();

describe("golden Gradle conversion fixtures", () => {
  const converter = new GradleToKtsConverter();

  it.each(fixtureInputs)("%s", (inputFile) => {
    const inputPath = join(fixturesDir, inputFile);
    const expectedPath = join(fixturesDir, inputFile.replace(/\.gradle$/, ".gradle.kts"));
    const input = readFileSync(inputPath, "utf-8");
    const expected = readFileSync(expectedPath, "utf-8");

    expect(converter.convert(input)).toBe(expected);
  });

  it("has matching expected output for every input fixture", () => {
    const expectedFiles = new Set(
      readdirSync(fixturesDir)
        .filter((file) => file.endsWith(".gradle.kts"))
        .map((file) => file.replace(/\.gradle\.kts$/, ".gradle")),
    );

    expect(fixtureInputs.map((file) => basename(file))).toEqual([...expectedFiles].sort());
  });
});
