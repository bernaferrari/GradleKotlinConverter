import org.jetbrains.kotlin.gradle.dsl.JvmTarget
plugins {
    id("org.jetbrains.kotlin.jvm") version "2.1.20"
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    kotlin {
      compilerOptions {
        jvmTarget = JvmTarget.JVM_17
      }
    }
}

dependencies {
    implementation(project(path = ":shared:api"))
    implementation(fileTree(mapOf("dir" to "libs", "include" to listOf("*.jar"))))
    testRuntimeOnly(libs.junit.jupiter.engine)
}
