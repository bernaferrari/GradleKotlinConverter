import { defaultExample } from "./default-example";

export const editorExamples = [
  {
    label: "Android app",
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
}

dependencies {
    implementation 'androidx.core:core-ktx:1.16.0'
    testImplementation 'junit:junit:4.13.2'
}`,
  },
  {
    label: "Dependencies",
    input: `repositories {
    mavenCentral()
    google()
    maven { url 'https://jitpack.io' }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.16.0'
    implementation project(':shared')
    testImplementation 'junit:junit:4.13.2'

    implementation('com.example:library:1.0') {
        exclude group: 'org.example', module: 'legacy'
    }
}`,
  },
  { label: "Full example", input: defaultExample },
];
