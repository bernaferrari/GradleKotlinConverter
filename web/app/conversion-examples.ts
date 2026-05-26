export type ConversionExample = {
  description: string;
  input: string;
  expectedSnippets: string[];
  forbiddenSnippets?: string[];
};

export const modernGradleExamples: ConversionExample[] = [
  {
    description: "modern Android application module with AGP-style property assignments",
    input: `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.example.app'
    compileSdk 36

    defaultConfig {
        applicationId 'com.example.app'
        minSdk 24
        targetSdk 36
        versionCode 1
        versionName '1.0'
    }

    buildFeatures {
        compose true
        buildConfig true
    }
}`,
    expectedSnippets: [
      'id("com.android.application")',
      'id("org.jetbrains.kotlin.android")',
      'namespace = "com.example.app"',
      "compileSdk = 36",
      "minSdk = 24",
      "targetSdk = 36",
      "versionCode = 1",
      'versionName = "1.0"',
      "compose = true",
      "buildConfig = true",
    ],
    forbiddenSnippets: ["compileSdkVersion", "minSdkVersion", "targetSdkVersion"],
  },
  {
    description: "Gradle 9 repository block without removed jcenter() API",
    input: `repositories {
    google()
    jcenter()
    maven { url 'https://jitpack.io' }
}`,
    expectedSnippets: [
      "repositories {",
      "google()",
      "mavenCentral()",
      'maven("https://jitpack.io")',
    ],
    forbiddenSnippets: ["jcenter()"],
  },
  {
    description: "AGP 9 product flavor dimension property",
    input: `android {
    flavorDimensions 'tier'
    productFlavors {
        free {
            dimension 'tier'
        }
        paid {
            dimension 'tier'
        }
    }
}`,
    expectedSnippets: [
      'flavorDimensions("tier")',
      'create("free") {',
      'create("paid") {',
      'dimension = "tier"',
    ],
    forbiddenSnippets: ["setDimension("],
  },
  {
    description: "Gradle 9 compatible Java 17 compile options",
    input: `compileOptions {
    sourceCompatibility = '17'
    targetCompatibility = '17'
}`,
    expectedSnippets: [
      "sourceCompatibility = JavaVersion.VERSION_17",
      "targetCompatibility = JavaVersion.VERSION_17",
    ],
  },
];
