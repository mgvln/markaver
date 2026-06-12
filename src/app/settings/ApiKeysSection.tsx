"use client"
import { useState, useEffect, useCallback } from "react"

type KeyRow = {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  createdAt: string
}

function relativeTime(iso: string | null) {
  if (!iso) return "Never"
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return "just now"
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function ApiKeysSection() {
  const [keys, setKeys] = useState<KeyRow[]>([])
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    const res = await fetch("/api/org/api-keys")
    if (res.ok) setKeys(await res.json())
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    const res = await fetch("/api/org/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (res.ok) {
      setNewKey(data.key)
      setName("")
      await fetchKeys()
    }
    setCreating(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Revoke this API key? Apps using it will stop working immediately.")) return
    setDeleting(id)
    await fetch(`/api/org/api-keys/${id}`, { method: "DELETE" })
    setKeys((ks) => ks.filter((k) => k.id !== id))
    setDeleting(null)
  }

  const handleCopy = () => {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const dismissKey = () => setNewKey(null)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-[#00343A] mb-1">API Keys</h3>
      <p className="text-xs text-gray-400 mb-5">
        Use API keys to access your pricing data from external systems.
        Base URL: <span className="font-mono text-gray-600">https://markaver.com/api/v1</span>
      </p>

      {/* New key reveal */}
      {newKey && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-700 mb-2">
            Copy your API key now — it will not be shown again.
          </p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 text-xs bg-white border border-amber-200 rounded-lg px-3 py-2 font-mono text-gray-800 break-all">
              {newKey}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 text-xs border border-amber-300 text-amber-700 px-3 py-2 rounded-lg hover:bg-amber-100"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button onClick={dismissKey} className="mt-2 text-xs text-amber-500 hover:text-amber-700">
            I&apos;ve saved it — dismiss
          </button>
        </div>
      )}

      {/* Existing keys */}
      {keys.length > 0 && (
        <div className="mb-5 border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f9faf8] border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Key</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Last used</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-gray-50 last:border-b-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{k.keyPrefix}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{relativeTime(k.lastUsedAt)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(k.createdAt).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(k.id)}
                      disabled={deleting === k.id}
                      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name, e.g. Shopify integration"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#33A579]"
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="shrink-0 bg-[#00343A] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#004f58] disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create key"}
        </button>
      </form>

      <div className="mt-4 bg-[#f9faf8] rounded-lg px-4 py-3 text-xs text-gray-500">
        <p className="font-semibold text-gray-700 mb-1">Usage</p>
        <code className="block text-gray-600">GET /api/v1/products</code>
        <code className="block text-gray-600">GET /api/v1/products/:id</code>
        <code className="block text-gray-600">GET /api/v1/products/:id/recommendation</code>
        <p className="mt-2 text-gray-400">Pass key as: <code className="text-gray-600">Authorization: Bearer mk_...</code></p>
      </div>
    </div>
  )
}
