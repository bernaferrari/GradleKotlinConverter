#!/usr/bin/env kscript

import java.io.File
import kotlin.system.exitProcess
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.awt.Toolkit
import java.awt.datatransfer.DataFlavor
import java.awt.datatransfer.StringSelection
import java.io.IOException

// Bernardo Ferrari
// APACHE-2 License
val DEBUG = false

// from https://github.com/importre/crayon
fun String.bold() = "\u001b[1m${this}\u001b[0m"

fun String.cyan() = "\u001b[36m${this}\u001b[0m"
fun String.green() = "\u001b[32m${this}\u001b[0m"
fun String.magenta() = "\u001b[35m${this}\u001b[0m"
fun String.red() = "\u001b[31m${this}\u001b[0m"
fun String.yellow() = "\u001b[33m${this}\u001b[0m"

fun currentTimeFormatted(): String = LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"))

val intro = """
+---------------------------------------------------------------------------------------+
+                        ${"Welcome to Gradle Kotlin DSL converter!".yellow()}                        +
+---------------------------------------------------------------------------------------+
+ This is a helper tool, much like Android Studio's Java -> Kotlin converter.           +
+ It is not perfect and there will be things to be manually solved, but it helps A LOT. +
+---------------------------------------------------------------------------------------+
+ Usage with files:                                                                     +
+    ${"$ gradlekotlinconverter.kts <build.gradle file>".cyan()}                                    +
+    ${"$ kscript gradlekotlinconverter.kts <build.gradle file>".cyan()}                            +
+                                                                                       +
+ Usage with clipboard:                                                                 +
+    ${"$ gradlekotlinconverter.kts".cyan()}                                                     +
+---------------------------------------------------------------------------------------+
+        ${"Get started here: https://github.com/bernaferrari/GradleKotlinConverter".yellow()}        +
+---------------------------------------------------------------------------------------+
"""

println(intro)

var isInClipBoardMode = args.isEmpty()

val input = if (!isInClipBoardMode) args.first() else ""

val file = File(input)

// Clipboard
System.setProperty("java.awt.headless", "false")

fun getClipboardContents(): String {

    print("[${currentTimeFormatted()}] - Trying to open clipboard.. ")

    val clipboard = Toolkit.getDefaultToolkit().systemClipboard
    val contents = clipboard.getContents(null)
    val hasTransferableText = contents != null && contents.isDataFlavorSupported(DataFlavor.stringFlavor)

    val result = if (hasTransferableText) contents?.getTransferData(DataFlavor.stringFlavor) as? String ?: "" else ""

    println("Success!")
    return result
}

fun readFromFile(): String {

    print("[${currentTimeFormatted()}] - Trying to open file.. ")
    if (!file.exists()) {
        println("Didn't find a file in the path you specified. Exiting...")
        exitProcess(0)
    }

    println("Success!")
    return file.readText()
}

val textToConvert = if (isInClipBoardMode) getClipboardContents() else readFromFile()

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

    val testKeywords = "testImplementation|androidTestImplementation|debugImplementation|compileOnly"
    val gradleKeywords = "($testKeywords|implementation|api|annotationProcessor|classpath|kapt|check)".toRegex()

    // ignore cases like kapt { correctErrorTypes = true } and apply plugin: ('kotlin-kapt") but pass kapt("...")
    // ignore keyWord followed by a space and a { or a " and a )
    val validKeywords = "(?!$gradleKeywords\\s*(\\{|\"\\)|\\.))$gradleKeywords.*".toRegex()

    return this.replace(validKeywords) { substring ->

        // we want to know if it is a implementation, api, etc
        val gradleKeyword = gradleKeywords.find(substring.value)?.value

        // implementation ':epoxy-annotations' becomes 'epoxy-annotations'
        val isolated = substring.value.replace(gradleKeywords, "").trim()

        // can't be && for the kapt project(':epoxy-processor') scenario, where there is a ) on the last element.
        if (isolated.first() != '(' || isolated.last { it != ' ' } != ')') {
            "$gradleKeyword($isolated)"
        } else {
            "$gradleKeyword$isolated"
        }
    }
}


// signingConfig signingConfigs.release
// becomes
// signingConfig = signingConfigs.getByName("release")
fun String.convertSigningConfigBuildType(): String {
    val outerExp = "signingConfig.*signingConfigs.*".toRegex()

    return this.replace(outerExp) {
        // extracts release from signingConfig signingConfigs.release
        val release = it.value.replace("signingConfig.*signingConfigs.".toRegex(), "")
        "signingConfig = signingConfigs.getByName(\"$release\")"
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

    val mavenExp = "maven\\s*\\{\\s*url\\s*(.*?)\\s*?}".toRegex()

    return this.replace(mavenExp) {
        it.value.replace("(url)|( )".toRegex(), "")
                .replace("{", "(")
                .replace("}", ")")
    }
}


// compileSdkVersion 28
// becomes
// compileSdkVersion(28)
fun String.addParentheses(): String {

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


// id "io.gitlab.arturbosch.detekt" version "1.0.0.RC8"
// becomes
// id("io.gitlab.arturbosch.detekt") version "1.0.0.RC8"
fun String.addParenthesisToId(): String {

    // this will only catch id "..." version ..., should skip id("...")
    // should get the id "..."
    val idExp = "id\\s*\".*?\"".toRegex()

    return this.replace(idExp) {
        // remove the "id " before the real id
        val idValue = it.value.replace("id\\s*".toRegex(), "")
        "id($idValue)"
    }
}

// versionCode 4
// becomes
// versionCode = 4
fun String.addEquals(): String {

    val signing = "keyAlias|keyPassword|storeFile|storePassword"
    val other = "multiDexEnabled|correctErrorTypes"
    val defaultConfig = "applicationId|versionCode|versionName|testInstrumentationRunner"

    val versionExp = "($defaultConfig|$signing|$other).*".toRegex()

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
        "setProguardFiles(listOf($isolatedArgs))"
    }
}


// ext.enableCrashlytics = false
// becomes
// extra.set("enableCrashlytics", false)
fun String.convertExtToExtra(): String {

    // get ext... but not ext { ... }
    val outerExp = "(?!ext\\s*\\{)ext\\..*".toRegex()

    return this.replace(outerExp) {
        val split = it.value.split(" ")

        val name = (split.firstOrNull() ?: "").replace("ext.", "")
        val value = split.lastOrNull() ?: ""

        "extra.set(\"$name\", $value)"
    }
}


// sourceCompatibility = "1.8" or sourceCompatibility JavaVersion.VERSION_1_8
// becomes
// sourceCompatibility = JavaVersion.VERSION_1_8
fun String.convertJavaCompatibility(): String {

    val compatibilityExp = "(sourceCompatibility|targetCompatibility).*".toRegex()

    return this.replace(compatibilityExp) {
        val split = it.value.replace("\"]*".toRegex(), "").split(" ")

        if (split.lastOrNull() != null) {
            if ("JavaVersion" in split.last()) {
                "${split[0]} = ${split.last()}"
            } else {
                "${split[0]} = JavaVersion.VERSION_${split.last().replace(".", "_")}"
            }
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
// include(":app", ":diffutils")
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


// configurations.classpath.exclude group: 'com.android.tools.external.lombok'
// becomes
// configurations.classpath {
//    exclude(group = "com.android.tools.external.lombok")
// }
fun String.convertExcludeClasspath(): String {

    val fullLineExp = ".*configurations\\.classpath\\.exclude.*group:.*".toRegex()

    if (DEBUG) {
        println("[CEC] - reading this line: " + fullLineExp.find(this)?.value)
    }

    // this will extract "com.android.tools.external.lombok" from the string.
    val innerExp = "\\\".*\\\"".toRegex()

    return this.replace(fullLineExp) { isolatedLine ->
        val isolatedStr = innerExp.find(isolatedLine.value)?.value ?: ""
        "configurations.classpath {\n" +
                "    exclude(group = $isolatedStr)\n" +
                "}"
    }
}


// classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
// becomes
// classpath(kotlin("gradle-plugin", version = "$kotlin_version"))
//
// implementation "org.jetbrains.kotlin:kotlin-stdlib:$kotlin_version"
// becomes
// implementation(kotlin("stdlib", KotlinCompilerVersion.VERSION))
fun String.convertJetBrainsKotlin(): String {

    // if string is implementation("..."), this will extract only the ...
    val fullLineExp = "\"org.jetbrains.kotlin:kotlin-.*(?=\\))".toRegex()

    val removeExp = "(?!org.jetbrains.kotlin:kotlin)-.*".toRegex()

    var shouldImportKotlinCompiler = false

    val newText = this.replace(fullLineExp) { isolatedLine ->

        // drop first "-" and remove last "
        val substring = (removeExp.find(isolatedLine.value)?.value ?: "").drop(1).replace("\"","")

        val splittedSubstring = substring.split(":")

        if ("stdlib" in substring) {
            shouldImportKotlinCompiler = true
            "kotlin(\"stdlib\", KotlinCompilerVersion.VERSION)"
        } else if (splittedSubstring.size == 2) {
            "kotlin(\"${splittedSubstring[0]}\", version = \"${splittedSubstring[1]}\")"
        } else {
            "kotlin(\"${splittedSubstring[0]}\")"
        }
    }

    return if (shouldImportKotlinCompiler) {
        "import org.jetbrains.kotlin.config.KotlinCompilerVersion\n\n" + newText
    } else {
        newText
    }
}


// implementation "org.jetbrains.kotlin:kotlin-stdlib:$kotlin_version"
// becomes
// implementation(kotlin("stdlib", KotlinCompilerVersion.VERSION))
fun String.convertPluginsIntoOneBlock(): String {

    // group plugin expressions. There can't be any space or tabs on the start of the line, else the regex will fail.
    // ok example:
    // apply(...)
    // apply(...)
    //
    // not ok example:
    // apply(...)
    //    apply(...)
    val fullLineExp = "(apply\\(plugin\\s*=\\s*\".*\"\\)[\\s\\S]){2,}".toRegex()

    val isolatedId = "\".*\"(?=\\))".toRegex()

    return this.replace(fullLineExp) { isolatedLine ->
        // this will fold the ids into a single string
        val plugins = isolatedId.findAll(isolatedLine.value)?.fold("") { acc, matchResult ->
            acc + "    id(${matchResult.value})\n"
        }
        "plugins {\n$plugins}\n"
    }
}

print("[${currentTimeFormatted()}] -- Starting conversion.. ")

val convertedText = textToConvert
        .replaceApostrophes()
        .replaceDefWithVal()
        .convertPlugins()
        .convertPluginsIntoOneBlock()
        .convertDependencies()
        .convertMaven()
        .addParentheses()
        .addEquals()
        .convertJavaCompatibility()
        .convertCleanTask()
        .convertProguardFiles()
        .convertInternalBlocks()
        .convertInclude()
        .convertBuildTypes()
        .convertSigningConfigs()
        .convertExcludeClasspath()
        .convertJetBrainsKotlin()
        .convertSigningConfigBuildType()
        .convertExtToExtra()
        .addParenthesisToId()

println("Success!")


fun writeToClipboard() {
    val selection = StringSelection(convertedText)
    val clipboard = Toolkit.getDefaultToolkit().getSystemClipboard()

    print("[${currentTimeFormatted()}] --- Saving to clipboard.. ")

    clipboard.setContents(selection, selection)
}


fun writeToFile() {
    // if build.gradle -> build.gradle.kts
    // if build.gradle.kts -> build.gradle.kts (override)
    val fileIsAlreadyKts = file.path.takeLast(4) == ".kts"

    if (fileIsAlreadyKts) {
        println("\n### ### ### Warning! The script will overrite ${file.path}, since it ends with \".kts\"".red() +
                "\n### ### ### Gradle might get crazy and all red, so you might want to \"gradle build\"\n".red())
    }

    val newFilePath = if (fileIsAlreadyKts) file.path else "${file.path}.kts"

    print("[${currentTimeFormatted()}] --- Saving to: \"$newFilePath\".. ")

    val newFile = File(newFilePath)
    newFile.createNewFile()
    newFile.writeText(convertedText)
}


if (isInClipBoardMode) writeToClipboard() else writeToFile()


println("Success!\n\n          Thanks for using this script!\n")
exitProcess(0)
