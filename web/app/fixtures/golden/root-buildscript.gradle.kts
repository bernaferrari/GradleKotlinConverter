buildscript {
    extra["kotlin_version"] = "2.1.20"

    repositories {
        google()
        mavenCentral()
        flatDir {
            dirs("libs", "aars")
        }
    }

    dependencies {
        classpath("com.android.tools.build:gradle:8.8.0")
        classpath(kotlin("gradle-plugin", version = "$kotlin_version"))
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
        maven("https://jitpack.io")
    }
}

tasks.register<Delete>("clean").configure {
    delete(rootProject.buildDir)
 }
