import { Field } from '~/components/ui'

export function PendingFileField({
  file,
  onFileChange,
  label = 'Supporting document',
  hint = 'Optional. Image or PDF for your records.',
}: {
  file: File | null
  onFileChange: (file: File | null) => void
  label?: string
  hint?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="file"
        accept="image/*,application/pdf"
        className="block w-full text-sm text-[var(--color-ink-soft)] file:mr-3 file:py-2 file:px-3 file:rounded-[10px] file:border file:border-[var(--color-border-strong)] file:bg-[var(--color-surface)] file:text-[var(--color-ink)] file:font-medium file:cursor-pointer min-h-11"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
      {file && (
        <p className="text-[12px] text-[var(--color-ink-faint)] mt-1 truncate">
          {file.name} ({Math.round(file.size / 1024)} KB)
        </p>
      )}
    </Field>
  )
}
