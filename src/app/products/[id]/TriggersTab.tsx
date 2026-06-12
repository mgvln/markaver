"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { TooltipIcon } from "@/components/TooltipIcon"

const AMP_TOOLTIP = "Average Market Price — the mean price of all tracked competitors for this product"
const SRP_TOOLTIP = "Suggested Retail Price — your recommended selling price based on the market average and your position rule"

export type TriggerRow = {
  id: string
  name: string
  condition: string
  threshold: number | null
  action: string
  actionConfig: Record<string, string>
  isActive: boolean
  lastFiredAt: string | null
}

const CONDITION_LABELS: Record<string, string> = {
  amp_drops_by: "AMP drops by X%",
  srp_changes: "SRP changes",
  competitor_price_changes: "Competitor price changes by X%",
  markup_below: "Markup falls below X×",
}

function conditionLabel(key: string): React.ReactNode {
  const label = CONDITION_LABELS[key] ?? key
  if (key === "amp_drops_by") {
    return <><span>AMP</span><TooltipIcon text={AMP_TOOLTIP} /><span>{" drops by X%"}</span></>
  }
  if (key === "srp_changes") {
    return <><span>SRP</span><TooltipIcon text={SRP_TOOLTIP} /><span>{" changes"}</span></>
  }
  return <>{label}</>
}

const NEEDS_THRESHOLD = ["amp_drops_by", "competitor_price_changes", "markup_below"]

function relativeTime(iso: string | null): string {
  if (!iso) return "Never"
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return "Just now"
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

interface Props {
  productId: string
  initialTriggers: TriggerRow[]
}

const BLANK_FORM = { name: "", condition: "amp_drops_by", threshold: "5", action: "email", email: "", webhookUrl: "" }

export default function TriggersTab({ productId, initialTriggers }: Props) {
  const router = useRouter()
  const [triggers, setTriggers] = useState<TriggerRow[]>(initialTriggers)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const [form, setForm] = useState(BLANK_FORM)

  const update = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  const openEdit = (t: TriggerRow) => {
    setForm({
      name: t.name,
      condition: t.condition,
      threshold: t.threshold != null ? String(t.threshold) : "5",
      action: t.action,
      email: t.actionConfig.email ?? "",
      webhookUrl: t.actionConfig.webhookUrl ?? "",
    })
    setEditingId(t.id)
    setShowForm(true)
    setFormError("")
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(BLANK_FORM)
    setFormError("")
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError("")

    const actionConfig =
      form.action === "email"
        ? { email: form.email }
        : form.action === "webhook"
        ? { webhookUrl: form.webhookUrl }
        : {}

    const payload = {
      name: form.name,
      condition: form.condition,
      threshold: NEEDS_THRESHOLD.includes(form.condition) ? form.threshold : null,
      action: form.action,
      actionConfig,
    }

    const res = editingId
      ? await fetch(`/api/triggers/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch(`/api/products/${productId}/triggers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

    const data = await res.json()
    if (!res.ok) {
      setFormError(data.error || "Failed to save trigger")
      setSaving(false)
      return
    }

    if (editingId) {
      setTriggers((ts) => ts.map((t) => (t.id === editingId ? { ...t, ...data } : t)))
    } else {
      setTriggers((ts) => [data, ...ts])
    }
    closeForm()
    setSaving(false)
    router.refresh()
  }

  const toggleActive = async (trigger: TriggerRow) => {
    const res = await fetch(`/api/triggers/${trigger.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !trigger.isActive }),
    })
    if (res.ok) {
      setTriggers((ts) =>
        ts.map((t) => (t.id === trigger.id ? { ...t, isActive: !t.isActive } : t))
      )
    }
  }

  const deleteTrigger = async (id: string) => {
    if (!confirm("Delete this trigger?")) return
    const res = await fetch(`/api/triggers/${id}`, { method: "DELETE" })
    if (res.ok) setTriggers((ts) => ts.filter((t) => t.id !== id))
  }

  return (
    <div className="p-8">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-[#00343A]">
            Triggers{" "}
            <span className="text-gray-400 font-normal">({triggers.length})</span>
          </h3>
          <button
            onClick={() => { closeForm(); setShowForm((v) => !v) }}
            className="bg-[#00343A] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#004f58]"
          >
            + Add Trigger
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleAdd} className="px-6 py-5 border-b border-gray-100 bg-[#f9faf8]">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">{editingId ? "Edit Trigger" : "New Trigger"}</p>
            {formError && (
              <p className="text-xs text-red-600 mb-3">{formError}</p>
            )}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={update("name")}
                  placeholder="e.g. Alert when AMP drops"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Condition</label>
                <select
                  value={form.condition}
                  onChange={update("condition")}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
                >
                  {Object.entries(CONDITION_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              {NEEDS_THRESHOLD.includes(form.condition) && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Threshold {form.condition === "markup_below" ? "(×)" : "(%)"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.threshold}
                    onChange={update("threshold")}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
                <select
                  value={form.action}
                  onChange={update("action")}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
                >
                  <option value="email">Email</option>
                  <option value="webhook">Webhook</option>
                  <option value="slack">Slack</option>
                </select>
              </div>

              {form.action === "email" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    placeholder="you@company.com"
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
                  />
                </div>
              )}

              {form.action === "webhook" && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Webhook URL</label>
                  <input
                    type="url"
                    value={form.webhookUrl}
                    onChange={update("webhookUrl")}
                    placeholder="https://..."
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
                  />
                </div>
              )}

              {form.action === "slack" && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    Alerts will be sent to the Slack channel configured in Settings. Make sure Slack is connected for your organisation.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 text-sm bg-[#00343A] text-white rounded-lg hover:bg-[#004f58] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Trigger"}
              </button>
            </div>
          </form>
        )}

        {/* Trigger list */}
        {triggers.length === 0 && !showForm ? (
          <div className="px-6 py-10 text-center">
            <p className="text-gray-500 text-sm">No triggers yet.</p>
            <p className="text-gray-400 text-xs mt-1">Add one to get alerted when prices change.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {triggers.map((t) => (
              <div key={t.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {CONDITION_LABELS[t.condition] ?? t.condition}
                    {t.threshold != null && NEEDS_THRESHOLD.includes(t.condition) && ` · ${t.threshold}${t.condition === "markup_below" ? "×" : "%"}`}
                    {" · "}
                    <span className="capitalize">{t.action}</span>
                    {" · "}Last fired: {relativeTime(t.lastFiredAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => openEdit(t)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Edit
                  </button>
                  {/* Active toggle */}
                  <button
                    onClick={() => toggleActive(t)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      t.isActive ? "bg-[#33A579]" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        t.isActive ? "translate-x-4" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => deleteTrigger(t.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
