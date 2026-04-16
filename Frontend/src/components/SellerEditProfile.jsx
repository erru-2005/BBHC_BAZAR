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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4 no-scrollbar overflow-y-auto pt-10 pb-10">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-[3rem] bg-white border border-slate-100 shadow-[0_40px_100px_-20px_rgba(15,23,42,0.25)] overflow-hidden relative"
      >
        {/* Top Header / Banner */}
        <div className="relative h-40 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-indigo-500/5 to-transparent" />
            <div className="absolute top-8 left-8 right-8 flex items-center justify-between z-20">
                <button 
                  onClick={onClose} 
                  className="rounded-2xl p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-50 shadow-sm"
                >
                    <FiX className="h-5 w-5" strokeWidth={2.5} />
                </button>
                <h3 className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em]">Identity Protocol</h3>
                <div className="w-10" />
            </div>
            {/* Branding Avatar */}
            <div className="absolute -bottom-12 z-10 transition-transform hover:scale-105 duration-500">
                <div className="w-28 h-28 rounded-[2.5rem] bg-white border-[8px] border-white flex items-center justify-center text-slate-800 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-blue-600 opacity-0" />
                    {user?.image_url || user?.image ? (
                        <img 
                          src={fixImageUrl(user.image_url || user.image)} 
                          alt="Branding" 
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                        />
                    ) : (
                        <FiUser className="w-12 h-12 text-slate-100" />
                    )}
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <FiCamera className="w-7 h-7 text-white" />
                    </div>
                </div>
            </div>
        </div>

        <div className="pt-16 px-10 pb-12">
            <form className="space-y-7" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2.5">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Given Name</label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-6 py-4 text-sm font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 shadow-inner"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Surname</label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-6 py-4 text-sm font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 shadow-inner"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Channel Communication</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <FiMail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 pl-14 pr-6 py-4 text-sm font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 shadow-inner"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@nexus.com"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Secure Contact</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <FiPhone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 pl-14 pr-6 py-4 text-sm font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 shadow-inner"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 000 000 0000"
                  />
                </div>
              </div>

              <div className="pt-4">
                  <AnimatePresence>
                    {error && (
                        <motion.p 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="text-xs font-bold text-rose-600 bg-rose-50 p-5 rounded-2xl border border-rose-100 mb-6 flex items-center gap-3"
                        >
                            <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                            {error}
                        </motion.p>
                    )}
                    {success && (
                        <motion.p 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="text-xs font-bold text-emerald-600 bg-emerald-50 p-5 rounded-2xl border border-emerald-100 mb-6 flex items-center gap-3"
                        >
                            <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                            {success}
                        </motion.p>
                    )}
                  </AnimatePresence>

                  <div className="flex flex-col gap-4 mt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 rounded-[1.25rem] bg-slate-900 py-5 text-xs font-black tracking-[0.2em] text-white transition-all hover:bg-black disabled:opacity-50 shadow-xl shadow-slate-900/10 active:scale-95 uppercase"
                    >
                      {loading ? <FiRefreshCw className="h-5 w-5 animate-spin" /> : <FiSave className="h-5 w-5" />}
                      COMMIT CHANGES
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-800 transition-colors"
                    >
                      ABORT EDIT
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
