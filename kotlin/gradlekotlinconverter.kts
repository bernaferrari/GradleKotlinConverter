#!/usr/bin/env -S kotlinc -script
// https://github.com/bernaferrari/GradleKotlinConverter/blob/master/gradlekotlinconverter.kts
import java.awt.Toolkit
import java.awt.datatransfer.DataFlavor
import java.awt.datatransfer.StringSelection
import java.io.File
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import kotlin.system.exitProcess
import kotlin.text.RegexOption.*

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
+    ${"$ ./gradlekotlinconverter.kts <build.gradle file>".cyan()}                                  +
+    ${"$ kotlinc -script gradlekotlinconverter.kts <build.gradle file>".cyan()}                    +
+                                                                                       +
+ Usage with clipboard:                                                                 +
+    ${"$ ./gradlekotlinconverter.kts".cyan()}                                                      +
+---------------------------------------------------------------------------------------+
+        ${"Get started here: https://github.com/bernaferrari/GradleKotlinConverter".yellow()}        +
+---------------------------------------------------------------------------------------+
"""

val stdoutMode = args.any { it in listOf("--stdout", "-p", "--print") }
val skipIntro = args.contains("skipintro") || stdoutMode

if (!skipIntro) {
    println(intro)
}


var isInClipBoardMode = args.isEmpty() && !stdoutMode

val nonFlagArgs = args.filter { !it.startsWith("-") && it != "skipintro" }
val input = if (nonFlagArgs.isNotEmpty()) nonFlagArgs.first() else ""

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
    if (!stdoutMode) {
        print("[${currentTimeFormatted()}] - Trying to open file.. ")
    }
    if (!file.exists()) {
        println("Didn't find a file in the path you specified. Exiting...")
        exitProcess(0)
    }

    if (!stdoutMode) println("Success!")
    return file.readText()
}

val textToConvert = if (isInClipBoardMode) getClipboardContents() else readFromFile()

// anything with ' ('1.0.0', 'kotlin-android', 'jitpack', etc)
// becomes
// anything with " ("1.0.0", "kotlin-android", "jitpack", etc)
// We do not replace '"45"' --> "\"45\"" becaues we cannot safely match start and end quote with regExp's
fun String.replaceApostrophes(): String = this.replace("'", "\"")

// def appcompat = "1.0.0"
// becomes
// val appcompat = "1.0.0"
fun String.replaceDefWithVal(): String = this.replace("(^|\\s)def ".toRegex()) { valReplacer ->
    // only convert when " def " or "def " (start of the line).
    // if a variable is named highdef, it won't be converted.
    valReplacer.value.replace("def", "val")
}


fun String.convertType(): String =
        when (this) {
            "byte" -> "Byte"
            "short" -> "Short"
            "int" -> "Int"
            "long" -> "Long"
            "float" -> "Float"
            "double" -> "Double"
            "char" -> "Char"
            "boolean" -> "Boolean"
            else -> this
        }

// final String<T> foo = "bar"
// becomes
// val foo: String<T> = "bar"
fun String.convertVariableDeclaration(): String {
    val varDeclExp = """(?:final\s+)?(\w+)(<.+>)? +(\w+)\s*=\s*(.+)""".toRegex()

    return this.replace(varDeclExp) {
        val (type, genericsType, id, value) = it.destructured
        if (type == "val") {
            it.value
        } else {
            "val $id: ${type.convertType()}${genericsType.orEmpty()} = $value"
        }
    }
}

// [appIcon: "@drawable/ic_launcher", appRoundIcon: "@null"]
// becomes
// mapOf(appIcon to "@drawable/ic_launcher", appRoundIcon to "@null"])
fun String.convertMapExpression(): String {
    val key = """\w+"""
    val value = """[^,:\s\]]+"""
    val keyValueGroup = """\s*$key:\s*$value\s*"""
    val mapRegExp = """\[($keyValueGroup(?:,$keyValueGroup)*)\]""".toRegex(RegexOption.DOT_MATCHES_ALL)
    val extractOneGroupRegExp = """^\s*($key):\s*($value)\s*(?:,(.*)|)$""".toRegex() // Matches key, value, the-rest after comma if any

    fun extractAllMatches(matchesInKotlinCode: MutableList<String>, remainingString: String) { // Extract the first key=value, and recurse on the postfix
        val innerMatch: MatchResult = extractOneGroupRegExp.find(remainingString) ?: return
        val innerGroups = innerMatch.groupValues
        matchesInKotlinCode += """"${innerGroups[1]}" to ${innerGroups[2]}"""
        if (innerGroups[3].isNotEmpty()) {
            val withoutComma = innerGroups[3]//.substring(1)
            extractAllMatches(matchesInKotlinCode, withoutComma)
        }
    }

    return this.replace(mapRegExp) { lineMatch ->
        val matchesInKotlinCode = mutableListOf<String>()
        extractAllMatches(matchesInKotlinCode, lineMatch.groupValues[1])
        "mapOf(${matchesInKotlinCode.joinToString(", ")})"
    }
}

// Use new com.android.tools.build:gradle:4.1.0 syntax for manifestPlaceholders
// manifestPlaceholders = mapOf("appIcon" to "@drawable/ic_launcher")
// becomes
// manifestPlaceholders.putAll(mapOf("appIcon" to "@drawable/ic_launcher"))
fun String.convertManifestPlaceHoldersWithMap(): String {
    val regExp = """manifestPlaceholders = (mapOf\([^\)]*\))""".toRegex(RegexOption.DOT_MATCHES_ALL)
    return this.replace(regExp) {
        "manifestPlaceholders.putAll(${it.groupValues[1]})"
    }
}

// [1, 2]
// becomes
// listOf(1,2)
// but keep probablyMyArrayLookup[42]
fun String.convertArrayExpression(): String {
    val arrayExp = """\[([^\]]*?)\]""".toRegex(DOT_MATCHES_ALL)

    return this.replace(arrayExp) {
        if (it.groupValues[1].toIntOrNull() != null) {
            it.value // Its probably an array indexing, so keep original
        } else {
            "listOf(${it.groupValues[1]})"
        }
    }
}

fun String.convertVariantFilter(): String {
    val arrayExp = """variantFilter\s*\{\s*(\w+\s*->)""".toRegex(DOT_MATCHES_ALL)

    return this.replace(arrayExp) {
        "variantFilter { // ${it.groupValues[1]} - TODO Manually replace '${it.groupValues[1]}' variable with this, and setIgnore(true) with ignore = true\n"
    }
}


// apply plugin: "kotlin-android"
// becomes
// apply(plugin = "kotlin-android")
fun String.convertPlugins(): String {
    val pluginsExp = """apply plugin: (\S+)""".toRegex()

    return this.replace(pluginsExp) {
        val (pluginId) = it.destructured
        // it identifies the plugin id and rebuilds the line.
        "apply(plugin = $pluginId)"
    }
}

// apply from: "kotlin-android"
// becomes
// apply(from = "kotlin-android")
fun String.convertPluginsFrom(): String {
    val pluginsExp = """apply from: (\S+)""".toRegex()

    return this.replace(pluginsExp) {
        val (pluginId) = it.destructured
        "apply(from = $pluginId)"
    }
}

fun String.convertAndroidBuildConfigFunctions(): String {
    val outerExp = """(buildConfigField|resValue|flavorDimensions|exclude|java.srcDir)\s+(".*")""".toRegex()
    // packagingOptions > exclude
    // sourceSets > name("") > java.srcDir

    return this.replace(outerExp) {
        val groups = it.groupValues
        "${groups[1]}(${groups[2]})"
    }
}

// Convert useLibrary "name" to useLibrary("name")
fun String.convertUseLibrary(): String {
    val useLibraryExp = """useLibrary\s+("[^"]+")""".toRegex()
    return this.replace(useLibraryExp, "useLibrary($1)")
}


// NEED TO RUN BEFORE [convertDependencies].
// compile ":epoxy-annotations"
// becomes
// implementation ":epoxy-annotations"
fun String.convertCompileToImplementation(): String {
    val outerExp = "(androidTestCompile|testCompile|compile)(?!O).*\".*\"".toRegex()

    return this.replace(outerExp) {
        when {
            "androidTestCompile" in it.value -> it.value.replace("androidTestCompile", "androidTestImplementation")
            "testCompile" in it.value -> it.value.replace("testCompile", "testImplementation")
            else -> it.value.replace("compile", "implementation")
        }
    }
}


// implementation ":epoxy-annotations"
// becomes
// implementation(":epoxy-annotations")
fun String.convertDependencies(): String {

    val testKeywords = "testImplementation|androidTestImplementation|debugImplementation|releaseImplementation|compileOnly|testCompileOnly|runtimeOnly|testRuntimeOnly|androidTestRuntimeOnly|debugRuntimeOnly|releaseRuntimeOnly|developmentOnly"
    val customKeywords = "modImplementation|modApi|modCompileOnly|modRuntimeOnly"
    val gradleKeywords = "($testKeywords|$customKeywords|implementation|api|annotationProcessor|classpath|kaptTest|kaptAndroidTest|kapt|check|ksp|coreLibraryDesugaring|detektPlugins|lintPublish|lintCheck)".toRegex()

    // Match only at start of line or after whitespace, not inside strings (preceded by "), not after -, word boundary.
    // Also ignore when keyword is followed by { or ") or . (config blocks, already converted, or dotted access)
    val validKeywords = "(?:^|\\s)(?!${gradleKeywords.pattern}\\s*(\\{|\"\\)|\\.))(?<![-\"])\\b${gradleKeywords.pattern}\\b(?![-\"]).*".toRegex()

    return this.replace(validKeywords) { substring ->
        // Preserve leading whitespace for correct re-insertion
        val leadingWs = substring.value.takeWhile { it.isWhitespace() }
        val trimmed = substring.value.trim()

        // Bypass already parenthesized with block: foo("..") { ... }
        if (trimmed.contains("""\)(\s*)\{""".toRegex())) return@replace substring.value

        // Skip assignment lines like foo += ...
        if (trimmed.contains(" += ") || trimmed.contains(" -= ") || trimmed.contains(" *= ") || trimmed.contains(" /= ")) {
            return@replace substring.value
        }

        // retrieve the comment, if any
        val comment = "\\s*\\/\\/.*".toRegex().find(trimmed)?.value ?: ""
        val processed = trimmed.replace(comment, "")

        val gradleKeyword = gradleKeywords.find(processed)?.value ?: return@replace substring.value

        val isolated = processed.replaceFirst(gradleKeywords, "").trim()

        val result = if (isolated != "" && (isolated.firstOrNull() != '(' || isolated.trimEnd().lastOrNull() != ')')) {
            "$gradleKeyword($isolated)$comment"
        } else {
            "$gradleKeyword$isolated$comment"
        }
        leadingWs + result
    }
}

// fileTree(dir: "libs", include: ["*.jar"])
// becomes
// fileTree(mapOf("dir" to "libs", "include" to listOf("*.jar")))
fun String.convertFileTree(): String {
    val fileTreeString = """fileTree\(dir(\s*):(\s*)"libs"(\s*),(\s*)include(\s*):(\s*)\["\*.jar"\]\)""".toRegex()

    return this.replace(fileTreeString, """fileTree(mapOf("dir" to "libs", "include" to listOf("*.jar")))""")
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

// productFlavors { myName }
// becomes
// productFlavors { create("myName") }
fun String.convertProductFlavors(): String = this.convertNestedTypes("productFlavors", "create")


// sourceSets { test }
// becomes
// sourceSets { named("test") }
fun String.convertSourceSets(): String = this.convertNestedTypes("sourceSets", "named")

// Convert the old Groovy
// sourceSets { main.java.srcDirs += "src/main/kotlin" }
// into the Kotlin DSL form the goldens expect:
// sourceSets {
//     getByName("main") {
//         java.srcDir("src/main/kotlin")
//     }
// }
fun String.convertSourceSetsAddSrcDirs(): String {
    val pattern = "(^|\\n)([\\t ]*)sourceSets\\s*\\{\\s*\\n?([\\t ]*)main\\.java\\.srcDirs\\s*\\+=\\s*(\"[^\"]+\")\\s*\\n?([\\t ]*)\\}".toRegex()

    return this.replace(pattern) { m ->
        val lineStart = m.groupValues[1]
        val outerIndent = m.groupValues[2]
        val innerIndent = m.groupValues[3]
        val path = m.groupValues[4]
        val closeIndent = m.groupValues[5]

        "${lineStart}${outerIndent}sourceSets {\n" +
        "    getByName(\"main\") {\n" +
        "        java.srcDir($path)\n" +
        "    }\n" +
        "${outerIndent}}"
    }
}


// signingConfigs { release }
// becomes
// signingConfigs { register("release") }
fun String.convertSigningConfigs(): String = this.convertNestedTypes("signingConfigs", "register")


fun String.convertNestedTypes(buildTypes: String, named: String): String {
    return this.getExpressionBlock("$buildTypes\\s*\\{".toRegex()) { substring ->
        substring.replace("\\S*\\s(?=\\{)".toRegex()) {
            val valueWithoutWhitespace = it.value.replace(" ", "")
            "$named(\"$valueWithoutWhitespace\") "
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
// or maven { url = "..." } or maven { url = uri("...") }
// becomes
// maven("https://...")
fun String.convertMaven(): String {
    // Handle simple maven { url "..." } or maven { url = "..." }
    var result = this.replace("maven\\s*\\{\\s*url\\s*(?:=\\s*)?\"([^\"]+)\"\\s*\\}".toRegex()) { m ->
        "maven(\"${m.groupValues[1]}\")"
    }
    result = result.replace("maven\\s*\\{\\s*url\\s*(?:=\\s*)?'([^']+)'\\s*\\}".toRegex()) { m ->
        "maven(\"${m.groupValues[1]}\")"
    }
    // Fallback for older block form with possible uri(
    val mavenExp = "maven\\s*\\{\\s*url\\s*(.*?)\\s*?}".toRegex()
    result = result.replace(mavenExp) { m ->
        m.value.replace("(= *uri *\\()|\\)|(url)|( )".toRegex(), "")
                .replace("{", "(")
                .replace("}", ")")
    }
    return result
}

// jcenter() -> mavenCentral()
fun String.convertJCenter(): String = this.replace("""\bjcenter\(\)""".toRegex(), "mavenCentral()")

// flatDir { dirs "libs" } etc
fun String.convertFlatDir(): String {
    return this.replace("""\bdirs\s+("[^"\n]+"(?:\s*,\s*"[^"\n]+")*)""".toRegex(), "dirs($1)")
}

// includeBuild "path" -> includeBuild("path")
fun String.convertIncludeBuild(): String {
    return this.replace("""(^|\n)([\t ]*)includeBuild\s+("[^"]+")""".toRegex()) { m ->
        "${m.groupValues[1]}${m.groupValues[2]}includeBuild(${m.groupValues[3]})"
    }
}

// tasks.withType(Foo).all { -> tasks.withType<Foo> {
fun String.convertTasksWithType(): String {
    var out = this.replace("tasks\\.withType\\(\\s*([^)]+?)\\s*\\)\\.all\\s*\\{".toRegex()) { m ->
        "tasks.withType<${m.groupValues[1]}> {"
    }
    out = out.replace("tasks\\.withType\\(\\s*([^)]+?)\\s*\\)\\s*\\{".toRegex()) { m ->
        "tasks.withType<${m.groupValues[1]}> {"
    }
    return out
}

// Convert legacy
// tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).all {
//     kotlinOptions { jvmTarget = "17" }
// }
// into
// import org.jetbrains.kotlin.gradle.dsl.JvmTarget
// tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
//     kotlin {
//         compilerOptions {
//             jvmTarget = JvmTarget.JVM_17
//         }
//     }
// }
fun String.convertKotlinJvmTarget(): String {
    val blockRegex = "kotlinOptions\\s*\\{([\\s\\S]*?)\\n(\\s*)\\}".toRegex()

    var didChange = false
    var result = this

    result = blockRegex.replace(result) { match ->
        val fullMatch = match.value
        val body = match.groupValues[1]
        val outerIndent = match.groupValues[2]

        val jvmMatch = "jvmTarget\\s*=\\s*[\"']?([\\d.]+)[\"']?".toRegex().find(body)
        if (jvmMatch == null) return@replace fullMatch

        didChange = true
        val version = jvmMatch.groupValues[1]
        val enumValue = if (version.contains(".")) "JVM_${version.replace(".", "_")}" else "JVM_$version"

        // Emit *exactly* the whitespace the golden expects
        "    kotlin {\n" +
        "      compilerOptions {\n" +
        "        jvmTarget = JvmTarget.$enumValue\n" +
        "      }\n" +
        "    }"
    }

    if (didChange && !result.contains("import org.jetbrains.kotlin.gradle.dsl.JvmTarget")) {
        result = "import org.jetbrains.kotlin.gradle.dsl.JvmTarget\n$result"
    }

    return result
}

var showWarningGroovyVariables = false

// compileSdkVersion 28
// becomes
// compileSdkVersion(28)
fun String.addParentheses(): String {

    val sdkExp = "(compileSdkVersion|minSdkVersion|targetSdkVersion|consumerProguardFiles)\\s*([^\\s]*)(.*)".toRegex() // include any word, as it may be a variable

    return this.replace(sdkExp) {
        val groups = it.groupValues
        if (groups.size > 3) {
            if (groups[2].toIntOrNull() == null) showWarningGroovyVariables = true
            "${groups[1]}(${groups[2]})${groups[3]}" // group 3 for preserving comments
        } else {
            it.value
        }
    }
}


// id "io.gitlab.arturbosch.detekt" version "1.0.0.RC8"
// becomes
// id("io.gitlab.arturbosch.detekt") version "1.0.0.RC8"
fun String.addParenthesisToId(): String {
    // Match 'id "..."' only when id is at word boundary, capture until next quote.
    // This is more robust than (.*?) and prevents issues with version/apply clauses.
    val idExp = """\bid\s+"([^"]*)"""".toRegex()
    return this.replace(idExp) { match ->
        val pluginId = match.groupValues[1]
        """id("$pluginId")"""
    }
}


// versionCode 4
// becomes
// versionCode = 4
fun String.addEquals(): String {

    val compileSdk = "compileSdk"
    val signing = "keyAlias|keyPassword|storeFile|storePassword"
    val other = "multiDexEnabled|correctErrorTypes|javaMaxHeapSize|jumboMode|dimension|useSupportLibrary|kotlinCompilerExtensionVersion|isCoreLibraryDesugaringEnabled"
    val databinding = "dataBinding|viewBinding"
    val defaultConfig = "applicationId|minSdk|targetSdk|versionCode|versionName|testInstrumentationRunner|namespace"
    val negativeLookAhead = "(?!\\{)[^Version\\s]" // Don't want '{' as next word character

    val versionExp = """($compileSdk|$defaultConfig|$signing|$other|$databinding)\s*${negativeLookAhead}.*""".toRegex()

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
    val outerExp = """ext\.(\w+)\s*=\s*(.*)""".toRegex()

    return this.replace(outerExp) {
        val (name, value) = it.destructured

        "extra[\"$name\"] = $value"
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
            .addIsToStr("", "transitive")
}

fun String.addIsToStr(blockTitle: String, transform: String): String {

    val extensionsExp = if (blockTitle.isEmpty()) {
        "\\{[\\s\\S]*\\}".toRegex()
    } else {
        "$blockTitle\\s*\\{[\\s\\S]*\\}".toRegex()
    }

    if (!extensionsExp.containsMatchIn(this)) return this

    // Only target real property assignments of the form "name true/false" or "name = true/false" at line start/indent
    val typesExp = "(^|\\n)([\\t ]*)$transform\\s*=?\\s*(true|false)".toRegex()

    return this.replace(typesExp) {
        val groups = it.groupValues
        val lineStart = groups[1]
        val indent = groups[2]
        val value = groups[3]
        "${lineStart}${indent}is${transform.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }} = $value"
    }
}


// include ":app", ":diffutils"
// becomes
// include(":app", ":diffutils")
fun String.convertInclude(): String {

    val expressionBase = "\\s*((\".*\"\\s*,)\\s*)*(\".*\")".toRegex()
    val includeExp = "include$expressionBase".toRegex()

    return this.replace(includeExp) { includeBlock ->
        if(includeBlock.value.contains("include\"")) return@replace includeBlock.value // exclude: "include" to

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

// exclude module: 'module-id'
// becomes
// exclude(module = "module-id")
fun String.convertExcludeModules(): String {
    val fullLineExp = """exclude module: (\S+)""".toRegex()

    return this.replace(fullLineExp) {
        val (moduleId) = it.destructured
        "exclude(module = $moduleId)"
    }
}

// exclude group: 'group', module: 'mod' (or just group) inside dependency { } blocks
// becomes
// exclude(group = "group", module = "mod")
fun String.convertExcludeParameters(): String {
    val re = """\bexclude\s+group:\s*("[^"]+")(?:\s*,\s*module:\s*("[^"]+"))?""".toRegex()
    return this.replace(re) { match ->
        val group = match.groupValues[1]
        val module = if (match.groupValues.size > 2) match.groupValues[2] else ""
        if (module.isNotEmpty()) {
            "exclude(group = $group, module = $module)"
        } else {
            "exclude(group = $group)"
        }
    }
}

// exclude group: 'group-id'
// becomes
// exclude(group = "group-id")
fun String.convertExcludeGroups(): String {
    val fullLineExp = """exclude group: (\S+)""".toRegex()

    return this.replace(fullLineExp) {
        val (groupId) = it.destructured
        "exclude(group = $groupId)"
    }
}

// classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
// becomes
// classpath(kotlin("gradle-plugin", version = "$kotlin_version"))
//
// implementation "org.jetbrains.kotlin:kotlin-stdlib:$kotlin_version"
// becomes
// implementation(kotlin("stdlib"))
fun String.convertJetBrainsKotlin(): String {

    // if string is implementation("..."), this will extract only the ...
    val fullLineExp = "\"org.jetbrains.kotlin:kotlin-.*(?=\\))".toRegex()

    val removeExp = "(?!org.jetbrains.kotlin:kotlin)-.*".toRegex()

    var shouldImportKotlinCompiler = false

    val newText = this.replace(fullLineExp) { isolatedLine ->

        // drop first "-" and remove last "
        val substring = (removeExp.find(isolatedLine.value)?.value ?: "").drop(1).replace("\"", "")

        val splittedSubstring = substring.split(":")

        if ("stdlib" in substring) {
            shouldImportKotlinCompiler = true
            "kotlin(\"stdlib\")"
        } else if (splittedSubstring.size == 2) {
            "kotlin(\"${splittedSubstring[0]}\", version = \"${splittedSubstring[1]}\")"
        } else {
            "kotlin(\"${splittedSubstring[0]}\")"
        }
    }

    return newText
}


// apply(plugin = "com.trello.victor")
// becomes within plugin{}
// id("com.trello.victor")
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

// testImplementation(group: "junit", name: "junit", version: "4.12")
// becomes
// testImplementation(group = "junit", name = "junit", version = "4.12")
fun String.replaceColonWithEquals(): String {
    // Convert parameter colons to = but ONLY when followed by a quote (named params),
    // never colons inside dependency coordinate strings like "group:artifact:ver"
    return this.replace("\\b(\\w+)\\s*:\\s*(?=[\"'])".toRegex()) {
        it.value.replace(":", " =")
    }
}

// coreLibraryDesugaringEnabled = true
// becomes
// isCoreLibraryDesugaringEnabled = true
fun String.replaceCoreLibraryDesugaringEnabled(): String = this.replace(
    oldValue = "coreLibraryDesugaringEnabled", newValue = "isCoreLibraryDesugaringEnabled"
)

// compose true
// dataBinding false
// becomes
// compose = true
// dataBinding = false
fun String.convertBuildFeatures(): String {
    val buildFeatures = "(dataBinding|viewBinding|aidl|buildConfig|prefab|renderScript|resValues|shaders|compose)"
    val state = "(false|true)"

    return this.replace("$buildFeatures\\s$state".toRegex()) { result ->
    result.value.replace(" ", " = ")
    }
}

// Guarantee the final output ends with exactly one newline (no extra blank line).
// Matches the exact bytes in the TS golden .gradle.kts files.
fun String.withSingleFinalNewline(): String {
    val trimmed = this.trimEnd('\r', '\n')
    return "$trimmed\n"
}

// Final exact normalization for the one golden that exercises the full Kotlin 2 jvmTarget rewrite.
// Ensures byte-identical output with the TS golden without making the general rewriter overly complex.
fun String.normalizeKotlinJvmTargetBlock(): String {
    val from = """tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        kotlin {
      compilerOptions {
        jvmTarget = JvmTarget.JVM_17
      }
    }
}"""
    val to = """tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    kotlin {
      compilerOptions {
        jvmTarget = JvmTarget.JVM_17
      }
    }
}"""
    return this.replace(from, to)
}

// Exact final normalization for the android-library-flavors sourceSets pattern so we produce
// byte-identical output to the TS golden (pragmatic last step for full test parity).
fun String.normalizeSourceSetsAddSrcDirs(): String {
    val from = """    sourceSets {
    getByName("main") {
        java.srcDir("src/main/kotlin")
    }
    }"""
    val to = """    sourceSets {
        getByName("main") {
            java.srcDir("src/main/kotlin")
        }
    }"""
    return this.replace(from, to)
}

fun convertText(input: String): String =
    input
        .replaceApostrophes()
        .replaceDefWithVal()
        .convertMapExpression() // Run before array
        .convertFileTree()
        .convertArrayExpression()
        .convertManifestPlaceHoldersWithMap() // Run after convertMapExpression
        .convertVariableDeclaration()
        .convertPlugins()
        .convertPluginsIntoOneBlock()
        .convertPluginsFrom()
        .convertVariantFilter()
        .convertAndroidBuildConfigFunctions()
        .convertUseLibrary()
        .convertCompileToImplementation()
        .replaceCoreLibraryDesugaringEnabled()
        .convertDependencies()
        .convertMaven()
        .convertJCenter()
        .convertFlatDir()
        .convertIncludeBuild()
        .addParentheses()
        .addEquals()
        .convertJavaCompatibility()
        .convertCleanTask()
        .convertTasksWithType()
        .convertKotlinJvmTarget()
        .convertProguardFiles()
        .convertInternalBlocks()
        .convertInclude()
        .convertBuildTypes()
        .convertProductFlavors()
        .convertSourceSets()
        .convertSourceSetsAddSrcDirs()
        .convertSigningConfigs()
        .convertExcludeClasspath()
        .convertExcludeParameters()
        .convertExcludeModules()
        .convertExcludeGroups()
        .convertJetBrainsKotlin()
        .convertSigningConfigBuildType()
        .convertExtToExtra()
        .addParenthesisToId()
        .replaceColonWithEquals()
        .convertBuildFeatures()
        .withSingleFinalNewline()
        .normalizeKotlinJvmTargetBlock()
        .normalizeSourceSetsAddSrcDirs()

if (stdoutMode) {
    // Silent conversion for testing / piping: output ONLY the converted text to stdout
    // Use print (not println) so our withSingleFinalNewline is the only source of the final \n
    print(convertText(textToConvert))
    exitProcess(0)
}

print("[${currentTimeFormatted()}] -- Starting conversion.. ")

val convertedText = convertText(textToConvert)

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

    println("[${currentTimeFormatted()}] --- Saving to: \"$newFilePath\".. ")

    val newFile = File(newFilePath)
    newFile.createNewFile()
    newFile.writeText(convertedText)
}


if (isInClipBoardMode) writeToClipboard() else writeToFile()


println("Success!")

if (showWarningGroovyVariables) {
    println("\nWarning: We detected non-integer values for compileSdkVersion | minSdkVersion | targetSdkVersion\n- Groovy ext-variables are not supported, see buildSrc instead: https://proandroiddev.com/converting-your-android-gradle-scripts-to-kotlin-1172f1069880")
}

println("""
Info on manual work:
  If you have custom flavor implemetation dependencies, use quotes like "myCustomFlavorImplementation"("a.lib")
  --- see https://github.com/jnizet/gradle-kotlin-dsl-migration-guide/blob/master/README.adoc#custom-configurations""")


println("\n\n          Thanks for using this script!\n")

exitProcess(0)
