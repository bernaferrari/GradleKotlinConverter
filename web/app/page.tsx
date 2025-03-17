import { About } from "./about"
import Client from "./code-editors"
import { FAQ } from "./faq"
import { HowItWorks } from "./how-it-works"
import { PostHogProvider } from "./providers"

export default function Component() {
  return (
    <div className="flex min-h-screen flex-col transition-colors duration-300">
      <main className="flex grow flex-col items-center justify-start gap-8 p-4 sm:p-6 lg:p-8">
        <PostHogProvider>
          <Client />
        </PostHogProvider>
        <HowItWorks />
        <FAQ />
        <About />
      </main>
    </div>
  )
}
