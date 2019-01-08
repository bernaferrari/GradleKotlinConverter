#!/usr/bin/env kscript

import java.io.File
import kotlin.system.exitProcess
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

// Bernardo Ferrari
// APACHE-2 License
val DEBUG = false

val intro = """
+---------------------------------------------------------------------------------------+
+                        Welcome to Gradle Kotlin DSL converter!                        +
+---------------------------------------------------------------------------------------+
+ This is a helper tool, much like Android Studio's Java -> Kotlin converter.           +
+ It is not perfect and there will be things to be manually solved, but it helps A LOT. +
+---------------------------------------------------------------------------------------+
+ Usage:                                                                                +
+    $ gradlekotlinconverter.kts <build.gradle file>                                    +
+    $ kscript GradleKotlinConverter.kts <build.gradle file>                            +
+---------------------------------------------------------------------------------------+
+        Get started here: https://github.com/bernaferrari/GradleKotlinConverter        +
+---------------------------------------------------------------------------------------+
"""

println(intro)

val input = if (args.isEmpty()) {
    println("I see you din't select a build.gradle file to convert. Please type the file path:")
    readLine()
} else {
    args.first()
}

fun currentTimeFormatted(): String = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"))

print("[${currentTimeFormatted()}] - Trying to open file.. ")
val file = File(input)
if (!file.exists()) {
    println("Didn't find a file in the path you specified. Exiting...")
    exitProcess(0)
}
println("Sucess!")


// anything with ' ('1.0.0', 'kotlin-android', 'jitpack', etc)
// becomes
// anything with " ("1.0.0", "kotlin-android", "jitpack", etc)
fun String.replaceApostrophes(): String = this.replace("'", "\"")


// def appcompat = "1.0.0"
// becomes
// val appcompat = "1.0.0"
fun String.replaceDefWithVal(): String = this.replace("def ", "val ")


// apply plugin: "kotlin-android"
// becomes
// apply(plugin = "kotlin-android")
fun String.convertPlugins(): String {
    val pluginsExp = "apply plugin:((\\s*\"\\S*\")|(\\s*[(]\"\\S*\"[)]))".toRegex()

    return this.replace(pluginsExp) {
        val pluginIdExp = "\"\\S*\"".toRegex()
        // it identifies the plugin id and rebuilds the line.
        "apply(plugin = ${pluginIdExp.find(it.value)?.value})"
    }
}


// implementation ":epoxy-annotations"
// becomes
// implementation(":epoxy-annotations")
fun String.convertDependencies(): String {

    val dependenciesTag = "dependencies\\s*\\{".toRegex()

    val gradleKeywords = "(implementation|testImplementation|api|annotationProcessor|classpath|kapt)".toRegex()

    val identifyWord = "$gradleKeywords.*".toRegex()

    val stringSize = this.count()

    return this.getExpressionBlock(dependenciesTag) { substring ->
        substring.replace(identifyWord) {

            // we want to know if it is a implementation, api, etc
            val gradleKeyword = gradleKeywords.find(it.value)?.value

            // implementation ':epoxy-annotations' becomes 'epoxy-annotations'
            val isolated = it.value.replace(gradleKeywords, "").trim()

            // can't be && for the kapt project(':epoxy-processor') scenario, where there is a ) on the last element.
            if (isolated.first() != '(' || isolated.last { it != ' ' } != ')') {
                "$gradleKeyword($isolated)"
            } else {
                "$gradleKeyword$isolated"
            }
        }
    }
}


// buildTypes { release }
// becomes
// buildTypes { named("release") }
fun String.convertBuildTypes(): String = this.convertNestedTypes("buildTypes", "named")


// signingConfigs { release }
// becomes
// signingConfigs { register("release") }
fun String.convertSigningConfigs(): String = this.convertNestedTypes("signingConfigs", "register")


fun String.convertNestedTypes(buildTypes: String, named: String): String {
    return this.getExpressionBlock("$buildTypes\\s*\\{".toRegex()) { substring ->
        substring.replace("\\S*\\s(?=\\{)".toRegex()) {
            val valueWithoutWhitespace = it.value.replace(" ", "")
            "$named(\"$valueWithoutWhitespace\")"
        }
    }
}

fun String.getExpressionBlock(
        expression: Regex,
        modifyResult: ((String) -> (String))
): String {

    val stringSize = this.count()

    return expression.findAll(this)
            .toList()
            .foldRight(this) { matchResult, accString ->

                val value = matchResult.value
                var rangeStart = matchResult.range.last
                var rangeEnd = stringSize
                var count = 0

                if (DEBUG) {
                    println("[DP] - range: ${matchResult.range} value: ${matchResult.value}")
                }

                for (item in rangeStart..stringSize) {
                    if (this[item] == '{') count += 1 else if (this[item] == '}') count -= 1
                    if (count == 0) {
                        rangeEnd = item
                        break
                    }
                }

                if (DEBUG) {
                    println("[DP] reading this block:\n${this.substring(rangeStart, rangeEnd)}")
                }

                val convertedStr = modifyResult.invoke(this.substring(rangeStart, rangeEnd))

                if (DEBUG) {
                    println("[DP] outputing this block:\n${convertedStr}")
                }

                accString.replaceRange(rangeStart, rangeEnd, convertedStr)
            }
}


// maven { url "https://maven.fabric.io/public" }
// becomes
// maven("https://maven.fabric.io/public")
fun String.convertMaven(): String {

    val mavenExp = "maven\\s*\\{\\s*url\\s*.*\\s*}\\s*".toRegex()

    return this.replace(mavenExp) {
        it.value.replace("(url)|( )".toRegex(), "")
                .replace("{", "(")
                .replace("}", ")")
    }
}


// compileSdkVersion 28
// becomes
// compileSdkVersion(28)
fun String.convertSdkVersion(): String {

    val sdkExp = "(compileSdkVersion|minSdkVersion|targetSdkVersion)\\s*\\d*".toRegex()

    return this.replace(sdkExp) {
        val split = it.value.split(" ")

        // if there is more than one whitespace, the last().toIntOrNull() will find.
        if (split.lastOrNull { it.toIntOrNull() != null } != null) {
            "${split[0]}(${split.last()})"
        } else {
            it.value
        }
    }
}


// versionCode 4
// becomes
// versionCode = 4
fun String.convertVersionCode(): String {

    val versionExp = "(applicationId|versionCode|versionName)\\s*\\S*".toRegex()

    return this.replace(versionExp) {
        val split = it.value.split(" ")

        // if there is more than one whitespace, the last().toIntOrNull() will find.
        if (split.lastOrNull { it.isNotBlank() } != null) {
            "${split[0]} = ${split.last()}"
        } else {
            it.value
        }
    }
}


// proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
// becomes
// setProguardFiles(listOf(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
fun String.convertProguardFiles(): String {

    val proguardExp = "proguardFiles .*".toRegex()

    return this.replace(proguardExp) {
        val isolatedArgs = it.value.replace("proguardFiles\\s*".toRegex(), "")
        "setProguardFiles(listOf($isolatedArgs)"
    }
}


// sourceCompatibility = "1.8"
// becomes
// sourceCompatibility = JavaVersion.VERSION_1_8
fun String.convertJavaCompatibility(): String {

    val compatibilityExp = "(sourceCompatibility|targetCompatibility)\\s*=\\s*\".*\"\\s*".toRegex()

    return this.replace(compatibilityExp) {
        val split = it.value.replace("[ \"]*".toRegex(), "").split("=")

        if (split.lastOrNull() != null) {
            "${split[0]} = JavaVersion.VERSION_${split.last().replace(".", "_")}"
        } else {
            it.value
        }
    }
}


// converts the clean task, which is very common to find
fun String.convertCleanTask(): String {

    val cleanExp = "task clean\\(type: Delete\\)\\s*\\{[\\s\\S]*}".toRegex()
    val registerClean = "tasks.register<Delete>(\"clean\").configure {\n" +
            "    delete(rootProject.buildDir)\n }"

    return this.replace(cleanExp, registerClean)
}


// androidExtensions { experimental = true }
// becomes
// androidExtensions { isExperimental = true }
fun String.convertInternalBlocks(): String {
    return this.addIsToStr("androidExtensions", "experimental")
            .addIsToStr("dataBinding", "enabled")
            .addIsToStr("lintOptions", "abortOnError")
            .addIsToStr("buildTypes", "debuggable")
            .addIsToStr("buildTypes", "minifyEnabled")
            .addIsToStr("buildTypes", "shrinkResources")
}

fun String.addIsToStr(blockTitle: String, transform: String): String {

    val extensionsExp = "$blockTitle\\s*\\{[\\s\\S]*\\}".toRegex()

    if (!extensionsExp.containsMatchIn(this)) return this

    val typesExp = "$transform.*".toRegex()

    return this.replace(typesExp) {

        val split = it.value.split(" ")

        if (DEBUG) {
            println("[AS] split:\n${split}")
        }

        // if there is more than one whitespace, the last().toIntOrNull() will find.
        if (split.lastOrNull { it.isNotBlank() } != null) {
            "is${split[0].capitalize()} = ${split.last()}"
        } else {
            it.value
        }
    }
}


// include ":app", ":diffutils"
// becomes
// include (":app", ":diffutils")
fun String.convertInclude(): String {

    val expressionBase = "\\s*((\".*\"\\s*,)\\s*)*(\".*\")".toRegex()
    val includeExp = "include$expressionBase".toRegex()

    return this.replace(includeExp) { includeBlock ->
        // avoid cases where some lines at the start/end are blank
        val multiLine = includeBlock.value.split('\n').count { it.isNotBlank() } > 1

        val isolated = expressionBase.find(includeBlock.value)?.value ?: ""
        if (multiLine) "include(\n${isolated.trim()}\n)" else "include(${isolated.trim()})"
        // Possible visual improvement: when using multiline, the first line should have the same
        // margin/spacement as the others.
    }
}


// TODO
// testInstrumentationRunner becomes what?
// plugin should become one block (3th law of SUPERCILEX: https://twitter.com/SUPERCILEX/status/1079832024456749059)
// do you have any other needs? Please open an issue.

print("[${currentTimeFormatted()}] -- Starting conversion.. ")

val text = file.readText()
        .replaceApostrophes()
        .replaceDefWithVal()
        .convertPlugins()
        .convertDependencies()
        .convertMaven()
        .convertSdkVersion()
        .convertVersionCode()
        .convertJavaCompatibility()
        .convertCleanTask()
        .convertProguardFiles()
        .convertInternalBlocks()
        .convertInclude()
        .convertBuildTypes()
        .convertSigningConfigs()

val newFilePath = file.path + ".kts"

println("Sucess!")
print("[${currentTimeFormatted()}] --- Saving to: $newFilePath.. ")

val newFile = File(newFilePath)
newFile.createNewFile()
newFile.writeText(text)

println("Success!\n\n          Thanks for using this script!\n")
exitProcess(0)
