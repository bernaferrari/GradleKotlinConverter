import { describe, expect, it } from "vitest";
import { GradleToKtsConverter } from "./logic";

describe("GitHub issue regressions", () => {
  const converter = new GradleToKtsConverter();

  it("#77 does not add a second equals sign to buildFeatures properties", () => {
    const input = `buildFeatures {
    viewBinding = true
}`;
    expect(converter.convert(input)).toBe(input);
  });

  it("#72, #54, #38, #31 do not mangle plugin ids containing id substrings", () => {
    const input = `plugins {
    id "org.checkerframework" version "0.6.60"
    id "idea"
    id("com.android.application")
    id "kotlin-android"
}`;
    const expected = `plugins {
    id("org.checkerframework") version "0.6.60"
    id("idea")
    id("com.android.application")
    id("kotlin-android")
}`;
    expect(converter.convert(input)).toBe(expected);
  });

  it("#40 converts already-parenthesized Android SDK method calls to modern properties", () => {
    const input = `android {
    compileSdkVersion(35)
    defaultConfig {
        minSdkVersion(24)
        targetSdkVersion(35)
    }
}`;
    const expected = `android {
    compileSdk = 35
    defaultConfig {
        minSdk = 24
        targetSdk = 35
    }
}`;
    expect(converter.convert(input)).toBe(expected);
  });

  it("#39 removes obsolete KotlinCompilerVersion import", () => {
    const input = `import org.jetbrains.kotlin.config.KotlinCompilerVersion
plugins {
    id "org.jetbrains.kotlin.jvm"
}`;
    const expected = `plugins {
    id("org.jetbrains.kotlin.jvm")
}`;
    expect(converter.convert(input)).toBe(expected);
  });

  it("#25 keeps versionCode expressions intact", () => {
    const input = "versionCode 1 + android.defaultConfig.versionCode";
    expect(converter.convert(input)).toBe("versionCode = 1 + android.defaultConfig.versionCode");
  });

  it("#22 leaves assignments containing string interpolation intact", () => {
    const input = 'archivesBaseName = "random-app-$versionName"';
    expect(converter.convert(input)).toBe(input);
  });

  it("#17 converts developmentOnly and runtimeOnly dependencies", () => {
    const input = `dependencies {
    developmentOnly "net.java.dev.jna:jna:5.5.0"
    runtimeOnly "io.methvin:directory-watcher:0.9.9"
}`;
    const expected = `dependencies {
    developmentOnly("net.java.dev.jna:jna:5.5.0")
    runtimeOnly("io.methvin:directory-watcher:0.9.9")
}`;
    expect(converter.convert(input)).toBe(expected);
  });

  it("#18 keeps dependency closing parenthesis before line comments", () => {
    const input = `dependencies {
    testImplementation "org.junit.jupiter:junit-jupiter-engine:5.5.2" // blah
}`;
    const expected = `dependencies {
    testImplementation("org.junit.jupiter:junit-jupiter-engine:5.5.2") // blah
}`;
    expect(converter.convert(input)).toBe(expected);
  });

  it("#30 converts ext blocks with simple assignments and closure properties", () => {
    const input = `ext {
    //versioning
    generateVersionName = { BigDecimal versionCode ->
        int patch = versionCode.remainder(1000)
        int minor = (versionCode / 1000).remainder(1000)
        int major = (versionCode / 1000000).remainder(1000)
        "$major.$minor.$patch"
    }
    appVersionCode = 1_000_000
    appVersionName = generateVersionName(appVersionCode)
}`;
    const expected = `//versioning
extra["generateVersionName"] = { versionCode: BigDecimal ->
    val patch: Int = versionCode.remainder(1000)
    val minor: Int = (versionCode / 1000).remainder(1000)
    val major: Int = (versionCode / 1000000).remainder(1000)
    "$major.$minor.$patch"
}
extra["appVersionCode"] = 1_000_000
extra["appVersionName"] = generateVersionName(appVersionCode)`;

    expect(converter.convert(input)).toBe(expected);
  });

  it.todo("#41 covers a non-Android jOOQ/Flyway build fixture");
});
