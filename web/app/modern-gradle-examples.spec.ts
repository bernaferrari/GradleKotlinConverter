import { describe, expect, it } from "vitest";
import { modernGradleExamples } from "./conversion-examples";
import { GradleToKtsConverter } from "./logic";

describe("modern Gradle and AGP conversion examples", () => {
  const converter = new GradleToKtsConverter();

  it.each(modernGradleExamples)("$description", (example) => {
    const result = converter.convert(example.input);

    for (const snippet of example.expectedSnippets) {
      expect(result).toContain(snippet);
    }

    for (const snippet of example.forbiddenSnippets ?? []) {
      expect(result).not.toContain(snippet);
    }
  });

  it("flags variantFilter blocks for androidComponents migration", () => {
    const result = converter.convert(`android {
  variantFilter { variant ->
    setIgnore(true)
  }
}`);

    expect(result).toContain("TODO(AGP): variantFilter is deprecated");
    expect(result).toContain("migrate variantFilter to androidComponents.beforeVariants");
    expect(result).toContain("val variant = this");
  });

  it("flags removed density split APK blocks", () => {
    const result = converter.convert(`android {
  splits {
    density {
      enable true
    }
  }
}`);

    expect(result).toContain("TODO(AGP): density APK splits are removed in AGP 9");
  });

  it("flags RenderScript build feature usage", () => {
    const result = converter.convert(`buildFeatures {
  renderScript true
}`);

    expect(result).toContain("TODO(AGP): RenderScript support is deprecated");
    expect(result).toContain("renderScript = true");
  });
});
