import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import ProductForm from "./ProductForm"

export default async function NewProductPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="flex h-screen bg-[#f9faf8]">
      <Sidebar active="products" />
      <div className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <p className="text-xs text-gray-400 mb-1">Products › New</p>
          <h2 className="text-[#00343A] font-semibold text-xl">Add Product</h2>
        </div>
        <div className="p-8 max-w-2xl">
          <ProductForm />
        </div>
      </div>
    </div>
  )
}
