import type { ServiceProduct } from '~/db/schema'
import {
  Button,
  Field,
  Icon,
  Input,
  Money,
  Select,
} from '~/components/ui'
import { parseDollarsToCents, parseQuantityToMicro } from '~/lib/money'

export type InvoiceLineDraft = {
  clientId: string
  serviceProductId: string | null
  description: string
  quantity: string
  unitPrice: string
}

export function createInvoiceLineDraft(
  patch: Partial<Omit<InvoiceLineDraft, 'clientId'>> = {},
): InvoiceLineDraft {
  return {
    clientId: crypto.randomUUID(),
    serviceProductId: null,
    description: '',
    quantity: '1',
    unitPrice: '',
    ...patch,
  }
}

function lineAmountCents(l: InvoiceLineDraft): number {
  try {
    const q = parseQuantityToMicro(l.quantity || '0')
    const p = parseDollarsToCents(l.unitPrice || '0')
    return Math.round((q * p) / 1_000_000)
  } catch {
    return 0
  }
}

export function InvoiceLineEditor({
  lines,
  services,
  onChange,
  onAdd,
  onRemove,
  subtotalCents,
}: {
  lines: InvoiceLineDraft[]
  services: ServiceProduct[]
  onChange: (index: number, patch: Partial<InvoiceLineDraft>) => void
  onAdd: () => void
  onRemove: (index: number) => void
  subtotalCents: number
}) {
  const activeServices = services.filter((s) => s.active)

  function pickService(i: number, svcId: string) {
    if (!svcId) {
      onChange(i, { serviceProductId: null })
      return
    }
    const svc = services.find((s) => s.id === svcId)
    if (!svc) return
    onChange(i, {
      serviceProductId: svc.id,
      description: lines[i]?.description || svc.name,
      unitPrice: (svc.rateCents / 100).toFixed(2),
    })
  }

  return (
  <>
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-3">
        <h3 className="text-[14px] font-semibold tracking-tight">Line items</h3>
        <Button intent="ghost" size="sm" type="button" onClick={onAdd} className="shrink-0">
          <Icon d="M12 4v16M4 12h16" size={14} /> Add line
        </Button>
      </div>

      {/* Compact: stacked cards */}
      <div className="md:hidden divide-y divide-[var(--color-border)]">
        {lines.map((l, i) => {
          const amount = lineAmountCents(l)
          return (
            <div key={l.clientId} className="p-4 space-y-4 bg-[var(--color-surface)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium uppercase tracking-wider text-[var(--color-ink-faint)]">
                  Line {i + 1}
                </span>
                {lines.length > 1 && (
                  <button
                    type="button"
                    className="text-[var(--color-ink-faint)] hover:text-[var(--color-negative)] p-2 min-h-11 min-w-11 flex items-center justify-center rounded-[8px]"
                    onClick={() => onRemove(i)}
                    aria-label={`Remove line ${i + 1}`}
                  >
                    <Icon d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" size={16} />
                  </button>
                )}
              </div>

              <Field label="Service" htmlFor={`line-svc-${i}`}>
                <Select
                  id={`line-svc-${i}`}
                  value={l.serviceProductId ?? ''}
                  onChange={(e) => pickService(i, e.target.value)}
                >
                  <option value="">— Custom —</option>
                  {activeServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Description" htmlFor={`line-desc-${i}`} required>
                <Input
                  id={`line-desc-${i}`}
                  value={l.description}
                  onChange={(e) => onChange(i, { description: e.target.value })}
                  placeholder="What you did"
                  required
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Quantity" htmlFor={`line-qty-${i}`} required>
                  <Input
                    id={`line-qty-${i}`}
                    inputMode="decimal"
                    className="tabular"
                    value={l.quantity}
                    onChange={(e) => onChange(i, { quantity: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Rate" htmlFor={`line-rate-${i}`} required>
                  <Input
                    id={`line-rate-${i}`}
                    inputMode="decimal"
                    className="tabular"
                    value={l.unitPrice}
                    onChange={(e) => onChange(i, { unitPrice: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </Field>
              </div>

              <div className="flex items-center justify-between rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5">
                <span className="text-[13px] text-[var(--color-ink-soft)]">Line amount</span>
                <Money cents={amount} className="text-[16px] font-semibold" />
              </div>
            </div>
          )
        })}
        <div className="px-4 py-3 flex items-center justify-between bg-[var(--color-surface-2)]/60">
          <span className="text-[12px] uppercase tracking-wider text-[var(--color-ink-faint)] font-medium">
            Subtotal
          </span>
          <Money cents={subtotalCents} className="text-[17px] font-semibold" />
        </div>
      </div>

      {/* Comfortable+: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="text-[11px] uppercase tracking-wider text-[var(--color-ink-faint)]">
            <tr className="text-left bg-[var(--color-surface-2)] border-b border-[var(--color-border)]">
              <th className="px-4 py-2 font-medium w-[26%]">Service</th>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 font-medium w-[110px] text-right">Qty</th>
              <th className="px-4 py-2 font-medium w-[140px] text-right">Rate</th>
              <th className="px-4 py-2 font-medium w-[140px] text-right">Amount</th>
              <th className="px-2 py-2 w-[40px]" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const amount = lineAmountCents(l)
              return (
                <tr key={l.clientId} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-2 align-top min-w-[140px]">
                    <Select
                      value={l.serviceProductId ?? ''}
                      onChange={(e) => pickService(i, e.target.value)}
                    >
                      <option value="">— Custom —</option>
                      {activeServices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-4 py-2 align-top min-w-[160px]">
                    <Input
                      value={l.description}
                      onChange={(e) => onChange(i, { description: e.target.value })}
                      placeholder="What you did"
                      required
                    />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <Input
                      inputMode="decimal"
                      className="text-right tabular"
                      value={l.quantity}
                      onChange={(e) => onChange(i, { quantity: e.target.value })}
                      required
                    />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <Input
                      inputMode="decimal"
                      className="text-right tabular"
                      value={l.unitPrice}
                      onChange={(e) => onChange(i, { unitPrice: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </td>
                  <td className="px-4 py-2 align-top text-right tabular text-[var(--color-ink)] font-medium">
                    <Money cents={amount} />
                  </td>
                  <td className="px-2 py-2 align-top">
                    {lines.length > 1 && (
                      <button
                        type="button"
                        className="text-[var(--color-ink-faint)] hover:text-[var(--color-negative)] p-2 min-h-10 min-w-10 flex items-center justify-center"
                        onClick={() => onRemove(i)}
                        aria-label="Remove line"
                      >
                        <Icon d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--color-border-strong)] bg-[var(--color-surface-2)]/40">
              <td
                colSpan={4}
                className="px-4 py-3 text-right text-[var(--color-ink-soft)] uppercase tracking-wider text-[11px] font-medium"
              >
                Subtotal
              </td>
              <td className="px-4 py-3 text-right text-[16px] font-semibold tabular">
                <Money cents={subtotalCents} />
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  )
}
