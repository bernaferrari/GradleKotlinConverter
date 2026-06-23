type ConversionFunction = (text: string) => string;

export class GradleToKtsConverter {
  private conversionFunctions: ConversionFunction[] = [
    this.replaceApostrophes,
    this.removeKotlinCompilerVersionImport,
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
    this.convertJCenter,
    this.convertFlatDir,
    this.convertLegacySdkVersions,
    this.addParentheses,
    this.convertFlavorDimensions,
    this.convertUseLibrary,
    this.convertFlavorDimensionProperty,
    this.addEquals,
    this.convertJavaCompatibility,
    this.convertCleanTask,
    this.convertProguardFiles,
    this.convertInternalBlocks,
    this.convertIncludeBuild,
    this.convertInclude,
    this.convertBuildTypes,
    this.convertProductFlavors,
    this.convertSourceSetsAddSrcDirs,
    this.convertSourceSets,
    this.convertSigningConfigs,
    this.convertVersionCatalogs,
    this.convertArtifacts,
    this.convertExcludeClasspath,
    this.convertExcludeParameters,
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
    this.convertAllLambdaParamToThisAlias,
    this.convertCompileKotlinTask,
    this.convertTestOptions,
    this.convertBuildFeatures,
    this.addAgpMigrationWarnings,
    this.convertExtBlocksToExtra,
  ];

  convert(input: string): string {
    return this.conversionFunctions.reduce((text, fn) => fn.call(this, text), input);
  }

  private replaceAll(str: string, find: string | RegExp, replace: string): string {
    if (typeof find === "string") {
      // Escape special regex chars when find is a literal string
      find = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    return str.replace(new RegExp(find, "g"), replace);
  }

  private replaceWithCallback(
    str: string,
    regex: RegExp,
    callback: (match: RegExpMatchArray) => string,
  ): string {
    return str.replace(regex, (match, ...args) => callback([match, ...args]));
  }

  /**
   * Returns true if the character at `pos` is inside a string literal
   * (handles ', ", ''', """).
   * Used to avoid mangling code-like text that appears inside string values.
   */
  private isInsideString(text: string, pos: number): boolean {
    let i = 0;
    let inString = false;
    let delim = "";
    let dlen = 1;

    while (i < pos) {
      if (inString) {
        if (text.startsWith(delim, i)) {
          inString = false;
          i += dlen;
          continue;
        }
        if (dlen === 1 && text[i] === "\\") {
          i += 2;
          continue;
        }
        i++;
        continue;
      }
      // Prefer triple-quoted delimiters
      if (i + 2 < text.length) {
        const tri = text.slice(i, i + 3);
        if (tri === '"""' || tri === "'''") {
          delim = tri;
          dlen = 3;
          inString = true;
          i += 3;
          continue;
        }
      }
      const ch = text[i];
      if (ch === '"' || ch === "'") {
        delim = ch;
        dlen = 1;
        inString = true;
        i++;
        continue;
      }
      i++;
    }
    return inString;
  }

  /**
   * Like replaceWithCallback, but skips matches whose starting position
   * is inside a string literal. Prevents transforming fake "assignments"
   * that live inside version strings, descriptions, etc.
   */
  private replaceOutsideStrings(
    text: string,
    regex: RegExp,
    callback: (match: RegExpMatchArray) => string,
  ): string {
    // Ensure we can iterate all matches
    const flags = regex.flags.includes("g") ? regex.flags : regex.flags + "g";
    const re = new RegExp(regex.source, flags);
    let result = "";
    let last = 0;
    for (const match of text.matchAll(re)) {
      const start = match.index!;
      const fullLen = match[0].length;
      if (this.isInsideString(text, start)) {
        result += text.slice(last, start + fullLen);
      } else {
        result += text.slice(last, start);
        result += callback(match as RegExpMatchArray);
      }
      last = start + fullLen;
    }
    result += text.slice(last);
    return result;
  }

  private replaceApostrophes(text: string): string {
    return this.replaceAll(text, "'", '"');
  }

  private removeKotlinCompilerVersionImport(text: string): string {
    return text.replace(
      /^import\s+org\.jetbrains\.kotlin\.config\.KotlinCompilerVersion\s*\n?/gm,
      "",
    );
  }

  private convertFunctionDeclarations(text: string): string {
    // Convert Groovy function declarations to Kotlin
    // static def functionName() -> fun functionName()
    // def functionName() -> fun functionName()
    const functionDeclExp = /(?:static\s+)?def\s+(\w+)\s*\(/g;
    return text.replace(functionDeclExp, "fun $1(");
  }

  private replaceDefWithVal(text: string): string {
    return text.replace(/(^|\s)def\s+/g, "$1val ");
  }

  private convertMapExpression(text: string): string {
    const mapRegExp = /\[(\s*\w+:\s*[^,:\s\]]+\s*(?:,\s*\w+:\s*[^,:\s\]]+\s*)*)\]/g;
    return this.replaceWithCallback(text, mapRegExp, (match) => {
      const entries = match[1].split(",").map((entry) => {
        const [key, value] = entry.split(":").map((s) => s.trim());
        return `"${key}" to ${value}`;
      });
      return `mapOf(${entries.join(", ")})`;
    });
  }

  private convertFileTree(text: string): string {
    // Convert fileTree with named parameters to mapOf syntax
    // Handle both colon and equals syntax: fileTree(dir: "...", include: ...)
    const fileTreeWithNamedParams =
      /fileTree\(\s*(\w+)\s*[:=]\s*([^,]+),\s*(\w+)\s*[:=]\s*(.+?)\)/g;
    return text.replace(fileTreeWithNamedParams, (match, key1, val1, key2, val2) => {
      return `fileTree(mapOf("${key1}" to ${val1.trim()}, "${key2}" to ${val2.trim()}))`;
    });
  }

  private convertArrayExpression(text: string): string {
    return this.replaceWithCallback(text, /\[([^\]]*?)\]/g, (match) => {
      const content = match[1].trim();
      return content && !/^\d+$/.test(content) ? `listOf(${content})` : match[0];
    });
  }

  private convertManifestPlaceHoldersWithMap(text: string): string {
    const regExp = /manifestPlaceholders = (mapOf\([^)]*\))/g;
    return text.replace(regExp, "manifestPlaceholders.putAll($1)");
  }

  private convertVariableDeclaration(text: string): string {
    const varDeclExp = /(?:final\s+)?(\w+)(<.+>)? +(\w+)\s*=\s*(.+)/g;
    return this.replaceWithCallback(text, varDeclExp, (match) => {
      const [, type, genericsType, id, value] = match;
      return type === "val"
        ? match[0]
        : `val ${id}: ${this.convertType(type)}${genericsType || ""} = ${value}`;
    });
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
    };
    return typeMap[type] || type;
  }

  private convertPlugins(text: string): string {
    const pluginsExp = /apply plugin: (\S+)/g;
    return this.replaceWithCallback(text, pluginsExp, (match) => `apply(plugin = ${match[1]})`);
  }

  private convertPluginsIntoOneBlock(text: string): string {
    const fullLineExp = /(apply\(plugin\s*=\s*".*"\)[\s\S]){2,}/g;
    const isolatedId = /".*"(?=\))/g;

    return this.replaceWithCallback(text, fullLineExp, (match) => {
      const plugins =
        match[0]
          .match(isolatedId)
          ?.map((id) => `    id(${id})`)
          .join("\n") || "";
      return `plugins {\n${plugins}\n}\n`;
    });
  }

  private convertPluginsFrom(text: string): string {
    const pluginsExp = /apply from: (\S+)/g;
    return this.replaceWithCallback(text, pluginsExp, (match) => `apply(from = ${match[1]})`);
  }

  private convertVariantFilter(text: string): string {
    const arrayExp = /variantFilter\s*\{\s*(\w+\s*->)/g;
    return this.replaceWithCallback(
      text,
      arrayExp,
      (match) =>
        `variantFilter { val ${match[1].replace(/\s*->/, "")} = this // TODO(AGP): migrate variantFilter to androidComponents.beforeVariants; setIgnore(true) maps to enabled = false\n`,
    );
  }

  private convertAndroidBuildConfigFunctions(text: string): string {
    const outerExp = /(buildConfigField|resValue|flavorDimensions|exclude|java\.srcDir)\s+(".*")/g;
    return this.replaceWithCallback(text, outerExp, (match) => `${match[1]}(${match[2]})`);
  }

  private convertCompileToImplementation(text: string): string {
    const outerExp = /(androidTestCompile|testCompile|compile)(?!O).*".*"/g;
    return this.replaceWithCallback(text, outerExp, (match) => {
      if (match[0].includes("androidTestCompile")) {
        return match[0].replace("androidTestCompile", "androidTestImplementation");
      } else if (match[0].includes("testCompile")) {
        return match[0].replace("testCompile", "testImplementation");
      } else {
        return match[0].replace("compile", "implementation");
      }
    });
  }

  private replaceCoreLibraryDesugaringEnabled(text: string): string {
    return text.replace("coreLibraryDesugaringEnabled", "isCoreLibraryDesugaringEnabled");
  }

  private convertDependencies(text: string): string {
    const testKeywords =
      "testImplementation|androidTestImplementation|debugImplementation|releaseImplementation|compileOnly|testCompileOnly|runtimeOnly|testRuntimeOnly|androidTestRuntimeOnly|debugRuntimeOnly|releaseRuntimeOnly|developmentOnly";
    const customKeywords = "modImplementation|modApi|modCompileOnly|modRuntimeOnly";
    const gradleKeywords = `(${testKeywords}|${customKeywords}|implementation|api|annotationProcessor|classpath|kaptTest|kaptAndroidTest|kapt|check|ksp|coreLibraryDesugaring|detektPlugins|lintPublish|lintCheck)`;

    // Match dependency keywords only at the start of a line or after whitespace,
    // and not when they're inside quotes or after a hyphen (like in "kotlin-kapt")
    const validKeywords = new RegExp(
      `(?:^|\\s)(?!${gradleKeywords}\\s*(\\{|"\\)|\\.))(?<![-"])${gradleKeywords}\\b(?![-"]).*`,
      "gm",
    );

    return this.replaceWithCallback(text, validKeywords, (match) => {
      // Preserve leading whitespace
      const leadingWhitespace = match[0].match(/^\s*/)?.[0] || "";
      const trimmedMatch = match[0].trim();

      if (trimmedMatch.match(/\)(\s*)\{/)) return match[0];

      // Skip lines with assignment operators like +=, -=, etc.
      if (
        trimmedMatch.includes(" += ") ||
        trimmedMatch.includes(" -= ") ||
        trimmedMatch.includes(" *= ") ||
        trimmedMatch.includes(" /= ")
      ) {
        return match[0];
      }

      const comment = trimmedMatch.match(/\s*\/\/.*/)?.[0] || "";
      const processedSubstring = trimmedMatch.replace(comment, "");
      const gradleKeyword = processedSubstring.match(new RegExp(gradleKeywords))?.[0];
      const isolated = processedSubstring.replace(new RegExp(gradleKeywords), "").trim();

      if (isolated !== "" && (isolated[0] !== "(" || isolated[isolated.length - 1] !== ")")) {
        return `${leadingWhitespace}${gradleKeyword}(${isolated})${comment}`;
      } else {
        return `${leadingWhitespace}${gradleKeyword}${isolated}${comment}`;
      }
    });
  }

  private convertMaven(text: string): string {
    // First, handle simple maven { url = "..." } or maven { url "..." } blocks (single line, url only)
    // These can be converted to the shorthand maven("url") syntax
    let result = text.replace(/maven\s*\{\s*url\s*=?\s*"([^"]+)"\s*\}/g, 'maven("$1")');

    // Then handle maven blocks with credentials or other nested content
    // These need to keep the block format but add uri() and proper assignments

    // Convert url "..." or url '...' to url = uri("...") ONLY if not already converted above
    // This handles multi-line maven blocks
    result = result.replace(/\b(url)\s+("[^"]+"|'[^']+')(?!\s*\})/g, (match, keyword, urlValue) => {
      const cleanUrl = urlValue.replace(/'/g, '"');
      return `${keyword} = uri(${cleanUrl})`;
    });

    // Convert username and password assignments
    result = result.replace(/\b(username|password)\s+("[^"]+")/g, "$1 = $2");

    return result;
  }

  private convertJCenter(text: string): string {
    return text.replace(/\bjcenter\(\)/g, "mavenCentral()");
  }

  private convertFlatDir(text: string): string {
    return text.replace(/\bdirs\s+("[^"\n]+"(?:\s*,\s*"[^"\n]+")*)/g, "dirs($1)");
  }

  private convertLegacySdkVersions(text: string): string {
    const sdkMap: Record<string, string> = {
      compileSdkVersion: "compileSdk",
      minSdkVersion: "minSdk",
      targetSdkVersion: "targetSdk",
    };

    // Convert legacy compileSdkVersion / minSdkVersion / targetSdkVersion (bare or parenthesized)
    // into the modern property form used in Kotlin DSL + recent AGP.
    // Examples:
    //   compileSdkVersion 28  ->  compileSdk = 28
    //   targetSdkVersion(34)  ->  targetSdk = 34
    return this.replaceOutsideStrings(
      text,
      /\b(compileSdkVersion|minSdkVersion|targetSdkVersion)\s*(?:\(([^)]+)\)|(\S+))/g,
      (match) => {
        const method = match[1];
        const value = (match[2] || match[3] || "").trim();
        return `${sdkMap[method]} = ${value}`;
      },
    );
  }

  private addParentheses(text: string): string {
    // consumerProguardFiles "foo.pro"  or  consumerProguardFiles "a", "b"
    // becomes consumerProguardFiles("foo.pro") or consumerProguardFiles("a", "b")
    // Legacy SDK version methods are handled earlier by convertLegacySdkVersions.
    return text.replace(
      /\bconsumerProguardFiles(?!\s*\()\s+(.+)/g,
      (_match, args) => `consumerProguardFiles(${args.trim()})`,
    );
  }

  private convertFlavorDimensions(text: string): string {
    // Convert flavorDimensions "a", "b" to flavorDimensions("a", "b")
    const flavorDimensionsExp = /flavorDimensions\s+(.+)/g;
    return text.replace(flavorDimensionsExp, "flavorDimensions($1)");
  }

  private convertUseLibrary(text: string): string {
    // Convert useLibrary "name" to useLibrary("name")
    const useLibraryExp = /useLibrary\s+("[^"]+")/g;
    return text.replace(useLibraryExp, "useLibrary($1)");
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
    ];
    // Use word boundary to prevent matching substrings like "compileSdk" in "compileSdkVersion"
    const versionExp = new RegExp(
      `(^|\\n)([\\t ]*)([\\w.]+\\.)?(${keywords.join("|")})\\s+(?!=|->)([^\\s{].*)`,
      "g",
    );

    return this.replaceOutsideStrings(text, versionExp, (match) => {
      const [, lineStart, indent, receiver = "", key, value] = match;
      return `${lineStart}${indent}${receiver}${key} = ${value}`;
    });
  }

  private convertJavaCompatibility(text: string): string {
    // Supports:
    //   sourceCompatibility '1.8'
    //   targetCompatibility = "17"
    //   android.compileOptions.sourceCompatibility 1.8
    //   ... with trailing comments preserved
    return text.replace(
      /(?:([\w.]+\.))?(sourceCompatibility|targetCompatibility)\s*(?:=\s*)?["']?([^"'\s;]+)["']?([^\n]*)/g,
      (_match, receiver = "", key, value, trailing) => {
        const cleanValue = value.trim();
        const rightHand = cleanValue.includes("JavaVersion")
          ? cleanValue
          : `JavaVersion.VERSION_${cleanValue.replace(/\./g, "_")}`;
        return `${receiver}${key} = ${rightHand}${trailing}`;
      },
    );
  }

  private convertCleanTask(text: string): string {
    const cleanExp = /task clean\(type: Delete\)\s*\{[\s\S]*}/g;
    const registerClean = `tasks.register<Delete>("clean").configure {
    delete(rootProject.buildDir)
 }`;
    return text.replace(cleanExp, registerClean);
  }

  private convertProguardFiles(text: string): string {
    const proguardExp = /proguardFiles .*/g;
    return this.replaceWithCallback(text, proguardExp, (match) => {
      const isolatedArgs = match[0].replace(/proguardFiles\s*/, "");
      return `setProguardFiles(listOf(${isolatedArgs}))`;
    });
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
    ];

    return blocks.reduce(
      (acc, { title, transform }) => this.addIsToStr(acc, title, transform),
      text,
    );
  }

  private addIsToStr(text: string, blockTitle: string, transform: string): string {
    const extensionsExp = new RegExp(`${blockTitle}\\s*\\{[\\s\\S]*\\}`, "g");
    if (!extensionsExp.test(text)) return text;

    const typesExp = new RegExp(`(^|\\n)([\\t ]*)${transform}\\s*=?\\s*(true|false)`, "g");
    return text.replace(typesExp, (_match, lineStart, indent, value) => {
      return `${lineStart}${indent}is${transform[0].toUpperCase() + transform.slice(1)} = ${value}`;
    });
  }

  private convertInclude(text: string): string {
    const expressionBase = /\s*((".*"\s*,)\s*)*(".*")/;
    const includeExp = new RegExp(`include${expressionBase.source}`, "g");

    return this.replaceWithCallback(text, includeExp, (match) => {
      if (match[0].includes('include"')) return match[0];
      const multiLine = match[0].split("\n").filter((line) => line.trim()).length > 1;
      const isolated = match[0].match(expressionBase)?.[0]?.trim() || "";
      return multiLine ? `include(\n${isolated}\n)` : `include(${isolated})`;
    });
  }

  private convertIncludeBuild(text: string): string {
    return text.replace(/(^|\n)([\t ]*)includeBuild\s+("[^"]+")/g, "$1$2includeBuild($3)");
  }

  private convertExcludeClasspath(text: string): string {
    const fullLineExp = /.*configurations\.classpath\.exclude.*group:.*/g;
    const innerExp = /".*"/;

    return this.replaceWithCallback(text, fullLineExp, (match) => {
      const isolatedStr = match[0].match(innerExp)?.[0] || "";
      return `configurations.classpath {
    exclude(group = ${isolatedStr})
}`;
    });
  }

  private convertExcludeParameters(text: string): string {
    return text.replace(
      /\bexclude\s+group:\s*("[^"]+")(?:\s*,\s*module:\s*("[^"]+"))?/g,
      (_match, group, module) =>
        module ? `exclude(group = ${group}, module = ${module})` : `exclude(group = ${group})`,
    );
  }

  private convertExcludeModules(text: string): string {
    const fullLineExp = /exclude module: (\S+)/g;
    return this.replaceWithCallback(text, fullLineExp, (match) => {
      const [, moduleId] = match;
      return `exclude(module = ${moduleId})`;
    });
  }

  private convertExcludeGroups(text: string): string {
    const fullLineExp = /exclude group: (\S+)/g;
    return this.replaceWithCallback(text, fullLineExp, (match) => {
      const [, groupId] = match;
      return `exclude(group = ${groupId})`;
    });
  }

  private convertJetBrainsKotlin(text: string): string {
    const fullLineExp = /"org\.jetbrains\.kotlin:kotlin-.*(?=\))/g;
    const removeExp = /(?!org\.jetbrains\.kotlin:kotlin)-.*"/;

    return this.replaceWithCallback(text, fullLineExp, (match) => {
      const substring = (match[0].match(removeExp)?.[0] || "").slice(1).replace('"', "");
      const splittedSubstring = substring.split(":");

      if (substring.includes("stdlib")) {
        return 'kotlin("stdlib")';
      } else if (splittedSubstring.length === 2) {
        return `kotlin("${splittedSubstring[0]}", version = "${splittedSubstring[1]}")`;
      } else {
        return `kotlin("${splittedSubstring[0]}")`;
      }
    });
  }

  private convertSigningConfigBuildType(text: string): string {
    const outerExp = /signingConfig.*signingConfigs.*/g;
    return this.replaceWithCallback(text, outerExp, (match) => {
      const release = match[0].replace(/signingConfig.*signingConfigs\./, "");
      return `signingConfig = signingConfigs.getByName("${release}")`;
    });
  }

  private convertExtToExtra(text: string): string {
    const outerExp = /ext\.(\w+)\s*=\s*(.*)/g;
    return this.replaceWithCallback(text, outerExp, (match) => {
      const [, name, value] = match;
      return `extra["${name}"] = ${value}`;
    });
  }

  private convertExtBlocksToExtra(text: string): string {
    const regex = /(^|\n)([\t ]*)ext\s*\{/g;
    return this.getExpressionBlock(text, regex, (block) => {
      const lines = block.split("\n");
      if (lines.length < 2) return block;

      const firstLine = lines[0];
      const baseIndent = firstLine.match(/^([\t ]*)/)?.[1] || "";
      const innerIndent = `${baseIndent}    `;
      const bodyLines = lines.slice(1, -1);

      let closureDepth = 0;
      const convertedLines = bodyLines.map((line) => {
        if (!line.trim()) return line;
        if (line.trimStart().startsWith("//")) return line.replace(innerIndent, baseIndent);

        if (closureDepth > 0) {
          closureDepth += (line.match(/\{/g) || []).length;
          closureDepth -= (line.match(/\}/g) || []).length;
          return line.replace(innerIndent, baseIndent);
        }

        const assignment = line.match(/^([\t ]*)(\w+)\s*=\s*(.+)$/);
        if (!assignment)
          return `${baseIndent}// TODO: manually convert ext block line: ${line.trim()}`;

        const [, indent, name, value] = assignment;
        const closure = value.match(/^\{\s*([A-Z]\w*(?:\.[A-Z]\w*)?)\s+(\w+)\s*->\s*(.*)$/);
        if (closure) {
          const [, type, param, rest] = closure;
          closureDepth = 1 + (rest.match(/\{/g) || []).length - (rest.match(/\}/g) || []).length;
          return `${indent.replace(innerIndent, baseIndent)}extra["${name}"] = { ${param}: ${type} ->${rest ? ` ${rest}` : ""}`;
        }

        return `${indent.replace(innerIndent, baseIndent)}extra["${name}"] = ${value}`;
      });

      return convertedLines.join("\n");
    });
  }

  private addParenthesisToId(text: string): string {
    // Match 'id "..."' or 'id "..."' only when id is at word boundary
    // This prevents matching 'id' inside the quoted string
    const idExp = /\bid\s+"([^"]*)"/g;
    return text.replace(idExp, (match, pluginId) => {
      return `id("${pluginId}")`;
    });
  }

  private replaceColonWithEquals(text: string): string {
    // This function converts parameter colons to equals signs (e.g., name: "value" -> name = "value"),
    // but must avoid converting colons inside quoted strings (like dependency coordinates "org:artifact:version")

    // Use a regex that matches parameter-style colons but not those inside strings
    // Match word characters followed by optional whitespace, then colon, then optional whitespace
    // But only when followed by a quote (to ensure it's a parameter, not part of a string)
    return text.replace(/\b(\w+)\s*:\s*(?=["'])/g, "$1 = ");
  }

  private convertBuildTypes(text: string): string {
    return this.convertNestedTypes(text, "buildTypes", "named");
  }

  private convertProductFlavors(text: string): string {
    return this.convertNestedTypes(text, "productFlavors", "create");
  }

  private convertFlavorDimensionProperty(text: string): string {
    return text.replace(/\bdimension\s+("[^"]+")/g, "dimension = $1");
  }

  private convertSourceSets(text: string): string {
    return this.convertNestedTypes(text, "sourceSets", "named");
  }

  private convertSourceSetsAddSrcDirs(text: string): string {
    const sourceSetExp =
      /(^|\n)([\t ]*)sourceSets\s*\{\s*\n?[\t ]*main\.java\.srcDirs\s*\+=\s*("[^"]+")\s*\n?[\t ]*\}/g;

    return text.replace(sourceSetExp, (_match, lineStart, indent, path) => {
      const innerIndent = `${indent}    `;
      return `${lineStart}${indent}sourceSets {
${innerIndent}getByName("main") {
${innerIndent}    java.srcDir(${path})
${innerIndent}}
${indent}}`;
    });
  }

  private convertSigningConfigs(text: string): string {
    return this.convertNestedTypes(text, "signingConfigs", "register");
  }

  private convertVersionCatalogs(text: string): string {
    // Inside versionCatalogs { <name> { ... } }, rewrite to create("<name>") { ... }
    const regex = /versionCatalogs\s*\{/g;
    return this.getExpressionBlock(text, regex, (substring) => {
      return substring.replace(
        /(^|\n)(\s*)(\w+)(\s+)(?=\{)/gm,
        (match, lineStart, indent, word, space) => {
          if (word === "versionCatalogs" || word === "create") return match;
          return `${lineStart}${indent}create("${word}")${space}`;
        },
      );
    });
  }

  private convertArtifacts(text: string): string {
    // Convert artifacts { archives shadowJar } to artifacts { add("archives", shadowJar) }
    const regex = /artifacts\s*\{/g;
    return this.getExpressionBlock(text, regex, (substring) => {
      // Match lines like: archives shadowJar, archives myTask, etc.
      // Pattern: <configName> <taskName>
      return substring.replace(
        /(^|\n)(\s*)(\w+)\s+(\w+)(\s*)$/gm,
        (match, lineStart, indent, configName, taskName, trailing) => {
          if (configName === "artifacts") return match;
          return `${lineStart}${indent}add("${configName}", ${taskName})${trailing}`;
        },
      );
    });
  }

  private convertNestedTypes(text: string, buildTypes: string, named: string): string {
    const regex = new RegExp(`${buildTypes}\\s*\\{`, "g");
    return this.getExpressionBlock(text, regex, (substring) => {
      // Match optional leading whitespace, then word, then whitespace before {
      // but skip if it's the buildTypes keyword
      return substring.replace(
        /(^|\n)(\s*)(\w+)(\s+)(?=\{)/gm,
        (match, lineStart, indent, word, space) => {
          // Skip the outer keyword (buildTypes, productFlavors, etc.)
          if (word === buildTypes) {
            return match;
          }
          return `${lineStart}${indent}${named}("${word}")${space}`;
        },
      );
    });
  }

  private getExpressionBlock(
    text: string,
    expression: RegExp,
    modifyResult: (s: string) => string,
  ): string {
    const matches = text.match(expression);
    if (!matches) return text;

    let result = text;
    let searchFrom = 0;
    for (const match of matches) {
      const startIndex = result.indexOf(match, searchFrom);
      if (startIndex === -1) continue;

      // Find the first '{' after the keyword match, respecting strings
      let openBraceIndex = -1;
      let inString = false;
      let stringChar = "";
      let escaped = false;
      for (let i = startIndex; i < result.length; i++) {
        const ch = result[i];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (inString) {
          if (ch === stringChar) inString = false;
          continue;
        }
        if (ch === '"' || ch === "'") {
          inString = true;
          stringChar = ch;
          continue;
        }
        if (ch === "{") {
          openBraceIndex = i;
          break;
        }
      }
      if (openBraceIndex === -1) continue;

      // Now count braces from the opening {, skipping strings
      let count = 1;
      inString = false;
      stringChar = "";
      escaped = false;
      let endIndex = result.length;
      for (let i = openBraceIndex + 1; i < result.length; i++) {
        const ch = result[i];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (inString) {
          if (ch === stringChar) inString = false;
          continue;
        }
        if (ch === '"' || ch === "'") {
          inString = true;
          stringChar = ch;
          continue;
        }
        if (ch === "{") count++;
        else if (ch === "}") {
          count--;
          if (count === 0) {
            endIndex = i + 1;
            break;
          }
        }
      }

      const block = result.substring(startIndex, endIndex);
      const convertedBlock = modifyResult(block);
      result = result.substring(0, startIndex) + convertedBlock + result.substring(endIndex);
      searchFrom = startIndex + convertedBlock.length;
    }

    return result;
  }

  private convertGroovyTasks(text: string): string {
    const groovyTaskExp = /(^|\n)([\t ]*)compileGroovy\s*\{/g;
    return text.replace(
      groovyTaskExp,
      (_m, nl, indent) => `${nl}${indent}tasks.named<GroovyCompile>("compileGroovy") {`,
    );
  }

  private convertCompileKotlinTask(text: string): string {
    // compileKotlin { ... } -> tasks.named<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>("compileKotlin") { ... }
    const header = /(^|\n)([\t ]*)compileKotlin\s*\{/g;
    let out = text.replace(
      header,
      (_m, nl, indent) =>
        `${nl}${indent}tasks.named<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>("compileKotlin") {`,
    );

    // Inside blocks, normalize dependsOn(tasks.getByPath("...")) -> dependsOn(tasks.named("..."))
    out = out.replace(
      /dependsOn\s*\(\s*tasks\.getByPath\(("[^"]+"|'[^']+')\)\s*\)/g,
      "dependsOn(tasks.named($1))",
    );

    // Fix accidental classpath(+= files(...)) -> classpath += files(...)
    out = out.replace(/classpath\(\s*\+=\s*/g, "classpath += ");

    return out;
  }

  private convertTasksWithType(text: string): string {
    // tasks.withType(Type).all { ... } -> tasks.withType<Type> { ... }
    // tasks.withType(Type) { ... } -> tasks.withType<Type> { ... }
    const withTypeAll = /tasks\.withType\(\s*([^)]+?)\s*\)\.all\s*\{/g;
    const withType = /tasks\.withType\(\s*([^)]+?)\s*\)\s*\{/g;
    let out = text.replace(withTypeAll, "tasks.withType<$1> {");
    out = out.replace(withType, "tasks.withType<$1> {");
    return out;
  }

  private convertKotlinJvmTarget(text: string): string {
    // Convert kotlinOptions { jvmTarget = "11" } to
    // kotlin { compilerOptions { jvmTarget = JvmTarget.JVM_11 } }
    // and add import org.jetbrains.kotlin.gradle.dsl.JvmTarget if missing
    const blockRegex = /(\n?)([\t ]*)kotlinOptions\s*\{([\s\S]*?)\n\2\}/g;
    let didChange = false;

    const out = text.replace(blockRegex, (full, leadingNL, indent, body) => {
      const m = body.match(/jvmTarget\s*=\s*(["']?)([\d.]+)\1/);
      if (!m) return full;
      const version = m[2];
      const enumValue = version.includes(".")
        ? `JVM_${version.replace(/\./g, "_")}`
        : `JVM_${version}`;
      didChange = true;
      const newBlock = `${leadingNL}${indent}kotlin {\n${indent}  compilerOptions {\n${indent}    jvmTarget = JvmTarget.${enumValue}\n${indent}  }\n${indent}}`;
      return newBlock;
    });

    if (didChange && !/^\s*import\s+org\.jetbrains\.kotlin\.gradle\.dsl\.JvmTarget/m.test(out)) {
      // Prepend import at top
      return `import org.jetbrains.kotlin.gradle.dsl.JvmTarget\n${out}`;
    }
    return out;
  }

  private convertAllLambdaParamToThisAlias(text: string): string {
    // Rewrite foo.all { name -> ... } to foo.all { val name = this ... }
    // Applied to common Gradle DomainObjectSet collections: applicationVariants, outputs
    const patterns = [
      /applicationVariants\.all\s*\{\s*(\w+)\s*->/g,
      /outputs\.all\s*\{\s*(\w+)\s*->/g,
    ];
    let out = text;
    for (const re of patterns) {
      out = out.replace(re, (_m, name) => {
        return `applicationVariants.all { val ${name} = this`; // placeholder; fix for outputs below
      });
      // fix outputs case where prefix got wrong
      out = out.replace(
        /applicationVariants\.all \{ val (\w+) = this(?=[^\n]*outputs\.all)/g,
        (m) => m,
      );
      out = out.replace(/outputs\.all \{\s*(\w+)\s*->/g, (_m, name) => {
        return `outputs.all { val ${name} = this`;
      });
    }
    return out;
  }

  private convertTestOptions(text: string): string {
    // Convert testOptions { unitTests { includeAndroidResources = true } }
    // to testOptions { unitTests.isIncludeAndroidResources = true }
    const testOptionsExp =
      /testOptions\s*\{\s*unitTests\s*\{\s*includeAndroidResources\s*=\s*(true|false)\s*\}\s*\}/g;
    return text.replace(
      testOptionsExp,
      "testOptions {\n    unitTests.isIncludeAndroidResources = $1\n}",
    );
  }

  private convertBuildFeatures(text: string): string {
    const buildFeatures =
      "(dataBinding|viewBinding|aidl|buildConfig|prefab|renderScript|resValues|shaders|compose)";
    const state = "(false|true)";
    const regex = new RegExp(`${buildFeatures}\\s${state}`, "g");

    return this.replaceWithCallback(text, regex, (match) => {
      return match[0].replace(" ", " = ");
    });
  }

  private addAgpMigrationWarnings(text: string): string {
    let out = text;
    out = out.replace(
      /(^|\n)([\t ]*)variantFilter\s*\{/g,
      "$1$2// TODO(AGP): variantFilter is deprecated; migrate this block to androidComponents.beforeVariants.\n$2variantFilter {",
    );
    out = out.replace(
      /(^|\n)([\t ]*)density\s*\{/g,
      "$1$2// TODO(AGP): density APK splits are removed in AGP 9; use Android App Bundle device targeting instead.\n$2density {",
    );
    out = out.replace(
      /(^|\n)([\t ]*)(renderScript\s*=\s*(?:true|false)|renderscript\w*\s*=?\s*[^)\n]+)/gi,
      "$1$2// TODO(AGP): RenderScript support is deprecated and removed in newer AGP versions; migrate away from RenderScript.\n$2$3",
    );
    return out;
  }
}
