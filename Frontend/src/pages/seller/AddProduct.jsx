import SellerProductForm from './components/ProductForm'

function SellerAddProduct() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EAF3FF] via-white to-[#F4ECFF] text-slate-900 py-10">
      <div className="mx-auto max-w-4xl px-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add Product</h1>
          <p className="text-sm text-gray-500">Create a new listing for your store.</p>
        </div>
        <SellerProductForm />
      </div>
    </div>
  )
}

export default SellerAddProduct

