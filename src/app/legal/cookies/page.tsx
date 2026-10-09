import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cookie Policy — Markaver",
  description: "Which cookies Markaver sets, why, and how long they last.",
}

const LAST_UPDATED = "9 October 2026"

type Row = { name: string; purpose: string; duration: string }

const ESSENTIAL: Row[] = [
  {
    name: "authjs.session-token (__Secure- prefixed over HTTPS)",
    purpose:
      "Keeps you signed in. Holds a signed token identifying your user and organisation. Without it you would be logged out on every page load.",
    duration: "30 days, or until you sign out",
  },
  {
    name: "authjs.csrf-token (__Host- prefixed over HTTPS)",
    purpose:
      "Protects the sign-in and account forms against cross-site request forgery.",
    duration: "Until the browser is closed",
  },
  {
    name: "authjs.callback-url (__Secure- prefixed over HTTPS)",
    purpose:
      "Remembers which page you were trying to reach so you are returned there after signing in.",
    duration: "Until the browser is closed",
  },
]

export default function CookiePolicyPage() {
  return (
    <article className="text-gray-700">
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Legal</p>
      <h1 className="text-3xl font-bold text-[#00343A] mb-2">Cookie Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated {LAST_UPDATED}</p>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <h2 className="text-base font-bold text-[#00343A] mb-2">In short</h2>
        <p className="text-sm leading-relaxed">
          Markaver sets <strong>only strictly necessary cookies</strong>. We do not use
          analytics, advertising, profiling or any third-party tracking cookies, and we
          do not share cookie data with anyone. Because every cookie we set is required
          to deliver a service you have asked for, we do not ask for consent to set
          them &mdash; but you can see exactly what they are below.
        </p>
      </div>

      <h2 className="text-lg font-bold text-[#00343A] mb-3">Strictly necessary cookies</h2>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f9faf8] text-left">
              <th className="px-4 py-3 font-semibold text-[#00343A]">Cookie</th>
              <th className="px-4 py-3 font-semibold text-[#00343A]">Purpose</th>
              <th className="px-4 py-3 font-semibold text-[#00343A] whitespace-nowrap">
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {ESSENTIAL.map((c) => (
              <tr key={c.name} className="border-t border-gray-100 align-top">
                <td className="px-4 py-3 font-mono text-xs text-gray-800">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.purpose}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{c.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-bold text-[#00343A] mb-3">What we do not use</h2>
      <ul className="list-disc pl-5 space-y-1.5 text-sm mb-8">
        <li>No analytics cookies (no Google Analytics, Plausible, PostHog or similar).</li>
        <li>No advertising, retargeting or profiling cookies.</li>
        <li>No embedded third-party scripts, pixels or iframes.</li>
        <li>
          No third-party web fonts loaded at run time &mdash; our fonts are served from
          our own domain, so your browser makes no request to a font provider.
        </li>
      </ul>

      <h2 className="text-lg font-bold text-[#00343A] mb-3">Local storage</h2>
      <p className="text-sm leading-relaxed mb-8">
        Alongside cookies, Markaver stores one small value in your browser&apos;s local
        storage to remember that you have seen the cookie notice, so it is not shown on
        every visit. It contains a timestamp only, never personal data, and it never
        leaves your browser.
      </p>

      <h2 className="text-lg font-bold text-[#00343A] mb-3">Signing in with Google</h2>
      <p className="text-sm leading-relaxed mb-8">
        If you choose to sign in with Google, Google sets its own cookies on its own
        domains as part of that sign-in. Those cookies are controlled by Google under its
        own privacy policy, not by Markaver. You can avoid them entirely by signing in
        with an email address and password instead.
      </p>

      <h2 className="text-lg font-bold text-[#00343A] mb-3">Managing cookies</h2>
      <p className="text-sm leading-relaxed mb-8">
        You can clear or block cookies in your browser settings at any time. Because the
        cookies listed above are required to authenticate you, blocking them will prevent
        you from signing in to Markaver.
      </p>

      <h2 className="text-lg font-bold text-[#00343A] mb-3">Related</h2>
      <p className="text-sm leading-relaxed">
        For the third parties that process data on our behalf, see our{" "}
        <a
          href="/legal/sub-processors"
          className="text-[#33A579] font-medium underline underline-offset-2"
        >
          sub-processor list
        </a>
        . Organisation owners can export or permanently delete all of their
        organisation&apos;s data from <strong>Settings &rsaquo; Data &amp; privacy</strong>.
      </p>
    </article>
  )
}
