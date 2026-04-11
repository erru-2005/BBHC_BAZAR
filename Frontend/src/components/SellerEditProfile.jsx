import { useEffect, useState } from 'react'
import { FiX, FiUser, FiMail, FiPhone, FiRefreshCw, FiSave, FiCamera } from 'react-icons/fi'
import { updateSeller } from '../services/api'
import { useDispatch } from 'react-redux'
import { updateUserInfo } from '../store/authSlice'
import { motion, AnimatePresence } from 'framer-motion'
import { fixImageUrl } from '../utils/image'

function SellerEditProfile({ open, onClose, user }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const dispatch = useDispatch()

  useEffect(() => {
    if (open && user) {
      setFirstName(user.first_name || '')
      setLastName(user.last_name || '')
      setEmail(user.email || '')
      setPhone(user.phone_number || '')
      setError('')
      setSuccess('')
    }
  }, [open, user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!firstName || !email) {
      setError('First name and email are required')
      return
    }

    setLoading(true)
    try {
      const updateData = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone_number: phone
      }

      await updateSeller(user.id || user._id, updateData)
      
      dispatch(updateUserInfo({
        ...user,
        ...updateData
      }))

      setSuccess('Profile updated successfully')
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md px-4 no-scrollbar overflow-y-auto pt-10 pb-10">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-3xl sm:rounded-[2.5rem] bg-[#0f1218] border border-white/5 shadow-2xl overflow-hidden relative"
      >
        {/* Top Header / Banner */}
        <div className="relative h-32 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FF2E63]/20 to-indigo-500/10" />
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
                <button onClick={onClose} className="rounded-full p-2 text-white/40 hover:text-white transition hover:bg-white/10">
                    <FiX className="h-5 w-5" />
                </button>
                <h3 className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Edit Profile</h3>
                <div className="w-9" />
            </div>
            {/* Branding Avatar */}
            <div className="absolute -bottom-10 z-10 transition-transform hover:scale-105 duration-300">
                <div className="w-24 h-24 rounded-[32px] bg-[#1a1f2e] border-[6px] border-[#0f1218] flex items-center justify-center text-white shadow-2xl relative overflow-hidden group">
                    {user?.image_url || user?.image ? (
                        <img 
                          src={fixImageUrl(user.image_url || user.image)} 
                          alt="Branding" 
                          className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://ui-avatars.com/api/?name=" + (user?.trade_id || "S") + "&background=FF2E63&color=fff";
                          }}
                        />
                    ) : (
                        <FiUser className="w-10 h-10 text-[#FF2E63]" />
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <FiCamera className="w-6 h-6 text-white" />
                    </div>
                </div>
            </div>
        </div>

        <div className="pt-14 px-8 pb-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">First Name</label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-white/5 bg-[#1a1f2e] px-5 py-3.5 text-sm text-white focus:border-[#FF2E63] focus:outline-none focus:ring-1 focus:ring-[#FF2E63] transition-all placeholder:text-slate-600"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Last Name</label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-white/5 bg-[#1a1f2e] px-5 py-3.5 text-sm text-white focus:border-[#FF2E63] focus:outline-none focus:ring-1 focus:ring-[#FF2E63] transition-all placeholder:text-slate-600"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-500">
                    <FiMail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    className="w-full rounded-2xl border border-white/5 bg-[#1a1f2e] pl-10 sm:pl-12 pr-5 py-3.5 text-sm text-white focus:border-[#FF2E63] focus:outline-none focus:ring-1 focus:ring-[#FF2E63] transition-all placeholder:text-slate-600"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-500">
                    <FiPhone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    className="w-full rounded-2xl border border-white/5 bg-[#1a1f2e] pl-12 pr-5 py-3.5 text-sm text-white focus:border-[#FF2E63] focus:outline-none focus:ring-1 focus:ring-[#FF2E63] transition-all placeholder:text-slate-600"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="pt-2">
                  <AnimatePresence>
                    {error && (
                        <motion.p 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="text-xs font-bold text-rose-500 bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20 mb-4"
                        >
                            {error}
                        </motion.p>
                    )}
                    {success && (
                        <motion.p 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="text-xs font-bold text-emerald-400 bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 mb-4"
                        >
                            {success}
                        </motion.p>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#FF2E63] py-4 text-sm font-bold tracking-tight text-white transition hover:bg-rose-600 disabled:opacity-50 shadow-xl shadow-rose-500/20"
                    >
                      {loading ? <FiRefreshCw className="h-5 w-5 animate-spin" /> : <FiSave className="h-5 w-5" />}
                      Update Profile
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel Changes
                    </button>
                  </div>
              </div>
            </form>
        </div>
      </motion.div>
    </div>
  )
}

export default SellerEditProfile
