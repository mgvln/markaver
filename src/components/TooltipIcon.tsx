"use client"

interface Props {
  text: string
}

export function TooltipIcon({ text }: Props) {
  return (
    <span className="relative inline-block group align-middle ml-1">
      <span className="text-gray-400 cursor-help text-xs select-none">❓</span>
      <span
        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-normal leading-relaxed shadow-lg"
        role="tooltip"
      >
        {text}
        {/* arrow */}
        <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  )
}
