#!/usr/bin/env kscript

import java.io.File
import kotlin.system.exitProcess

// Bernardo Ferrari
// APACHE-2 License

val intro = """
Welcome to Gradle Kotlin DSL converter!

This is a helper tool, much like Android Studio's Java -> Kotlin converter.
It is not perfect and there will be things that you'll need to manually solve, but this helps reducing the amount of work.
It takes care of adding ( ) to dependencies, converting ' to ", adapting plugins and a lot else.

Usage:
    GradleKotlinConverter.kts <build.gradle file>
    kscript GradleKotlinConverter.kts <build.gradle file>
"""

println(intro)

val input = if (args.isEmpty()) {
    println("I see you din't select a build.gradle file to convert. Please type the file path:")
    readLine()
} else {
    args.first()
}

println("Trying to open file...")
val file = File(input)
if (!file.exists()) {
    println("Didn't find a file in the path you specified. Exiting...")
    exitProcess(0)
}
println("File opened successfully...")


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

    val dependencies = "dependencies\\s*\\{[\\s\\S]*}".toRegex()

    val gradleKeywords = "(implementation|testImplementation|api|annotationProcessor|classpath|kapt)"

    val identifyWord = "($gradleKeywords.*)".toRegex()

    return dependencies.find(this)?.value?.replace(identifyWord) {

        // the function matched something but don't know which keyword was matched
        // this will be necessary to reconstruct  it
        val getGradleKeyword = gradleKeywords.toRegex().find(it.value)?.value

        // split: implementation ':epoxy-annotations' becomes 'epoxy-annotations'
        val splitted = it.value.split(gradleKeywords.toRegex(), 2)[1].let {
            if (it.startsWith(" ")) it.substring(1) else it
        }

        // can't be && for the kapt project(':epoxy-processor') scenario
        if (splitted.first() != '(' || splitted.last { it != ' ' } != ')') {
            "$getGradleKeyword($splitted)"
        } else {
            "$getGradleKeyword$splitted"
        }
    } ?: this
}


// NOT WORKING
//// buildTypes { \n release { ... } }
//// becomes
//// buildTypes { \n register("release") { ... } }
//fun String.convertBuildTypes(): String {
//
//    val dependencies = "(?:(buildTypes\\s*\\{)*)\\{(?:[^{]*)(?!}[^{]*})".toRegex()
//    val rep = "[{ \\s]*".toRegex()
//    return dependencies.find(this)?.value?.replace(rep) { "named(\"${it.value}\")" } ?: this
//}

// NOT WORKING
// buildTypes { \n release { ... } }
// becomes
// buildTypes { \n register("release") { ... } }
//fun String.convertSigningConfigs(): String {
//
//    val dependencies = "(?:(signingConfigs\\s*\\{)*)\\{(?:[^{]*)(?!}[^{]*})".toRegex()
//    val rep = "[{ \\s]*".toRegex()
//    return dependencies.find(this)?.value?.replace(rep) { "register(\"${it.value}\")" } ?: this
//}


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


// debuggable true
// becomes
// isDebuggable = true
fun String.convertBuildTypesInternal(): String {

    val typesExp = "(debuggable|minifyEnabled|shrinkResources|abortOnError)\\s*\\S*".toRegex()

    return this.replace(typesExp) {
        val split = it.value.split(" ")

        // if there is more than one whitespace, the last().toIntOrNull() will find.
        if (split.lastOrNull { it.isNotBlank() } != null) {
            "is${split[0].capitalize()} = ${split.last()}"
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
    return this.convertToIs("androidExtensions", "experimental")
            .convertToIs("dataBinding", "enabled")
}

// androidExtensions { experimental = true }
// becomes
// androidExtensions { isExperimental = true }
fun String.convertToIs(outside: String, inside: String): String {

    val extensionsExp = "$outside\\s*\\{[\\s\\S]*}".toRegex()

    return this.replace(extensionsExp) {
        it.value.replace("$inside", "is${inside.capitalize()}")
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
// signingConfigs and buildTypes
// do you have any other needs? Please open an issue.


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
        .convertBuildTypesInternal()
        .convertProguardFiles()
        .convertInternalBlocks()
        .convertInclude()

val newFilePath = file.path + ".kts"
println("Conversion successful. Saving to: $newFilePath")

val newFile = File(newFilePath)
newFile.createNewFile()
newFile.writeText(text)

println("Done!! Thanks for using my script! Exiting...")
exitProcess(0)
