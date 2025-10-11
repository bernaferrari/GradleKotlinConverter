
import { GradleToKtsConverter } from './logic';

const converter = new GradleToKtsConverter();
// @ts-ignore - Accessing private method for testing purposes
const replaceColonWithEquals = (text: string) => converter.replaceColonWithEquals(text);

const testCases = [
  {
    name: 'should convert named arguments with string values',
    input: 'someFunction(name: "test")',
    expected: 'someFunction(name = "test")',
  },
  {
    name: 'should convert named arguments with numeric values',
    input: 'myFunction(value: 123)',
    expected: 'myFunction(value = 123)',
  },
  {
    name: 'should convert named arguments with boolean values',
    input: 'yetAnother(flag: false)',
    expected: 'yetAnother(flag = false)',
  },
  {
    name: 'should handle multiple named arguments with mixed types',
    input: 'complex(name: "value", number: 99, bool: true, other: "string")',
    expected: 'complex(name = "value", number = 99, bool = true, other = "string")',
  },
  {
    name: 'should not convert colons in strings',
    input: 'someFunction(name: "key:value")',
    expected: 'someFunction(name = "key:value")',
  },
  {
    name: 'should handle single-quoted strings',
    input: "anotherFunction(label: 'example')",
    expected: "anotherFunction(label = 'example')",
  },
];

let failed = 0;

testCases.forEach(({ name, input, expected }) => {
  const actual = replaceColonWithEquals(input);
  if (actual !== expected) {
    console.error(`✗ ${name}`);
    console.error(`  Input:    ${input}`);
    console.error(`  Expected: ${expected}`);
    console.error(`  Actual:   ${actual}`);
    failed++;
  } else {
    console.log(`✓ ${name}`);
  }
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  throw new Error('Tests failed');
} else {
  console.log('\nAll tests passed!');
}
