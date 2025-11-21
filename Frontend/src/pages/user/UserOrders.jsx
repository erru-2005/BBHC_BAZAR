import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { FaArrowLeft, FaBox } from 'react-icons/fa6'

function UserOrders() {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#131921] via-[#1a2332] to-[#131921] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6 text-white">
        <button
          onClick={() => navigate('/user/profile')}
          className="inline-flex items-center gap-2 text-white/70 hover:text-white transition"
        >
          <FaArrowLeft />
          Back to Profile
        </button>

        <div className="bg-white/10 border border-white/15 rounded-3xl p-8 backdrop-blur-lg shadow-2xl">
          <div className="text-center">
            <FaBox className="w-16 h-16 text-amber-400 mx-auto" />
            <h1 className="text-3xl font-bold mt-4">Your Orders</h1>
            <p className="text-white/70 mt-2">
              Hi {user?.first_name || 'there'}, you haven't placed any orders yet.
            </p>
          </div>

          <div className="mt-8 bg-white/5 rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/80">
              Once you place an order, it will appear here with real-time tracking and updates.
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 px-6 py-3 rounded-2xl bg-amber-400/90 text-black font-semibold hover:bg-amber-300 transition"
            >
              Start Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserOrders

