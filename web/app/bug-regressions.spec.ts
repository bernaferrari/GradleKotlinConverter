import { describe, it, expect } from "vitest";
import { GradleToKtsConverter } from "./logic";

/**
 * Regression tests for confirmed converter bugs (clean-task swallow, empty maps,
 * array indexing, ternaries, idempotency, buildToolsVersion, comment-line skip,
 * outputs.all alias, mid-file ext blocks) and their edge-case follow-ups.
 */
describe("Bug regressions", () => {
  const converter = new GradleToKtsConverter();

  it("1: task clean does not swallow trailing content (allprojects)", () => {
    const input = `task clean(type: Delete) {
    delete rootProject.buildDir
}
allprojects {
    repositories {
        mavenCentral()
    }
}`;
    const result = converter.convert(input);
    expect(result).toContain('tasks.register<Delete>("clean")');
    expect(result).toContain("allprojects {");
    expect(result).toContain("mavenCentral()");
    expect(result).not.toContain("task clean");
  });

  it("1b: nested braces inside clean still preserve trailing content", () => {
    const input = `task clean(type: Delete) {
    doLast {
        delete rootProject.buildDir
    }
}
allprojects {
    repositories {
        mavenCentral()
    }
}`;
    const result = converter.convert(input);
    expect(result).toContain('tasks.register<Delete>("clean")');
    expect(result).toContain("allprojects {");
    expect(result).toContain("mavenCentral()");
    expect(result).not.toContain("task clean");
  });

  it("2: empty Groovy map [:] becomes mapOf()", () => {
    const input = "manifestPlaceholders = [:]";
    const result = converter.convert(input);
    expect(result).toContain("mapOf()");
    expect(result).not.toContain("listOf(:)");
    expect(result).not.toContain("[:]");
  });

  it("2b: spaced empty map [ : ] becomes mapOf()", () => {
    const result = converter.convert("manifestPlaceholders = [ : ]");
    expect(result).toContain("mapOf()");
    expect(result).not.toContain("listOf");
  });

  it("2c: non-empty map still converts to mapOf entries", () => {
    const result = converter.convert('manifestPlaceholders = [appIcon: "@drawable/ic"]');
    expect(result).toContain('mapOf("appIcon" to "@drawable/ic")');
  });

  it("2d: empty list [] is not treated as empty map", () => {
    const result = converter.convert("def xs = []");
    expect(result).not.toContain("mapOf()");
    // empty [] without receiver stays as [] historically
    expect(result).toContain("[]");
  });

  it("2e: [:] inside strings and comments is left alone", () => {
    const input = `println "[:] empty"
// use [:]
manifestPlaceholders = [:]`;
    const result = converter.convert(input);
    expect(result).toContain('println "[:] empty"');
    expect(result).toContain("// use [:]");
    expect(result).toContain("mapOf()");
  });

  it("3: array indexing with a variable is preserved", () => {
    const input = "def code = versionCodes[abiName]";
    const result = converter.convert(input);
    expect(result).toContain("versionCodes[abiName]");
    expect(result).not.toContain("listOf(abiName)");
    expect(result).not.toContain("versionCodeslistOf");
  });

  it("3b: array indexing with a numeric index is preserved", () => {
    const input = "def code = versionCodes[0]";
    const result = converter.convert(input);
    expect(result).toContain("versionCodes[0]");
  });

  it("3c: list literals still convert to listOf", () => {
    const input = "def xs = [1, 2, 3]";
    const result = converter.convert(input);
    expect(result).toContain("listOf(1, 2, 3)");
  });

  it("3d: spaced array indexing is preserved", () => {
    const result = converter.convert("def code = versionCodes [abiName]");
    expect(result).toContain("versionCodes [abiName]");
    expect(result).not.toContain("listOf(abiName)");
  });

  it("3e: )[ and ][ receivers are preserved", () => {
    const result = converter.convert(`def a = getVersions()[0]
def b = matrix[i][j]`);
    expect(result).toContain("getVersions()[0]");
    expect(result).toContain("matrix[i][j]");
    expect(result).not.toContain("listOf");
  });

  it("3f: spaced method-call list args still convert to listOf", () => {
    const result = converter.convert('dependsOn ["clean", "build"]');
    expect(result).toContain('listOf("clean", "build")');
    expect(result).not.toMatch(/dependsOn\s+\[/);
  });

  it("3g: spaced single-string method arg still converts to listOf", () => {
    const result = converter.convert('srcDirs ["src/main/kotlin"]');
    expect(result).toContain('listOf("src/main/kotlin")');
  });

  it("3h: spaced single-variable method args still convert to listOf", () => {
    const result = converter.convert(`dependsOn [clean]
from [generatedDir]`);
    expect(result).toContain("dependsOn listOf(clean)");
    expect(result).toContain("from listOf(generatedDir)");
  });

  it("4: ternary false-branch colon is not rewritten to =", () => {
    const input = 'def name = isCi ? ciName : "local"';
    const result = converter.convert(input);
    expect(result).toContain('isCi ? ciName : "local"');
    expect(result).not.toContain("ciName = ");
  });

  it("4b: named parameter colons still convert to =", () => {
    const input = 'testImplementation(group: "junit", name: "junit", version: "4.12")';
    const result = converter.convert(input);
    expect(result).toContain('group = "junit"');
    expect(result).toContain('name = "junit"');
    expect(result).toContain('version = "4.12"');
  });

  it("4c: ? inside strings does not block later named params", () => {
    const input = 'exclude(group: "foo?", module: "bar")';
    const result = converter.convert(input);
    expect(result).toContain('group = "foo?"');
    expect(result).toContain('module = "bar"');
    expect(result).not.toContain("module:");
  });

  it("4d: multiline ternary false-branch colon is preserved", () => {
    const input = `def name = isCi ?
    ciName : "local"`;
    const result = converter.convert(input);
    expect(result).toContain('ciName : "local"');
    expect(result).not.toContain("ciName = ");
  });

  it("4e: mixed ternary and named params on one line", () => {
    const input = 'foo(isCi ? ciName : "local", group: "junit")';
    const result = converter.convert(input);
    expect(result).toContain('isCi ? ciName : "local"');
    expect(result).toContain('group = "junit"');
    expect(result).not.toContain("ciName = ");
  });

  it("4f: safe-navigation ?. does not block later named params", () => {
    const input = 'foo(obj?.bar, group: "junit")';
    const result = converter.convert(input);
    expect(result).toContain("obj?.bar");
    expect(result).toContain('group = "junit"');
    expect(result).not.toContain("group:");
  });

  it("4g: elvis ?: does not break ternary or named params", () => {
    const ternary = converter.convert('def name = isCi ? ciName : "local"');
    expect(ternary).toContain('isCi ? ciName : "local"');

    const named = converter.convert('foo(value ?: "default", group: "junit")');
    expect(named).toContain('group = "junit"');
    expect(named).toContain('value ?: "default"');
  });

  it("5: already-converted getByName is not double-wrapped", () => {
    const input = 'signingConfig = signingConfigs.getByName("release")';
    const result = converter.convert(input);
    expect(result).toContain('signingConfigs.getByName("release")');
    expect(result).not.toContain('getByName("getByName');
  });

  it("5b: groovy signingConfig signingConfigs.release still converts", () => {
    const input = "signingConfig signingConfigs.release";
    const result = converter.convert(input);
    expect(result).toBe('signingConfig = signingConfigs.getByName("release")');
  });

  it("5c: already-converted named() buildTypes is not double-wrapped", () => {
    const input = `buildTypes {
    named("release") {
        minifyEnabled true
    }
}`;
    const result = converter.convert(input);
    expect(result).toContain('named("release")');
    expect(result).not.toContain('named("named")');
    expect(result).toContain("isMinifyEnabled = true");
  });

  it("5d: convert-twice is idempotent for signing and buildTypes", () => {
    const signingGroovy = "signingConfig signingConfigs.release";
    const once = converter.convert(signingGroovy);
    const twice = converter.convert(once);
    expect(twice).toBe(once);

    const buildTypesGroovy = `buildTypes {
    release {
        minifyEnabled true
    }
}`;
    const btOnce = converter.convert(buildTypesGroovy);
    const btTwice = converter.convert(btOnce);
    expect(btTwice).toBe(btOnce);
    expect(btOnce).toContain('named("release")');
  });

  it('7: buildToolsVersion "34.0.0" gets an equals', () => {
    const input = 'buildToolsVersion "34.0.0"';
    const result = converter.convert(input);
    expect(result).toBe('buildToolsVersion = "34.0.0"');
  });

  it("8: property after // comment line is still converted", () => {
    const input = `// the namespace
namespace "com.example"`;
    const result = converter.convert(input);
    expect(result).toContain('namespace = "com.example"');
  });

  it("9: outputs.all with extra spaces keeps outputs prefix", () => {
    const input = `variant.outputs.all  { output ->
    output.versionCodeOverride = 1
}`;
    const result = converter.convert(input);
    expect(result).toContain("outputs.all { val output = this");
    expect(result).not.toContain("applicationVariants.all");
    expect(result).not.toContain("->");
  });

  it("9b: applicationVariants.all still aliases correctly", () => {
    const input = `applicationVariants.all { variant ->
    println(variant.name)
}`;
    const result = converter.convert(input);
    expect(result).toContain("applicationVariants.all { val variant = this");
  });

  it("10: mid-file ext { } does not emit stray TODO for the header", () => {
    const input = `android {
}

ext {
    foo = 1
}`;
    const result = converter.convert(input);
    expect(result).toContain('extra["foo"] = 1');
    expect(result).not.toContain("TODO: manually convert ext block line: ext {");
  });

  it("10b: mid-file ext { } keeps its separating newline", () => {
    const input = `android {
}
ext {
    foo = 1
}`;
    const result = converter.convert(input);
    expect(result).toContain('}\nextra["foo"] = 1');
    expect(result).not.toContain('}extra["foo"] = 1');
  });
});
