export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="grid scroll-mt-8 gap-4 border-b py-8 sm:grid-cols-[1fr_1.7fr] sm:gap-16 sm:py-10"
    >
      <h2 id="how-title" className="text-base font-semibold">
        Using the result
      </h2>
      <p className="max-w-prose text-sm leading-6 text-muted-foreground">
        Save the output as <code className="text-foreground">build.gradle.kts</code>, replace the
        original Groovy file, and sync Gradle. Review custom plugins and build logic, then run your
        build to check the migration.
      </p>
    </section>
  );
}
