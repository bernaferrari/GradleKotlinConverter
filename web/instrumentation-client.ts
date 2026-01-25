import posthog from "posthog-js"

if (typeof window !== "undefined") {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only", // or 'always' to create profiles for anonymous users as well
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
  })
}
