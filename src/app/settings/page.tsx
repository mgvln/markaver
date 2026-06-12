import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import InviteForm from "./InviteForm"
import RemoveMemberButton from "./RemoveMemberButton"
import SlackSection from "./SlackSection"
import GdprSection from "./GdprSection"
import ApiKeysSection from "./ApiKeysSection"
import WooCommerceSection from "./WooCommerceSection"
import ShopifySection from "./ShopifySection"

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ slack?: string }>
}) {
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const { slack } = await searchParams

  const [org, orgUsers] = await Promise.all([
    prisma.organization.findUnique({ where: { id: session.user.orgId } }),
    prisma.orgUser.findMany({
      where: { orgId: session.user.orgId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ])

  const currentRole = orgUsers.find((ou) => ou.userId === session.user.id)?.role
  const canInvite = currentRole === "OWNER" || currentRole === "MANAGER"

  return (
    <div className="flex h-screen bg-[#f9faf8]">
      <Sidebar active="settings" />

      <div className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
          <p className="text-xs text-gray-400 mb-1">Account</p>
          <h2 className="text-[#00343A] font-semibold text-xl">Settings</h2>
        </div>

        <div className="p-4 md:p-8 max-w-3xl flex flex-col gap-6">
          {/* Slack OAuth feedback banner */}
          {slack === "connected" && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700 font-medium">
              Slack connected successfully.
            </div>
          )}
          {slack === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700 font-medium">
              Slack connection failed. Please try again.
            </div>
          )}

          {/* Organisation */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-[#00343A] mb-3">Organisation</h3>
            <p className="text-sm font-medium text-gray-800">{org?.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">/{org?.slug}</p>
          </div>

          {/* Slack Integration */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-[#00343A] mb-1">Slack Integration</h3>
            <p className="text-xs text-gray-400 mb-4">
              Connect your Slack workspace to receive price alert notifications in a channel.
            </p>
            <SlackSection
              connected={!!org?.slackBotToken}
              savedChannel={org?.slackChannel ?? null}
            />
          </div>

          {/* Team */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-[#00343A]">Team</h3>
              <span className="text-xs text-gray-400">
                {orgUsers.length} member{orgUsers.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="divide-y divide-gray-50">
              {orgUsers.map((ou) => {
                const displayName = ou.user.name || ou.user.email || "Unknown"
                const initial = displayName.charAt(0).toUpperCase()
                return (
                  <div
                    key={ou.id}
                    className="px-4 md:px-6 py-3 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#33A579] flex items-center justify-center text-white text-sm font-bold">
                        {initial}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {ou.user.name || "—"}
                        </p>
                        <p className="text-xs text-gray-400">{ou.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {ou.role}
                      </span>
                      {canInvite && ou.userId !== session.user.id && (
                        <RemoveMemberButton userId={ou.userId} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {canInvite && (
              <div className="px-6 py-4 border-t border-gray-100 bg-[#f9faf8]">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  Invite Member
                </p>
                <InviteForm />
              </div>
            )}
          </div>

          {/* API Keys */}
          <ApiKeysSection />

          {/* WooCommerce Import */}
          <WooCommerceSection />

          {/* Shopify Import */}
          <ShopifySection />

          {/* GDPR */}
          <GdprSection isOwner={currentRole === "OWNER"} />
        </div>
      </div>
    </div>
  )
}
