import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import EditProductForm from "./EditProductForm"

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.orgId) redirect("/login")

  const product = await prisma.product.findFirst({
    where: { id, orgId: session.user.orgId },
  })

  if (!product) notFound()

  return (
    <div className="flex h-screen bg-[#f9faf8]">
      <Sidebar active="products" />

      <div className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
          <p className="text-xs text-gray-400 mb-1">Products › {product.name} › Edit</p>
          <h2 className="text-[#00343A] font-semibold text-xl">Edit Product</h2>
        </div>

        <div className="p-4 md:p-8 max-w-2xl">
          <EditProductForm
            productId={product.id}
            initialData={{
              name: product.name,
              sku: product.sku,
              productType: product.productType,
              costPrice: product.costPrice,
              minMarkup: product.minMarkup,
              servingsPerPack: product.servingsPerPack,
              capsulesPerServing: product.capsulesPerServing,
              capsuleSizeGrams: product.capsuleSizeGrams,
              gramsPerServing: product.gramsPerServing,
              scrapeInterval: product.scrapeInterval,
              positionRule: product.positionRule,
              adjustment: product.adjustment,
              currency: product.currency,
            }}
          />
        </div>
      </div>
    </div>
  )
}
