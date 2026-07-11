#!/bin/bash
# Test runner for the Kotlin script converter.
# Mirrors the structure and strictness of web/app/golden-fixtures.spec.ts
# (7 per-fixture checks + pairing assertion).
# Usage: ./test.sh [specific-fixture-name.gradle]
# Requires kotlinc in PATH.

set +e
set -u
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GOLDEN_DIR="${SCRIPT_DIR}/../web/app/fixtures/golden"
KOTLIN_SCRIPT="${SCRIPT_DIR}/gradlekotlinconverter.kts"

KOTLINC_CMD="kotlinc -script ${KOTLIN_SCRIPT} -- --stdout"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

failures=0
passes=0

compare_to_expected() {
  local input="$1"
  local expected="$2"
  local name="$3"

  local tmp_actual
  tmp_actual=$(mktemp)
  $KOTLINC_CMD "$input" 2>/dev/null > "$tmp_actual"

  if cmp -s "$expected" "$tmp_actual"; then
    echo -e "${GREEN}✓${NC} $name"
    ((passes++))
    rm -f "$tmp_actual"
  else
    echo -e "${RED}✗${NC} $name"
    echo "  Diff:"
    diff -u "$expected" "$tmp_actual" | head -80 || true
    ((failures++))
    rm -f "$tmp_actual"
  fi
}

compare_inline() {
  local name="$1"
  local input="$2"
  local expected="$3"

  local tmp_input
  local tmp_expected
  tmp_input=$(mktemp)
  tmp_expected=$(mktemp)
  printf "%s" "$input" > "$tmp_input"
  printf "%s" "$expected" > "$tmp_expected"

  compare_to_expected "$tmp_input" "$tmp_expected" "$name"
  rm -f "$tmp_input" "$tmp_expected"
}

echo "=== GradleKotlinConverter kotlin script tests ==="
echo "Using golden fixtures from: $GOLDEN_DIR"
echo

# 1. Golden fixtures from TS - exact same files and strict expectations as golden-fixtures.spec.ts
if [[ -d "$GOLDEN_DIR" ]]; then
  echo "--- Golden fixture conversions (Kotlin output vs TS .gradle.kts expected) ---"
  while IFS= read -r -d '' gradle_file; do
    base=$(basename "$gradle_file")
    kts_file="${gradle_file%.gradle}.gradle.kts"
    if [[ -f "$kts_file" ]]; then
      compare_to_expected "$gradle_file" "$kts_file" "golden: $base"
    else
      echo -e "${YELLOW}?${NC} missing expected for $base"
    fi
  done < <(find "$GOLDEN_DIR" -name "*.gradle" -print0 | sort -z)
else
  echo "No golden dir found, skipping golden tests"
fi

echo
echo "--- Pairing check: every .gradle has a matching .gradle.kts (mirrors golden-fixtures.spec.ts) ---"
expected_files=$(find "$GOLDEN_DIR" -name "*.gradle.kts" -exec basename {} .gradle.kts \; | sort)
input_files=$(find "$GOLDEN_DIR" -name "*.gradle" -exec basename {} .gradle \; | sort)
if [ "$input_files" != "$expected_files" ]; then
  echo -e "${RED}✗${NC} pairing check failed - input and expected files do not match"
  echo "Inputs:    $input_files"
  echo "Expecteds: $expected_files"
  ((failures++))
else
  echo -e "${GREEN}✓${NC} has matching expected output for every input fixture"
  ((passes++))
fi

echo
echo "--- Focused TypeScript parity regressions ---"
compare_inline \
  "regression: removes obsolete KotlinCompilerVersion import" \
  $'import org.jetbrains.kotlin.config.KotlinCompilerVersion\nplugins {\n    id "org.jetbrains.kotlin.jvm"\n}\n' \
  $'plugins {\n    id("org.jetbrains.kotlin.jvm")\n}\n'

compare_inline \
  "regression: flags variantFilter migration and aliases lambda parameter" \
  $'android {\n  variantFilter { variant ->\n    setIgnore(true)\n  }\n}\n' \
  $'android {\n  // TODO(AGP): variantFilter is deprecated; migrate this block to androidComponents.beforeVariants.\n  variantFilter { val variant = this // TODO(AGP): migrate variantFilter to androidComponents.beforeVariants; setIgnore(true) maps to enabled = false\n\n    setIgnore(true)\n  }\n}\n'

compare_inline \
  "regression: flags density split migration" \
  $'android {\n  splits {\n    density {\n      enable true\n    }\n  }\n}\n' \
  $'android {\n  splits {\n    // TODO(AGP): density APK splits are removed in AGP 9; use Android App Bundle device targeting instead.\n    density {\n      enable true\n    }\n  }\n}\n'

compare_inline \
  "regression: flags RenderScript build feature migration" \
  $'buildFeatures {\n  renderScript true\n}\n' \
  $'buildFeatures {\n  // TODO(AGP): RenderScript support is deprecated and removed in newer AGP versions; migrate away from RenderScript.\n  renderScript = true\n}\n'

compare_inline \
  "regression: modernizes bare legacy SDK versions (compileSdkVersion etc.)" \
  $'android {\n  compileSdkVersion 36\n  defaultConfig {\n    minSdkVersion 24\n    targetSdkVersion(36)\n  }\n}\n' \
  $'android {\n  compileSdk = 36\n  defaultConfig {\n    minSdk = 24\n    targetSdk = 36\n  }\n}\n'

compare_inline \
  "regression: handles multi-arg consumerProguardFiles" \
  $'consumerProguardFiles "a.pro", "b.pro"\n' \
  $'consumerProguardFiles("a.pro", "b.pro")\n'

compare_inline \
  "regression: #22 leaves assignments containing string interpolation intact" \
  $'archivesBaseName = "random-app-$versionName"\n' \
  $'archivesBaseName = "random-app-$versionName"\n'

echo
echo "--- Bug regressions (mirror web/app/bug-regressions.spec.ts core cases) ---"

compare_inline \
  "bug1: clean task does not swallow trailing allprojects" \
  $'task clean(type: Delete) {\n    delete rootProject.buildDir\n}\nallprojects {\n    repositories {\n        mavenCentral()\n    }\n}\n' \
  $'tasks.register<Delete>("clean").configure {\n    delete(rootProject.buildDir)\n }\nallprojects {\n    repositories {\n        mavenCentral()\n    }\n}\n'

compare_inline \
  "bug2: empty Groovy map [:] becomes mapOf()" \
  $'manifestPlaceholders = [:]\n' \
  $'manifestPlaceholders.putAll(mapOf())\n'

compare_inline \
  "bug2e: [:] inside strings/comments is left alone" \
  $'println "[:] empty"\n// use [:]\nmanifestPlaceholders = [:]\n' \
  $'println "[:] empty"\n// use [:]\nmanifestPlaceholders.putAll(mapOf())\n'

compare_inline \
  "bug3: array indexing with variable is preserved" \
  $'def code = versionCodes[abiName]\n' \
  $'val code = versionCodes[abiName]\n'

compare_inline \
  "bug3d: spaced array indexing is preserved" \
  $'def code = versionCodes [abiName]\n' \
  $'val code = versionCodes [abiName]\n'

compare_inline \
  "bug3f: spaced method-call list args become listOf" \
  $'dependsOn ["clean", "build"]\n' \
  $'dependsOn listOf("clean", "build")\n'

compare_inline \
  "bug4: ternary false-branch colon is preserved" \
  $'def name = isCi ? ciName : "local"\n' \
  $'val name = isCi ? ciName : "local"\n'

compare_inline \
  "bug4c: ? inside strings does not block named params" \
  $'exclude(group: "foo?", module: "bar")\n' \
  $'exclude(group = "foo?", module = "bar")\n'

compare_inline \
  "bug4f: safe-navigation ?. does not block named params" \
  $'foo(obj?.bar, group: "junit")\n' \
  $'foo(obj?.bar, group = "junit")\n'

compare_inline \
  "bug4d: multiline ternary false-branch colon is preserved" \
  $'def name = isCi ?\n    ciName : "local"\n' \
  $'val name = isCi ?\n    ciName : "local"\n'

compare_inline \
  "bug5: already-converted getByName is not double-wrapped" \
  $'signingConfig = signingConfigs.getByName("release")\n' \
  $'signingConfig = signingConfigs.getByName("release")\n'

compare_inline \
  "bug5b: groovy signingConfig still converts" \
  $'signingConfig signingConfigs.release\n' \
  $'signingConfig = signingConfigs.getByName("release")\n'

compare_inline \
  "bug7: buildToolsVersion gets equals" \
  $'buildToolsVersion "34.0.0"\n' \
  $'buildToolsVersion = "34.0.0"\n'

compare_inline \
  "bug8: property after // comment line is still converted" \
  $'// the namespace\nnamespace "com.example"\n' \
  $'// the namespace\nnamespace = "com.example"\n'

echo
echo "=== Summary: ${passes} passed, ${failures} failed ==="

if ((failures > 0)); then
  echo -e "${RED}Some tests failed. Update Kotlin converter or expectations as needed.${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
