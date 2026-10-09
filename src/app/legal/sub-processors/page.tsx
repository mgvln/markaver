import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sub-processors — Markaver",
  description: "Third parties that process data on Markaver's behalf.",
}

const LAST_UPDATED = "9 October 2026"

type Sub = {
  name: string
  purpose: string
  data: string
  location: string
  always: boolean
}

const SUBPROCESSORS: Sub[] = [
  {
    name: "Neon",
    purpose: "Managed PostgreSQL database — the application's primary data store",
    data: "Account details (name, email, hashed password), organisation and role data, products, competitor URLs and price history",
    location: "United States (AWS us-east-1)",
    always: true,
  },
  {
    name: "HostingSecure",
    purpose: "Application hosting — runs the Markaver web application",
    data: "All data in transit through the application; server access logs",
    location: "To be confirmed with the provider",
    always: true,
  },
  {
    name: "Resend",
    purpose: "Transactional email delivery — price alerts, team invitations, password resets",
    data: "Recipient email address and message content",
    location: "United States",
    always: true,
  },
  {
    name: "Apify",
    purpose: "Automated retrieval of publicly listed competitor prices",
    data: "Competitor product URLs only. No customer personal data is sent.",
    location: "European Union (Czechia), with proxy egress in multiple regions",
    always: true,
  },
  {
    name: "Frankfurter",
    purpose: "Foreign exchange reference rates for multi-currency pricing",
    data: "Currency codes only. No personal data is sent.",
    location: "European Union",
    always: true,
  },
  {
    name: "Slack",
    purpose: "Delivery of price alerts into your own Slack workspace",
    data: "Product name and pricing figures posted to the channel you choose",
    location: "United States",
    always: false,
  },
  {
    name: "Google",
    purpose: "Optional single sign-on",
    data: "Email address, name and Google account identifier",
    location: "United States",
    always: false,
  },
]

export default function SubProcessorsPage() {
  return (
    <article className="text-gray-700">
      <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Legal</p>
      <h1 className="text-3xl font-bold text-[#00343A] mb-2">Sub-processors</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated {LAST_UPDATED}</p>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
        <p className="text-sm text-amber-900">
          <strong>Draft.</strong> One entry below is still awaiting confirmation from the
          provider and the hosting region has not yet been verified. Confirm these before
          relying on this page contractually.
        </p>
      </div>

      <p className="text-sm leading-relaxed mb-8">
        Markaver uses the third parties listed below to provide the service. Each one
        processes data only on our instructions and only for the purpose described. We
        update this page before adding a new sub-processor that handles personal data.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#f9faf8] text-left">
              <th className="px-4 py-3 font-semibold text-[#00343A]">Sub-processor</th>
              <th className="px-4 py-3 font-semibold text-[#00343A]">Purpose</th>
              <th className="px-4 py-3 font-semibold text-[#00343A]">Data processed</th>
              <th className="px-4 py-3 font-semibold text-[#00343A]">Location</th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map((s) => (
              <tr key={s.name} className="border-t border-gray-100 align-top">
                <td className="px-4 py-3">
                  <span className="font-semibold text-[#00343A]">{s.name}</span>
                  {!s.always && (
                    <span className="block mt-1 text-[10px] uppercase tracking-wide text-gray-400">
                      Only if enabled
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{s.purpose}</td>
                <td className="px-4 py-3 text-gray-600">{s.data}</td>
                <td className="px-4 py-3 text-gray-600">{s.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-bold text-[#00343A] mb-3">International transfers</h2>
      <p className="text-sm leading-relaxed mb-8">
        Several sub-processors above store or process data in the United States,
        including the database holding account and pricing data. Where personal data of
        individuals in the EU or UK is transferred outside those regions, that transfer
        needs an appropriate safeguard &mdash; typically Standard Contractual Clauses or
        the EU&ndash;US Data Privacy Framework. Confirm the mechanism in place with each
        provider before publishing this page to customers.
      </p>

      <h2 className="text-lg font-bold text-[#00343A] mb-3">Optional sub-processors</h2>
      <p className="text-sm leading-relaxed mb-8">
        Entries marked <em>only if enabled</em> are not used unless your organisation
        turns on that integration. If you never connect Slack and never sign in with
        Google, no data reaches either of them.
      </p>

      <h2 className="text-lg font-bold text-[#00343A] mb-3">Your data</h2>
      <p className="text-sm leading-relaxed">
        Organisation owners can export a complete copy of their organisation&apos;s data,
        or permanently delete the organisation and everything in it, from{" "}
        <strong>Settings &rsaquo; Data &amp; privacy</strong>. See also our{" "}
        <a
          href="/legal/cookies"
          className="text-[#33A579] font-medium underline underline-offset-2"
        >
          cookie policy
        </a>
        .
      </p>
    </article>
  )
}
