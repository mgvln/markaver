import Link from "next/link"

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f9faf8]">
      <header className="bg-[#00343A] px-6 py-5">
        <Link href="/" className="inline-block">
          <p className="text-white font-bold text-lg leading-none">Markaver</p>
          <p className="text-[#33A579] text-xs mt-1">Pricing Intelligence</p>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">{children}</main>

      <footer className="max-w-3xl mx-auto px-6 pb-12">
        <div className="border-t border-gray-200 pt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
          <Link href="/legal/cookies" className="hover:text-[#00343A]">
            Cookie policy
          </Link>
          <Link href="/legal/sub-processors" className="hover:text-[#00343A]">
            Sub-processors
          </Link>
          <Link href="/" className="hover:text-[#00343A]">
            Back to Markaver
          </Link>
        </div>
      </footer>
    </div>
  )
}
