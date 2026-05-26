import { describe, expect, it } from "vitest";
import { GradleToKtsConverter } from "./logic";

describe("README conversion capability examples", () => {
  const converter = new GradleToKtsConverter();

  it.each([
    {
      capability: "apostrophe strings",
      input: "'kotlin-android'",
      expected: '"kotlin-android"',
    },
    {
      capability: "def variables",
      input: 'def appcompat = "1.0.0"',
      expected: 'val appcompat = "1.0.0"',
    },
    {
      capability: "apply plugin",
      input: 'apply plugin: "kotlin-kapt"',
      expected: 'apply(plugin = "kotlin-kapt")',
    },
    {
      capability: "simple dependency",
      input: 'implementation "androidx.appcompat:appcompat:1.7.0"',
      expected: 'implementation("androidx.appcompat:appcompat:1.7.0")',
    },
    {
      capability: "maven shorthand",
      input: 'maven { url "https://jitpack.io" }',
      expected: 'maven("https://jitpack.io")',
    },
    {
      capability: "versionCode",
      input: "versionCode 4",
      expected: "versionCode = 4",
    },
    {
      capability: "proguardFiles",
      input:
        'proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"',
      expected:
        'setProguardFiles(listOf(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"))',
    },
    {
      capability: "sourceCompatibility",
      input: 'sourceCompatibility = "1.8"',
      expected: "sourceCompatibility = JavaVersion.VERSION_1_8",
    },
    {
      capability: "include",
      input: 'include ":app", ":diffutils"',
      expected: 'include(":app", ":diffutils")',
    },
    {
      capability: "signingConfig property",
      input: "signingConfig signingConfigs.release",
      expected: 'signingConfig = signingConfigs.getByName("release")',
    },
    {
      capability: "extra property",
      input: "ext.enableCrashlytics = false",
      expected: 'extra["enableCrashlytics"] = false',
    },
    {
      capability: "parameter colons",
      input: 'testImplementation(group: "junit", name: "junit", version: "4.12")',
      expected: 'testImplementation(group = "junit", name = "junit", version = "4.12")',
    },
  ])("$capability", ({ input, expected }) => {
    expect(converter.convert(input)).toBe(expected);
  });

  it("converts androidExtensions experimental flag", () => {
    const input = `androidExtensions {
    experimental = true
}`;
    const expected = `androidExtensions {
    isExperimental = true
}`;
    expect(converter.convert(input)).toBe(expected);
  });

  it("converts signingConfigs nested blocks", () => {
    const input = `signingConfigs {
    debug {
        storeFile file(DEBUG_STORE_FILE)
    }
}`;
    const expected = `signingConfigs {
    register("debug") {
        storeFile = file(DEBUG_STORE_FILE)
    }
}`;
    expect(converter.convert(input)).toBe(expected);
  });

  it("converts buildTypes nested blocks", () => {
    const input = `buildTypes {
    debug {
        debuggable true
    }
}`;
    const expected = `buildTypes {
    named("debug") {
        isDebuggable = true
    }
}`;
    expect(converter.convert(input)).toBe(expected);
  });
});
