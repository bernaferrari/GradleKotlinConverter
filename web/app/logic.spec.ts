import { describe, it, expect } from 'vitest'
import { GradleToKtsConverter } from './logic'

describe('GradleToKtsConverter', () => {
  const converter = new GradleToKtsConverter()

  describe('Plugin conversion issues', () => {
    it('should not mangle plugin names containing "id"', () => {
      const input = `plugins {
  id 'org.checkerframework' version '0.6.60'
}`
      const expected = `plugins {
  id("org.checkerframework") version "0.6.60"
}`
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })

    it('should not convert "idea" plugin to "ea"', () => {
      const input = `plugins {
  id "idea"
}`
      const expected = `plugins {
  id("idea")
}`
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })

    it('should handle multiple plugins correctly', () => {
      const input = `plugins {
    id "com.android.application"
    id "kotlin-android"
    id "com.google.protobuf" version "0.8.16"
    id "com.google.gms.google-services"
    id "kotlin-kapt"
}`
      const expected = `plugins {
    id("com.android.application")
    id("kotlin-android")
    id("com.google.protobuf") version "0.8.16"
    id("com.google.gms.google-services")
    id("kotlin-kapt")
}`
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })
  })

  describe('Colon to equals conversion', () => {
    it('should not convert colons inside dependency strings', () => {
      const input = 'implementation project(path: ":customer-api:api")'
      const expected = 'implementation(project(path = ":customer-api:api"))'
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })

    it('should convert parameter colons but not string colons', () => {
      const input = 'testImplementation(group: "junit", name: "junit:core", version: "4.12")'
      const expected = 'testImplementation(group = "junit", name = "junit:core", version = "4.12")'
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })

    it('should handle multiple module path separators', () => {
      const input = 'implementation project(path: ":app:core:api")'
      const expected = 'implementation(project(path = ":app:core:api"))'
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })
  })

  describe('Platform dependencies', () => {
    it('should wrap platform dependencies correctly', () => {
      const input = "implementation platform('it.tdlight:tdlight-java-bom:2.8.10.6')"
      const expected = 'implementation(platform("it.tdlight:tdlight-java-bom:2.8.10.6"))'
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })

    it('should handle platform with double quotes', () => {
      const input = 'implementation platform("org.junit:junit-bom:5.9.1")'
      const expected = 'implementation(platform("org.junit:junit-bom:5.9.1"))'
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })

    it('should handle testImplementation platform', () => {
      const input = 'testImplementation platform("org.junit:junit-bom:5.9.1")'
      const expected = 'testImplementation(platform("org.junit:junit-bom:5.9.1"))'
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })
  })

  describe('Simple dependency parentheses', () => {
    it('should keep closing parenthesis before line comment', () => {
      const input = 'dependencies {\n    testImplementation("org.junit.jupiter:junit-jupiter-engine:5.5.2") // blah\n}'
      const expectedContains = 'testImplementation("org.junit.jupiter:junit-jupiter-engine:5.5.2") // blah'
      const result = converter.convert(input)
      expect(result).toContain(expectedContains)
    })
    it('should add parentheses to simple dependencies', () => {
      const input = "implementation 'it.tdlight:tdlight-java'"
      const expected = 'implementation("it.tdlight:tdlight-java")'
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })

    it('should not double-wrap already parenthesized dependencies', () => {
      const input = 'implementation("androidx.core:core-ktx:1.6.0")'
      const expected = 'implementation("androidx.core:core-ktx:1.6.0")'
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })

    it('should handle project dependencies', () => {
      const input = "implementation project(':customer-api')"
      const expected = 'implementation(project(":customer-api"))'
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })
  })

  describe('Custom dependency configurations', () => {
    it('should handle modImplementation', () => {
      const input = 'modImplementation "net.fabricmc.fabric-api:fabric-api:0.42.0"'
      const expected = 'modImplementation("net.fabricmc.fabric-api:fabric-api:0.42.0")'
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })

    it('should handle modImplementation with platform', () => {
      const input = 'modImplementation platform("com.example:bom:1.0")'
      const expected = 'modImplementation(platform("com.example:bom:1.0"))'
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })

    it('should handle modImplementation with closure', () => {
      const input = `modImplementation("me.shedaniel.cloth:cloth-config-fabric:8.0.75") {
    exclude(group: "net.fabricmc.fabric-api")
}`
      const expected = `modImplementation("me.shedaniel.cloth:cloth-config-fabric:8.0.75") {
    exclude(group = "net.fabricmc.fabric-api")
}`
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })
  })

  describe('Task conversion', () => {
    it('should convert tasks.withType(..).all to generics form', () => {
      const input = `tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).all {\n  kotlinOptions { jvmTarget = "1.8" }\n}`
      const expected = `import org.jetbrains.kotlin.gradle.dsl.JvmTarget\ntasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {\n  kotlin {\n    compilerOptions {\n      jvmTarget = JvmTarget.JVM_1_8\n    }\n  }\n}`
      const result = converter.convert(input)
      expect(result).toContain('tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {')
      expect(result).toContain('kotlin {')
      expect(result).toContain('compilerOptions {')
      expect(result).toContain('jvmTarget = JvmTarget.JVM_1_8')
      expect(result).toMatch(/import org\.jetbrains\.kotlin\.gradle\.dsl\.JvmTarget/)
    })

    it('should convert tasks.withType(..) { .. } to generics form', () => {
      const input = `tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile) {\n  kotlinOptions { jvmTarget = "1.8" }\n}`
      const expected = `import org.jetbrains.kotlin.gradle.dsl.JvmTarget\ntasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {\n  kotlin {\n    compilerOptions {\n      jvmTarget = JvmTarget.JVM_1_8\n    }\n  }\n}`
      const result = converter.convert(input)
      expect(result).toContain('tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {')
      expect(result).toContain('kotlin {')
      expect(result).toContain('compilerOptions {')
      expect(result).toContain('jvmTarget = JvmTarget.JVM_1_8')
      expect(result).toMatch(/import org\.jetbrains\.kotlin\.gradle\.dsl\.JvmTarget/)
    })
    it('should convert compileGroovy task', () => {
      const input = `compileGroovy {
    dependsOn.clear()
}`
      const expected = `tasks.named<GroovyCompile>("compileGroovy") {
    dependsOn.clear()
}`
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })
  })

  describe('Real-world build.gradle conversion', () => {
    it('should handle complex build.gradle with multiple plugins', () => {
      const input = `plugins {
    id "com.android.application"
    id "kotlin-android"
    id "com.google.protobuf" version "0.8.16"
    id "com.google.gms.google-services"
    id "kotlin-kapt"
}

android {
    compileSdkVersion 34
    buildToolsVersion "34.0.0"

    defaultConfig {
        applicationId "com.example.app"
        minSdkVersion 27
        targetSdkVersion 34
        versionCode 42
        versionName "1.5.2"
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.6.0'
    implementation platform('com.google.firebase:firebase-bom:28.2.1')
    testImplementation 'junit:junit:4.+'
}`

      const result = converter.convert(input)
      
      // Check that plugins are properly converted
      expect(result).toContain('id("com.android.application")')
      expect(result).toContain('id("kotlin-android")')
      expect(result).toContain('id("com.google.protobuf")')
      expect(result).toContain('id("com.google.gms.google-services")')
      expect(result).toContain('id("kotlin-kapt")')
      
      // Check compileSdkVersion
      expect(result).toContain('compileSdkVersion(34)')
      
      // Check dependencies
      expect(result).toContain('implementation("androidx.core:core-ktx:1.6.0")')
      expect(result).toContain('implementation(platform("com.google.firebase:firebase-bom:28.2.1"))')
      expect(result).toContain('testImplementation("junit:junit:4.+")')
      
      // Check config values
      expect(result).toContain('applicationId = "com.example.app"')
      expect(result).toContain('minSdkVersion(27)')
      expect(result).toContain('targetSdkVersion(34)')
      expect(result).toContain('versionCode = 42')
      expect(result).toContain('versionName = "1.5.2"')
    })

    it('should handle exclusions with colons correctly', () => {
      const input = `dependencies {
    modImplementation("com.simibubi.create:create-fabric:0.5.0") {
        exclude(group: "net.fabricmc.fabric-api")
    }
}`
      const result = converter.convert(input)
      expect(result).toContain('modImplementation("com.simibubi.create:create-fabric:0.5.0")')
      expect(result).toContain('exclude(group = "net.fabricmc.fabric-api")')
    })
  })

  describe('Edge cases', () => {
    it('should handle dependencies with "api" in the name', () => {
      const input = 'implementation "com.example:my-api-lib:1.0.0"'
      const expected = 'implementation("com.example:my-api-lib:1.0.0")'
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })

    it('should handle dependencies with "implementation" in the name', () => {
      const input = 'implementation "com.example:implementation-core:1.0.0"'
      const expected = 'implementation("com.example:implementation-core:1.0.0")'
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })

    it('should not affect URLs with colons', () => {
      const input = 'maven { url = "https://maven.fabricmc.net/" }'
      const expected = 'maven("https://maven.fabricmc.net/")'
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })
  })

  describe('Additional Android DSL conversions', () => {
    it('should convert flavorDimensions', () => {
      const input = 'flavorDimensions "env", "moduleEnv"'
      const expected = 'flavorDimensions("env", "moduleEnv")'
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })

    it('should convert dimension to setDimension', () => {
      const input = `productFlavors {
    dev {
        dimension "env"
    }
}`
      const result = converter.convert(input)
      expect(result).toContain('setDimension("env")')
      expect(result).toContain('create("dev")')
    })

    it('should convert useLibrary', () => {
      const input = 'useLibrary "org.apache.http.legacy"'
      const expected = 'useLibrary("org.apache.http.legacy")'
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })

    it('should convert testOptions unitTests', () => {
      const input = `testOptions {
    unitTests {
        includeAndroidResources = true
    }
}`
      const expected = `testOptions {
    unitTests.isIncludeAndroidResources = true
}`
      const result = converter.convert(input)
      expect(result).toBe(expected)
    })

    it('should convert sourceSets with += syntax', () => {
      const input = `sourceSets {
    main.java.srcDirs += "src/main/kotlin"
}`
      const result = converter.convert(input)
      expect(result).toContain('sourceSets.getByName("main")')
      expect(result).toContain('java.srcDir("src/main/kotlin")')
    })
  })

  describe('Plugin edge cases', () => {
    it('should not add extra parenthesis to kotlin-kapt', () => {
      const input = `plugins {
    id 'kotlin-kapt'
}`
      const expected = `plugins {
    id("kotlin-kapt")
}`
      const result = converter.convert(input)
      expect(result).toBe(expected)
      expect(result).not.toContain('kotlin-kapt("')
      expect(result).not.toContain('kotlin-kapt(")')
    })
  })

  describe('Kotlin JVM target conversion', () => {
    it('should convert kotlinOptions jvmTarget = "11" to kotlin compilerOptions JvmTarget.JVM_11 with import', () => {
      const input = `android {\n  kotlinOptions {\n    jvmTarget = "11"\n  }\n}`
      const result = converter.convert(input)
      expect(result).toContain('kotlin {')
      expect(result).toContain('compilerOptions {')
      expect(result).toContain('jvmTarget = JvmTarget.JVM_11')
      expect(result).toMatch(/import org\.jetbrains\.kotlin\.gradle\.dsl\.JvmTarget/)
    })

    it('should convert kotlinOptions jvmTarget = "1.8" to JvmTarget.JVM_1_8', () => {
      const input = `kotlinOptions {\n  jvmTarget = "1.8"\n}`
      const result = converter.convert(input)
      expect(result).toContain('JvmTarget.JVM_1_8')
    })
  })

  describe('Function declarations', () => {
    it('should convert def function to fun', () => {
      const input = `def generateTag() {
    def date = new Date().format('yyyy-MM-dd-HH-mm')
    return date
}`
      const result = converter.convert(input)
      expect(result).toContain('fun generateTag()')
      expect(result).toContain('val date')
      // Should not duplicate the function
      expect((result.match(/fun generateTag/g) || []).length).toBe(1)
    })

    it('should convert static def function to fun', () => {
      const input = `static def generateTag() {
    def date = new Date().format('yyyy-MM-dd-HH-mm')
    return date
}`
      const result = converter.convert(input)
      expect(result).toContain('fun generateTag()')
      expect(result).not.toContain('static')
      expect(result).not.toContain('static val')
    })
  })
})
