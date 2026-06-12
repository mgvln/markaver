"use client"
import { useState } from "react"

type OrgMembership = {
  orgId: string
  orgName: string
  role: string
}

type UserRow = {
  id: string
  email: string
  name: string | null
  isSuperAdmin: boolean
  memberships: OrgMembership[]
}

const ROLES = ["OWNER", "MANAGER", "ANALYST", "VIEWER"] as const

export default function AdminUsersTable({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [busy, setBusy] = useState<string | null>(null)

  const patch = async (userId: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return res.ok
  }

  const toggleSuperAdmin = async (user: UserRow) => {
    setBusy(user.id + ":sa")
    const ok = await patch(user.id, { isSuperAdmin: !user.isSuperAdmin })
    if (ok) {
      setUsers((us) =>
        us.map((u) => u.id === user.id ? { ...u, isSuperAdmin: !u.isSuperAdmin } : u)
      )
    }
    setBusy(null)
  }

  const changeRole = async (userId: string, orgId: string, role: string) => {
    setBusy(userId + ":" + orgId)
    const ok = await patch(userId, { orgId, role })
    if (ok) {
      setUsers((us) =>
        us.map((u) =>
          u.id === userId
            ? {
                ...u,
                memberships: u.memberships.map((m) =>
                  m.orgId === orgId ? { ...m, role } : m
                ),
              }
            : u
        )
      )
    }
    setBusy(null)
  }

  const removeFromOrg = async (userId: string, orgId: string) => {
    if (!confirm("Remove this user from the org?")) return
    setBusy(userId + ":" + orgId + ":rm")
    const ok = await patch(userId, { removeFromOrg: orgId })
    if (ok) {
      setUsers((us) =>
        us.map((u) =>
          u.id === userId
            ? { ...u, memberships: u.memberships.filter((m) => m.orgId !== orgId) }
            : u
        )
      )
    }
    setBusy(null)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-[#00343A]">All Users</h3>
        <span className="text-xs text-gray-400">{users.length} user{users.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f9faf8] border-b border-gray-200">
              {["User", "Org / Role", "Super Admin", ""].map((h) => (
                <th key={h} className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 align-top">
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900">{user.name ?? "—"}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </td>
                <td className="px-6 py-4">
                  {user.memberships.length === 0 ? (
                    <span className="text-xs text-gray-300">No org</span>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {user.memberships.map((m) => (
                        <div key={m.orgId} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 min-w-[120px] truncate">{m.orgName}</span>
                          <select
                            value={m.role}
                            disabled={busy === user.id + ":" + m.orgId}
                            onChange={(e) => changeRole(user.id, m.orgId, e.target.value)}
                            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#33A579] disabled:opacity-50"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => removeFromOrg(user.id, m.orgId)}
                            disabled={!!busy}
                            className="text-xs text-red-300 hover:text-red-500 disabled:opacity-50"
                            title="Remove from org"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleSuperAdmin(user)}
                    disabled={busy === user.id + ":sa"}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                      user.isSuperAdmin ? "bg-[#33A579]" : "bg-gray-200"
                    }`}
                    title={user.isSuperAdmin ? "Revoke super admin" : "Grant super admin"}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        user.isSuperAdmin ? "translate-x-4" : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  {user.isSuperAdmin && (
                    <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-1 rounded-full">
                      Admin
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
