import org.jetbrains.kotlin.config.KotlinCompilerVersion

plugins {
    id("com.android.application")
    id("kotlin-android")
}
apply(plugin = ("kotlin-kapt"))
apply(plugin = ("kotlin-android-extensions"))

dependencies {
    classpath("com.android.tools.build:gradle:3.4.0-alpha10")
    classpath(kotlin("gradle-plugin", version = "$KOTLIN_VERSION"))
    classpath("com.bmuschko:gradle-nexus-plugin:2.3.1")
    classpath("com.github.ben-manes:gradle-versions-plugin:0.20.0")
}

// this should not be converted to block, like the first ones
apply(plugin = ("gms"))

plugins {
    id("io.gitlab.arturbosch.detekt") version "1.0.0.RC8"
    id("io.gitlab.arturbosch.detekt")
}

dependencies {
  ext {
     val test = "1.0.1"
  }
  val highdef = "1.1.0"
  val testing = "1.0.2"
  implementation(rootProject.deps.androidPagingComponent)
  implementation(project(":customer-api")) // comment!
  kapt(project(":epoxy-processor"))
  implementation(":epoxy-annotations")
  val ANDROIDX_APPCOMPAT = "1.0.0"
  implementation("androidx.appcompat:appcompat:$ANDROIDX_APPCOMPAT")
  testImplementation("com.randomDependency:1.0.0")
  compileOnly(group = "commons-io", name = "commons-io", version = "2.6")
  testCompileOnly(group = "org.apache.commons", name = "commons-math3", version = "3.6.1")
  customFlavorImplementation "a.lib.com"
}

testImplementation(group = "junit", name = "junit", version = "4.12")

configurations.classpath {
    exclude(group = "com.android.tools.external.lombok")
}

implementation(kotlin("stdlib", KotlinCompilerVersion.VERSION))
implementation(kotlin("stdlib", KotlinCompilerVersion.VERSION))

classpath(kotlin("gradle-plugin", version = "$kotlin_version"))
classpath(kotlin("gradle-plugin", version = "1.3.20"))

implementation(kotlin("reflect"))
testImplementation(kotlin("test"))
testImplementation(kotlin("test-junit"))

include(":app", ":diffutils")

include(
":common",
        ":server",
        ":app", ":core", ":core-model", ":core-data", ":core-ui",
        ":shared", ":shared-scouting",
        ":feature-teams", ":feature-autoscout",
        ":feature-scouts", ":feature-templates", ":feature-settings",
        ":feature-exports"
)

androidExtensions {
    isExperimental = true
}

allprojects {
    repositories {
        google()
        jcenter()
        maven("https://jitpack.io")
        maven("https://maven.fabric.io/public")
        maven("https://dl.bintray.com/kotlin/kotlin-eap")
    }
}

compileSdkVersion(28)

defaultConfig {
    applicationId = "com.bernaferrari.sdkmonitor"
    minSdkVersion(21)
    targetSdkVersion(28)
    versionCode = 4
    versionName = "0.4"
    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
}
buildTypes {
    named("release") {
        multiDexEnabled = true
        isDebuggable = false
        isMinifyEnabled = true
        isShrinkResources = true
        setProguardFiles(listOf(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"))
        signingConfig = signingConfigs.getByName("release")
    }
    named("debug") {
        isDebuggable = true
        extra["alwaysUpdateBuildId"] = false
        extra["enableCrashlytics"] = false
    }
}
signingConfigs {
    register("release") {
        storeFile = file(RELEASE_STORE_FILE)
        storePassword = RELEASE_STORE_PASSWORD
        keyAlias = RELEASE_KEY_ALIAS
        keyPassword = RELEASE_KEY_PASSWORD
    }
}
kapt {
    correctErrorTypes = true
}
android {
    lintOptions {
        isAbortOnError = false
    }
    defaultConfig {
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("boolean", "BETA", "false")
        manifestPlaceholders.putAll(mapOf("appIcon" to "@drawable/ic_launcher", "appRoundIcon" to "@null", "googleMapsKey" to "aNonKey"))
        vectorDrawables.useSupportLibrary = true
    }
    flavorDimensions("brand", "releaseType")
    productFlavors {
        create("prod") {
            dimension = "releaseType"
            resValue("string", "myFieldName", "@string/app_name")
            manifestPlaceholders.putAll(mapOf("appLabel" to "@string/activity_label", "deepLink" to "@string/deepLink"))
        }
    }
    variantFilter { // variant -> - TODO Manually replace 'variant ->' variable with this, and setIgnore(true) with ignore = true

        setIgnore(false)
    }
    dexOptions {
        javaMaxHeapSize = "4g"
        jumboMode = true
    }
    dataBinding {
        isEnabled = true
    }
}
compileOptions {
    sourceCompatibility = JavaVersion.VERSION_1_8
    targetCompatibility = JavaVersion.VERSION_1_8
}

sourceCompatibility = JavaVersion.VERSION_1_8

dataBinding {
    isEnabled = true
}

tasks.register<Delete>("clean").configure {
    delete(rootProject.buildDir)
 }
