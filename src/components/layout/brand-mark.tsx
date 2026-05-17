export function BrandMark({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 ${compact ? 'px-3 h-14' : 'px-5 h-[60px]'} border-b border-[var(--color-border)]`}
    >
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-[8px] bg-[var(--color-brand)] text-white shrink-0">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 5h11a3 3 0 0 1 3 3v11" />
          <path d="M4 5v13a2 2 0 0 0 2 2h12" />
          <path d="M8 9h6M8 13h4" />
        </svg>
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight truncate">
          simple-books
        </span>
      )}
    </div>
  )
}
