import { useState, useEffect } from 'react'
import { FiSearch, FiRefreshCw, FiCheckCircle, FiXCircle, FiEye, FiTrash2, FiEdit2 } from 'react-icons/fi'
import { getServices, getPendingServices, acceptService, rejectService, deleteService } from '../../../services/api'
import { getImageUrl } from '../../../utils/image'

function ListServices({ refreshSignal = 0, onEditService = () => {} }) {
  const [activeView, setActiveView] = useState('approved') // 'approved' or 'pending'
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [processingId, setProcessingId] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = activeView === 'approved' ? await getServices() : await getPendingServices()
      setData(Array.isArray(res) ? res : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeView, refreshSignal])

  const handleApprove = async (id) => {
    setProcessingId(id)
    try {
      await acceptService(id)
      setData(data.filter(s => (s.id || s._id) !== id))
    } catch (err) {
      alert(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection:')
    if (reason === null) return
    setProcessingId(id)
    try {
      await rejectService(id, reason)
      setData(data.filter(s => (s.id || s._id) !== id))
    } catch (err) {
      alert(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return
    setProcessingId(id)
    try {
      await deleteService(id)
      setData(data.filter(s => (s.id || s._id) !== id))
    } catch (err) {
      alert(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const filteredData = data.filter(s => 
    s.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.seller_trade_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden font-bold">
      {/* Header & Stats */}
      <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Marketplace Services</h2>
          <p className="text-sm text-gray-500">Manage and verify service listings ({data.length})</p>
        </div>
        <div className="flex gap-2 p-1 bg-gray-50 rounded-xl w-fit self-end">
          <button 
            onClick={() => setActiveView('approved')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeView === 'approved' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-black font-bold'}`}
          >
            Approved
          </button>
          <button 
            onClick={() => setActiveView('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeView === 'pending' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-500 hover:text-black font-bold'}`}
          >
            Pending Approval
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-50 flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search service name, seller trade ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 h-10 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-black outline-none font-bold"
          />
        </div>
        <button 
          onClick={fetchData}
          className="p-2 ml-4 rounded-xl border border-gray-200 hover:bg-white text-gray-400 hover:text-black transition-all font-bold"
          title="Refresh"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <th className="px-6 py-4">Service</th>
              <th className="px-6 py-4">Seller Details</th>
              <th className="px-6 py-4">Charge</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 font-bold">
            {filteredData.map((s) => {
                const sId = s.id || s._id;
                return (
              <tr key={sId} className="hover:bg-gray-50/50 transition-colors group font-bold">
                <td className="px-6 py-4 font-bold">
                  <div className="flex items-center gap-3">
                    <img src={getImageUrl(s.thumbnail)} className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-none mb-1">{s.service_name}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{s.categories?.map(cat => typeof cat === 'string' ? cat : cat.name).join(', ') || 'General'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-bold">
                  <p className="text-xs font-bold text-gray-700">{s.seller_trade_id}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{s.seller_email}</p>
                </td>
                <td className="px-6 py-4 font-bold">
                  <p className="text-sm font-black text-gray-900 underline underline-offset-4 decoration-gray-200">₹{s.service_charge}</p>
                </td>
                <td className="px-6 py-4 font-bold">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${s.approval_status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-600'}`}>
                    {s.approval_status || 'approved'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                    {activeView === 'pending' ? (
                      <>
                        <button 
                          onClick={() => handleApprove(sId)}
                          disabled={!!processingId}
                          className="p-2 rounded-lg bg-green-500 text-white hover:shadow-lg transition-all"
                          title="Approve"
                        >
                          <FiCheckCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleReject(sId)}
                          disabled={!!processingId}
                          className="p-2 rounded-lg bg-rose-500 text-white hover:shadow-lg transition-all"
                          title="Reject"
                        >
                          <FiXCircle className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => onEditService(s)}
                          className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all"
                          title="Edit Service"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(sId)}
                          disabled={!!processingId}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
                          title="Delete Service"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {filteredData.length === 0 && !loading && (
        <div className="py-20 text-center font-bold">
          <FiSearch className="w-10 h-10 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 font-black">No services found</p>
        </div>
      )}
    </div>
  )
}

export default ListServices
