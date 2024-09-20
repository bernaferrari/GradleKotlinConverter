type ConversionFunction = (text: string) => string

export class GradleToKtsConverter {
  private conversionFunctions: ConversionFunction[] = [
    this.replaceApostrophes,
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
    this.addEquals,
    this.convertJavaCompatibility,
    this.convertCleanTask,
    this.convertProguardFiles,
    this.convertInternalBlocks,
    this.convertInclude,
    this.convertBuildTypes,
    this.convertProductFlavors,
    this.convertSourceSets,
    this.convertSigningConfigs,
    this.convertExcludeClasspath,
    this.convertExcludeModules,
    this.convertExcludeGroups,
    this.convertJetBrainsKotlin,
    this.convertSigningConfigBuildType,
    this.convertExtToExtra,
    this.addParenthesisToId,
    this.replaceColonWithEquals,
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
    const gradleKeywords = `(${testKeywords}|implementation|api|annotationProcessor|classpath|kaptTest|kaptAndroidTest|kapt|check|ksp|coreLibraryDesugaring|detektPlugins|lintPublish|lintCheck)`
    const validKeywords = new RegExp(
      `(?!${gradleKeywords}\\s*(\\{|"\\)|\\.))${gradleKeywords}.*`,
      "g"
    )

    return this.replaceWithCallback(text, validKeywords, (match) => {
      if (match[0].match(/\)(\s*)\{/)) return match[0]

      const comment = match[0].match(/\s*\/\/.*/)?.[0] || ""
      const processedSubstring = match[0].replace(comment, "")
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
        return `${gradleKeyword}(${isolated})${comment}`
      } else {
        return `${gradleKeyword}${isolated}${comment}`
      }
    })
  }

  private convertMaven(text: string): string {
    const mavenExp = /maven\s*\{\s*url\s*(.*?)\s*?}/g
    return this.replaceWithCallback(text, mavenExp, (match) => {
      return match[0]
        .replace(/(= *uri *\()|(\)|(url)|( ))/g, "")
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
    const versionExp = new RegExp(`(${keywords.join("|")})\\s*([^\\s{].*)`, "g")

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
    const idExp = /id\s*"(.*?)"/g
    return this.replaceWithCallback(text, idExp, (match) => {
      const [, value] = match
      return `id("${value}")`
    })
  }

  private replaceColonWithEquals(text: string): string {
    const expression = /\w*:\s*".*?"/g
    return this.replaceWithCallback(text, expression, (match) => {
      return match[0].replace(":", " =")
    })
  }

  private convertBuildTypes(text: string): string {
    return this.convertNestedTypes(text, "buildTypes", "named")
  }

  private convertProductFlavors(text: string): string {
    return this.convertNestedTypes(text, "productFlavors", "create")
  }

  private convertSourceSets(text: string): string {
    return this.convertNestedTypes(text, "sourceSets", "named")
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
      return this.replaceWithCallback(substring, /\S*\s(?=\{)/g, (match) => {
        const valueWithoutWhitespace = match[0].replace(/\s/g, "")
        return `${named}("${valueWithoutWhitespace}") `
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

      for (let i = startIndex; i < result.length; i++) {
        if (result[i] === "{") count++
        if (result[i] === "}") count--
        if (count === 0) {
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
