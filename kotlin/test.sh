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
echo "=== Summary: ${passes} passed, ${failures} failed ==="

if ((failures > 0)); then
  echo -e "${RED}Some tests failed. Update Kotlin converter or expectations as needed.${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
