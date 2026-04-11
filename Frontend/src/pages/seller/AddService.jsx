import ServiceForm from './components/ServiceForm'

function SellerAddService() {
  return (
    <div className="min-h-screen spatial-bg selection:bg-indigo-500/30">
      <main className="mx-auto max-w-5xl px-4 pt-24 pb-12 sm:px-6 lg:px-0 relative z-10">
        <ServiceForm />
      </main>
    </div>
  )
}

export default SellerAddService
