type ConversionFunction = (text: string) => string

export class GradleToKtsConverter {
  private conversionFunctions: ConversionFunction[] = [
    this.replaceApostrophes,
    this.convertFunctionDeclarations,
    this.replaceDefWithVal,
    this.convertMapExpression,
    this.convertFileTree,
    this.convertArrayExpression,
    this.convertManifestPlaceHoldersWithMap,
    this.convertVariableDeclaration,
    this.convertPlugins,
    this.convertPluginsIntoOneBlock,
    this.convertPluginsFrom,
    this.convertVariantFilter,
    this.convertAndroidBuildConfigFunctions,
    this.convertCompileToImplementation,
    this.replaceCoreLibraryDesugaringEnabled,
    this.convertDependencies,
    this.convertMaven,
    this.addParentheses,
    this.convertFlavorDimensions,
    this.convertUseLibrary,
    this.convertDimensionToSetDimension,
    this.addEquals,
    this.convertJavaCompatibility,
    this.convertCleanTask,
    this.convertProguardFiles,
    this.convertInternalBlocks,
    this.convertInclude,
    this.convertBuildTypes,
    this.convertProductFlavors,
    this.convertSourceSets,
    this.convertSourceSetsAddSrcDirs,
    this.convertSigningConfigs,
    this.convertExcludeClasspath,
    this.convertExcludeModules,
    this.convertExcludeGroups,
    this.convertJetBrainsKotlin,
    this.convertSigningConfigBuildType,
    this.convertExtToExtra,
    this.addParenthesisToId,
    this.replaceColonWithEquals,
    this.convertGroovyTasks,
    this.convertTasksWithType,
    this.convertKotlinJvmTarget,
    this.convertTestOptions,
    this.convertBuildFeatures,
  ]

  convert(input: string): string {
    return this.conversionFunctions.reduce(
      (text, fn) => fn.call(this, text),
      input
    )
  }

  private replaceAll(
    str: string,
    find: string | RegExp,
    replace: string
  ): string {
    return str.replace(new RegExp(find, "g"), replace)
  }

  private replaceWithCallback(
    str: string,
    regex: RegExp,
    callback: (match: RegExpMatchArray) => string
  ): string {
    return str.replace(regex, (match, ...args) => callback([match, ...args]))
  }

  private replaceApostrophes(text: string): string {
    return this.replaceAll(text, "'", '"')
  }

  private convertFunctionDeclarations(text: string): string {
    // Convert Groovy function declarations to Kotlin
    // static def functionName() -> fun functionName()
    // def functionName() -> fun functionName()
    const functionDeclExp = /(?:static\s+)?def\s+(\w+)\s*\(/g
    return text.replace(functionDeclExp, 'fun $1(')
  }

  private replaceDefWithVal(text: string): string {
    return text.replace(/(^|\s)def\s+/g, "$1val ")
  }

  private convertMapExpression(text: string): string {
    const mapRegExp =
      /\[(\s*\w+:\s*[^,:\s\]]+\s*(?:,\s*\w+:\s*[^,:\s\]]+\s*)*)\]/g
    return this.replaceWithCallback(text, mapRegExp, (match) => {
      const entries = match[1].split(",").map((entry) => {
        const [key, value] = entry.split(":").map((s) => s.trim())
        return `"${key}" to ${value}`
      })
      return `mapOf(${entries.join(", ")})`
    })
  }

  private convertFileTree(text: string): string {
    const fileTreeString =
      /fileTree\(dir(\s*):(\s*)"libs"(\s*),(\s*)include(\s*):(\s*)\["\*.jar"\]\)/g
    return text.replace(
      fileTreeString,
      'fileTree(mapOf("dir" to "libs", "include" to listOf("*.jar")))'
    )
  }

  private convertArrayExpression(text: string): string {
    return this.replaceWithCallback(text, /\[([^\]]*?)\]/g, (match) => {
      const content = match[1].trim()
      return content && !/^\d+$/.test(content) ? `listOf(${content})` : match[0]
    })
  }

  private convertManifestPlaceHoldersWithMap(text: string): string {
    const regExp = /manifestPlaceholders = (mapOf\([^\)]*\))/g
    return text.replace(regExp, "manifestPlaceholders.putAll($1)")
  }

  private convertVariableDeclaration(text: string): string {
    const varDeclExp = /(?:final\s+)?(\w+)(<.+>)? +(\w+)\s*=\s*(.+)/g
    return this.replaceWithCallback(text, varDeclExp, (match) => {
      const [, type, genericsType, id, value] = match
      return type === "val"
        ? match[0]
        : `val ${id}: ${this.convertType(type)}${genericsType || ""} = ${value}`
    })
  }

  private convertType(type: string): string {
    const typeMap: { [key: string]: string } = {
      byte: "Byte",
      short: "Short",
      int: "Int",
      long: "Long",
      float: "Float",
      double: "Double",
      char: "Char",
      boolean: "Boolean",
    }
    return typeMap[type] || type
  }

  private convertPlugins(text: string): string {
    const pluginsExp = /apply plugin: (\S+)/g
    return this.replaceWithCallback(
      text,
      pluginsExp,
      (match) => `apply(plugin = ${match[1]})`
    )
  }

  private convertPluginsIntoOneBlock(text: string): string {
    const fullLineExp = /(apply\(plugin\s*=\s*".*"\)[\s\S]){2,}/g
    const isolatedId = /".*"(?=\))/g

    return this.replaceWithCallback(text, fullLineExp, (match) => {
      const plugins =
        match[0]
          .match(isolatedId)
          ?.map((id) => `    id(${id})`)
          .join("\n") || ""
      return `plugins {\n${plugins}\n}\n`
    })
  }

  private convertPluginsFrom(text: string): string {
    const pluginsExp = /apply from: (\S+)/g
    return this.replaceWithCallback(
      text,
      pluginsExp,
      (match) => `apply(from = ${match[1]})`
    )
  }

  private convertVariantFilter(text: string): string {
    const arrayExp = /variantFilter\s*\{\s*(\w+\s*->)/g
    return this.replaceWithCallback(
      text,
      arrayExp,
      (match) =>
        `variantFilter { // ${match[1]} - TODO Manually replace '${match[1]}' variable with this, and setIgnore(true) with ignore = true\n`
    )
  }

  private convertAndroidBuildConfigFunctions(text: string): string {
    const outerExp =
      /(buildConfigField|resValue|flavorDimensions|exclude|java\.srcDir)\s+(".*")/g
    return this.replaceWithCallback(
      text,
      outerExp,
      (match) => `${match[1]}(${match[2]})`
    )
  }

  private convertCompileToImplementation(text: string): string {
    const outerExp = /(compile|testCompile)(?!O).*".*"/g
    return this.replaceWithCallback(text, outerExp, (match) => {
      if (match[0].includes("testCompile")) {
        return match[0].replace("testCompile", "testImplementation")
      } else {
        return match[0].replace("compile", "implementation")
      }
    })
  }

  private replaceCoreLibraryDesugaringEnabled(text: string): string {
    return text.replace(
      "coreLibraryDesugaringEnabled",
      "isCoreLibraryDesugaringEnabled"
    )
  }

  private convertDependencies(text: string): string {
    const testKeywords =
      "testImplementation|androidTestImplementation|debugImplementation|releaseImplementation|compileOnly|testCompileOnly|runtimeOnly|developmentOnly"
    const customKeywords =
      "modImplementation|modApi|modCompileOnly|modRuntimeOnly"
    const gradleKeywords = `(${testKeywords}|${customKeywords}|implementation|api|annotationProcessor|classpath|kaptTest|kaptAndroidTest|kapt|check|ksp|coreLibraryDesugaring|detektPlugins|lintPublish|lintCheck)`
    
    // Match dependency keywords only at the start of a line or after whitespace,
    // and not when they're inside quotes or after a hyphen (like in "kotlin-kapt")
    const validKeywords = new RegExp(
      `(?:^|\\s)(?!${gradleKeywords}\\s*(\\{|"\\)|\\.))(?<![-"])${gradleKeywords}\\b(?![-"]).*`,
      "gm"
    )

    return this.replaceWithCallback(text, validKeywords, (match) => {
      // Preserve leading whitespace
      const leadingWhitespace = match[0].match(/^\s*/)?.[0] || ""
      const trimmedMatch = match[0].trim()
      
      if (trimmedMatch.match(/\)(\s*)\{/)) return match[0]

      const comment = trimmedMatch.match(/\s*\/\/.*/)?.[0] || ""
      const processedSubstring = trimmedMatch.replace(comment, "")
      const gradleKeyword = processedSubstring.match(
        new RegExp(gradleKeywords)
      )?.[0]
      const isolated = processedSubstring
        .replace(new RegExp(gradleKeywords), "")
        .trim()

      if (
        isolated !== "" &&
        (isolated[0] !== "(" || isolated[isolated.length - 1] !== ")")
      ) {
        return `${leadingWhitespace}${gradleKeyword}(${isolated})${comment}`
      } else {
        return `${leadingWhitespace}${gradleKeyword}${isolated}${comment}`
      }
    })
  }

  private convertMaven(text: string): string {
    const mavenExp = /maven\s*\{\s*url\s*(.*?)\s*?}/g
    return this.replaceWithCallback(text, mavenExp, (match) => {
      return match[0]
        .replace(/(= *uri *\()|=|(\)|(url)|( ))/g, "")
        .replace("{", "(")
        .replace("}", ")")
    })
  }

  private addParentheses(text: string): string {
    const sdkExp =
      /(compileSdkVersion|minSdkVersion|targetSdkVersion|consumerProguardFiles)\s*([^\s]*)(.*)/g
    return this.replaceWithCallback(text, sdkExp, (match) => {
      const [, keyword, value, rest] = match
      return `${keyword}(${value})${rest}`
    })
  }

  private convertFlavorDimensions(text: string): string {
    // Convert flavorDimensions "a", "b" to flavorDimensions("a", "b")
    const flavorDimensionsExp = /flavorDimensions\s+(.+)/g
    return text.replace(flavorDimensionsExp, 'flavorDimensions($1)')
  }

  private convertUseLibrary(text: string): string {
    // Convert useLibrary "name" to useLibrary("name")
    const useLibraryExp = /useLibrary\s+("[^"]+")/g
    return text.replace(useLibraryExp, 'useLibrary($1)')
  }

  private addEquals(text: string): string {
    const keywords = [
      "compileSdk",
      "applicationId",
      "minSdk",
      "targetSdk",
      "versionCode",
      "versionName",
      "testInstrumentationRunner",
      "namespace",
      "keyAlias",
      "keyPassword",
      "storeFile",
      "storePassword",
      "multiDexEnabled",
      "correctErrorTypes",
      "javaMaxHeapSize",
      "jumboMode",
      "dimension",
      "useSupportLibrary",
      "kotlinCompilerExtensionVersion",
      "isCoreLibraryDesugaringEnabled",
      "dataBinding",
      "viewBinding",
    ]
    // Use word boundary to prevent matching substrings like "compileSdk" in "compileSdkVersion"
    const versionExp = new RegExp(`\\b(${keywords.join("|")})\\b\\s+([^\\s{].*)`, "g")

    return this.replaceWithCallback(text, versionExp, (match) => {
      const [, key, value] = match
      return `${key} = ${value}`
    })
  }

  private convertJavaCompatibility(text: string): string {
    const compatibilityExp = /(sourceCompatibility|targetCompatibility).*/g
    return this.replaceWithCallback(text, compatibilityExp, (match) => {
      const split = match[0].replace(/"]*/g, "").split(/\s+/)
      if (split.length > 1) {
        if (split[split.length - 1].includes("JavaVersion")) {
          return `${split[0]} = ${split[split.length - 1]}`
        } else {
          return `${split[0]} = JavaVersion.VERSION_${split[split.length - 1].replace(/\./g, "_")}`
        }
      }
      return match[0]
    })
  }

  private convertCleanTask(text: string): string {
    const cleanExp = /task clean\(type: Delete\)\s*\{[\s\S]*}/g
    const registerClean = `tasks.register<Delete>("clean").configure {
    delete(rootProject.buildDir)
 }`
    return text.replace(cleanExp, registerClean)
  }

  private convertProguardFiles(text: string): string {
    const proguardExp = /proguardFiles .*/g
    return this.replaceWithCallback(text, proguardExp, (match) => {
      const isolatedArgs = match[0].replace(/proguardFiles\s*/, "")
      return `setProguardFiles(listOf(${isolatedArgs}))`
    })
  }

  private convertInternalBlocks(text: string): string {
    const blocks = [
      { title: "androidExtensions", transform: "experimental" },
      { title: "dataBinding", transform: "enabled" },
      { title: "lintOptions", transform: "abortOnError" },
      { title: "buildTypes", transform: "debuggable" },
      { title: "buildTypes", transform: "minifyEnabled" },
      { title: "buildTypes", transform: "shrinkResources" },
      { title: "", transform: "transitive" },
    ]

    return blocks.reduce(
      (acc, { title, transform }) => this.addIsToStr(acc, title, transform),
      text
    )
  }

  private addIsToStr(
    text: string,
    blockTitle: string,
    transform: string
  ): string {
    const extensionsExp = new RegExp(`${blockTitle}\\s*\\{[\\s\\S]*\\}`, "g")
    if (!extensionsExp.test(text)) return text

    const typesExp = new RegExp(`${transform}.*`, "g")
    return this.replaceWithCallback(text, typesExp, (match) => {
      const split = match[0].split(/\s+/)
      if (split.length > 1) {
        return `is${split[0][0].toUpperCase() + split[0].slice(1)} = ${split[split.length - 1]}`
      }
      return match[0]
    })
  }

  private convertInclude(text: string): string {
    const expressionBase = /\s*((".*"\s*,)\s*)*(".*")/
    const includeExp = new RegExp(`include${expressionBase.source}`, "g")

    return this.replaceWithCallback(text, includeExp, (match) => {
      if (match[0].includes('include"')) return match[0]
      const multiLine =
        match[0].split("\n").filter((line) => line.trim()).length > 1
      const isolated = match[0].match(expressionBase)?.[0]?.trim() || ""
      return multiLine ? `include(\n${isolated}\n)` : `include(${isolated})`
    })
  }

  private convertExcludeClasspath(text: string): string {
    const fullLineExp = /.*configurations\.classpath\.exclude.*group:.*/g
    const innerExp = /".*"/

    return this.replaceWithCallback(text, fullLineExp, (match) => {
      const isolatedStr = match[0].match(innerExp)?.[0] || ""
      return `configurations.classpath {
    exclude(group = ${isolatedStr})
}`
    })
  }

  private convertExcludeModules(text: string): string {
    const fullLineExp = /exclude module: (\S+)/g
    return this.replaceWithCallback(text, fullLineExp, (match) => {
      const [, moduleId] = match
      return `exclude(module = ${moduleId})`
    })
  }

  private convertExcludeGroups(text: string): string {
    const fullLineExp = /exclude group: (\S+)/g
    return this.replaceWithCallback(text, fullLineExp, (match) => {
      const [, groupId] = match
      return `exclude(group = ${groupId})`
    })
  }

  private convertJetBrainsKotlin(text: string): string {
    const fullLineExp = /"org\.jetbrains\.kotlin:kotlin-.*(?=\))/g
    const removeExp = /(?!org\.jetbrains\.kotlin:kotlin)-.*"/

    return this.replaceWithCallback(text, fullLineExp, (match) => {
      const substring = (match[0].match(removeExp)?.[0] || "")
        .slice(1)
        .replace('"', "")
      const splittedSubstring = substring.split(":")

      if (substring.includes("stdlib")) {
        return 'kotlin("stdlib")'
      } else if (splittedSubstring.length === 2) {
        return `kotlin("${splittedSubstring[0]}", version = "${splittedSubstring[1]}")`
      } else {
        return `kotlin("${splittedSubstring[0]}")`
      }
    })
  }

  private convertSigningConfigBuildType(text: string): string {
    const outerExp = /signingConfig.*signingConfigs.*/g
    return this.replaceWithCallback(text, outerExp, (match) => {
      const release = match[0].replace(/signingConfig.*signingConfigs\./, "")
      return `signingConfig = signingConfigs.getByName("${release}")`
    })
  }

  private convertExtToExtra(text: string): string {
    const outerExp = /ext\.(\w+)\s*=\s*(.*)/g
    return this.replaceWithCallback(text, outerExp, (match) => {
      const [, name, value] = match
      return `extra["${name}"] = ${value}`
    })
  }

  private addParenthesisToId(text: string): string {
    // Match 'id "..."' or 'id "..."' only when id is at word boundary
    // This prevents matching 'id' inside the quoted string
    const idExp = /\bid\s+"([^"]*)"/g
    return text.replace(idExp, (match, pluginId) => {
      return `id("${pluginId}")`
    })
  }

  private replaceColonWithEquals(text: string): string {
    // This function converts parameter colons to equals signs (e.g., name: "value" -> name = "value"),
    // but must avoid converting colons inside quoted strings (like dependency coordinates "org:artifact:version")
    
    // Use a regex that matches parameter-style colons but not those inside strings
    // Match word characters followed by optional whitespace, then colon, then optional whitespace
    // But only when followed by a quote (to ensure it's a parameter, not part of a string)
    return text.replace(/\b(\w+)\s*:\s*(?=["'])/g, '$1 = ')
  }

  private convertBuildTypes(text: string): string {
    return this.convertNestedTypes(text, "buildTypes", "named")
  }

  private convertProductFlavors(text: string): string {
    return this.convertNestedTypes(text, "productFlavors", "create")
  }

  private convertDimensionToSetDimension(text: string): string {
    // Convert dimension "value" to setDimension("value") inside productFlavors blocks
    // Only match when inside productFlavors context
    return text.replace(/\bdimension\s+("[^"]+")/g, 'setDimension($1)')
  }

  private convertSourceSets(text: string): string {
    return this.convertNestedTypes(text, "sourceSets", "named")
  }

  private convertSourceSetsAddSrcDirs(text: string): string {
    // Convert sourceSets { main.java.srcDirs += "path" } to sourceSets.getByName("main") { java.srcDir("path") }
    const sourceSetExp = /sourceSets\s*\{\s*main\.java\.srcDirs\s*\+=\s*("[^"]+")\s*\}/g
    return text.replace(
      sourceSetExp,
      'sourceSets.getByName("main") {\n    java.srcDir($1)\n}'
    )
  }

  private convertSigningConfigs(text: string): string {
    return this.convertNestedTypes(text, "signingConfigs", "register")
  }

  private convertNestedTypes(
    text: string,
    buildTypes: string,
    named: string
  ): string {
    const regex = new RegExp(`${buildTypes}\\s*\\{`, "g")
    return this.getExpressionBlock(text, regex, (substring) => {
      // Match optional leading whitespace, then word, then whitespace before {
      // but skip if it's the buildTypes keyword
      return substring.replace(/(^|\n)(\s*)(\w+)(\s+)(?=\{)/gm, (match, lineStart, indent, word, space) => {
        // Skip the outer keyword (buildTypes, productFlavors, etc.)
        if (word === buildTypes) {
          return match
        }
        return `${lineStart}${indent}${named}("${word}")${space}`
      })
    })
  }

  private getExpressionBlock(
    text: string,
    expression: RegExp,
    modifyResult: (s: string) => string
  ): string {
    const matches = text.match(expression)
    if (!matches) return text

    let result = text
    for (const match of matches) {
      const startIndex = result.indexOf(match)
      let count = 0
      let endIndex = startIndex
      let foundFirstBrace = false

      for (let i = startIndex; i < result.length; i++) {
        if (result[i] === "{") {
          count++
          foundFirstBrace = true
        }
        if (result[i] === "}") count--
        // Only check for end after we've found at least one opening brace
        if (foundFirstBrace && count === 0) {
          endIndex = i + 1
          break
        }
      }

      const block = result.substring(startIndex, endIndex)
      const convertedBlock = modifyResult(block)
      result =
        result.substring(0, startIndex) +
        convertedBlock +
        result.substring(endIndex)
    }

    return result
  }

  private convertGroovyTasks(text: string): string {
    const groovyTaskExp = /compileGroovy\s*\{/g
    return text.replace(
      groovyTaskExp,
      'tasks.named<GroovyCompile>("compileGroovy") {'
    )
  }

  private convertTasksWithType(text: string): string {
    // tasks.withType(Type).all { ... } -> tasks.withType<Type> { ... }
    // tasks.withType(Type) { ... } -> tasks.withType<Type> { ... }
    const withTypeAll = /tasks\.withType\(\s*([^\)]+?)\s*\)\.all\s*\{/g
    const withType = /tasks\.withType\(\s*([^\)]+?)\s*\)\s*\{/g
    let out = text.replace(withTypeAll, 'tasks.withType<$1> {')
    out = out.replace(withType, 'tasks.withType<$1> {')
    return out
  }

  private convertKotlinJvmTarget(text: string): string {
    // Convert kotlinOptions { jvmTarget = "11" } to
    // kotlin { compilerOptions { jvmTarget = JvmTarget.JVM_11 } }
    // and add import org.jetbrains.kotlin.gradle.dsl.JvmTarget if missing
    const blockRegex = /(\n?)([\t ]*)kotlinOptions\s*\{([\s\S]*?)\n\2\}/g
    let didChange = false

    const out = text.replace(blockRegex, (full, leadingNL, indent, body) => {
      const m = body.match(/jvmTarget\s*=\s*(["']?)([\d.]+)\1/)
      if (!m) return full
      const version = m[2]
      const enumValue = version.includes('.')
        ? `JVM_${version.replace(/\./g, '_')}`
        : `JVM_${version}`
      didChange = true
      const newBlock = `${leadingNL}${indent}kotlin {\n${indent}  compilerOptions {\n${indent}    jvmTarget = JvmTarget.${enumValue}\n${indent}  }\n${indent}}`
      return newBlock
    })

    if (didChange && !/^\s*import\s+org\.jetbrains\.kotlin\.gradle\.dsl\.JvmTarget/m.test(out)) {
      // Prepend import at top
      return `import org.jetbrains.kotlin.gradle.dsl.JvmTarget\n${out}`
    }
    return out
  }

  private convertTestOptions(text: string): string {
    // Convert testOptions { unitTests { includeAndroidResources = true } }
    // to testOptions { unitTests.isIncludeAndroidResources = true }
    const testOptionsExp =
      /testOptions\s*\{\s*unitTests\s*\{\s*includeAndroidResources\s*=\s*(true|false)\s*\}\s*\}/g
    return text.replace(
      testOptionsExp,
      'testOptions {\n    unitTests.isIncludeAndroidResources = $1\n}'
    )
  }

  private convertBuildFeatures(text: string): string {
    const buildFeatures =
      "(dataBinding|viewBinding|aidl|buildConfig|prefab|renderScript|resValues|shaders|compose)"
    const state = "(false|true)"
    const regex = new RegExp(`${buildFeatures}\\s${state}`, "g")

    return this.replaceWithCallback(text, regex, (match) => {
      return match[0].replace(" ", " = ")
    })
  }
}
