import { useEffect, useMemo, useState } from 'react'
import { FiX, FiSend, FiRefreshCw, FiEye, FiEyeOff } from 'react-icons/fi'
import {
  requestMasterForgotPasswordOtp,
  requestSellerForgotPasswordOtp,
  resetMasterPassword,
  resetSellerPassword
} from '../services/api'

const modeCopy = {
  current: 'Use current password',
  otp: 'Forgot password (OTP)'
}

function PasswordResetDialog({
  open,
  onClose,
  userType = 'seller',
  identifier,
  displayLabel
}) {
  const [mode, setMode] = useState('current')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSessionId, setOtpSessionId] = useState('')
  const [maskedPhone, setMaskedPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const label = useMemo(() => displayLabel || (userType === 'master' ? 'Master' : 'Seller'), [userType, displayLabel])

  useEffect(() => {
    if (!open) {
      setMode('current')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setOtp('')
      setOtpSessionId('')
      setMaskedPhone('')
      setError('')
      setSuccess('')
      setLoading(false)
      setOtpSending(false)
    }
  }, [open])

  const sendOtp = async () => {
    if (!identifier) {
      setError(`${label} identifier is missing`)
      return
    }

    setError('')
    setSuccess('')
    setOtpSending(true)
    try {
      const response =
        userType === 'master'
          ? await requestMasterForgotPasswordOtp(identifier)
          : await requestSellerForgotPasswordOtp(identifier)

      setOtpSessionId(response.otp_session_id || '')
      setMaskedPhone(response.phone_number || '')
      setMode('otp')
      setSuccess('OTP sent to your verified number')
    } catch (err) {
      setError(err.message || 'Failed to send OTP')
    } finally {
      setOtpSending(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newPassword || !confirmPassword) {
      setError('Please enter the new password and confirmation')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match')
      return
    }

    if (mode === 'current' && !currentPassword) {
      setError('Please enter your current password')
      return
    }

    if (mode === 'otp') {
      if (!otpSessionId) {
        setError('Please send OTP first')
        return
      }
      if (!otp) {
        setError('Please enter the OTP')
        return
      }
    }

    setLoading(true)
    try {
      const payload =
        userType === 'master'
          ? {
              username: identifier,
              currentPassword: mode === 'current' ? currentPassword : undefined,
              otpSessionId: mode === 'otp' ? otpSessionId : undefined,
              otp: mode === 'otp' ? otp : undefined,
              newPassword,
              confirmPassword
            }
          : {
              tradeId: identifier,
              currentPassword: mode === 'current' ? currentPassword : undefined,
              otpSessionId: mode === 'otp' ? otpSessionId : undefined,
              otp: mode === 'otp' ? otp : undefined,
              newPassword,
              confirmPassword
            }

      if (userType === 'master') {
        await resetMasterPassword(payload)
      } else {
        await resetSellerPassword(payload)
      }

      setSuccess('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setOtp('')
    } catch (err) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-[2.5rem] bg-white border border-slate-100 shadow-[0_40px_80px_-20px_rgba(15,23,42,0.2)] overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-slate-50 px-8 py-6 bg-slate-50/30">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Security Vault</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight font-outfit uppercase">{label} Access Control</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl p-3 bg-white border border-slate-100 text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-900 shadow-sm"
            aria-label="Close dialogue"
          >
            <FiX className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        <form className="space-y-6 px-10 py-8" onSubmit={handleSubmit}>
          <div className="flex gap-3 text-[11px] font-black uppercase tracking-widest text-slate-500">
            {(['current', 'otp']).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key)
                  setError('')
                  setSuccess('')
                }}
                className={`flex-1 rounded-2xl border px-4 py-4 transition-all duration-500 focus:outline-none ${
                  mode === key
                    ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'border-slate-100 bg-slate-50/50 text-slate-400 hover:border-blue-200 hover:text-blue-600'
                }`}
              >
                {modeCopy[key]}
              </button>
            ))}
          </div>

          {mode === 'current' && (
            <div className="space-y-2.5">
              <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Legacy Credentials</label>
              <div className="relative group">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-6 py-4 text-sm font-bold text-slate-800 pr-14 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 shadow-inner"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-4 inline-flex items-center text-slate-400 hover:text-blue-600 transition-colors"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                >
                  {showCurrentPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={sendOtp}
                className="text-left text-[11px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors mt-2 ml-1"
                disabled={otpSending}
              >
                {otpSending ? 'TRANSMITTING OTP...' : 'FORGOT ACCESS CODE? SEND VERIFICATION'}
              </button>
            </div>
          )}

          {mode === 'otp' && (
            <div className="space-y-6 rounded-3xl border border-blue-100 bg-blue-50/30 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1">Verification Required</p>
                  <p className="text-xs font-bold text-slate-500">
                    {maskedPhone ? `Transmitted to ${maskedPhone}` : 'Authorize via mobile verification'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={sendOtp}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[11px] font-black text-white transition-all hover:bg-slate-900 shadow-lg shadow-blue-600/10 uppercase tracking-widest"
                  disabled={otpSending}
                >
                  <FiSend className="h-3.5 w-3.5" />
                  {otpSending ? 'SENDING' : 'RETRY'}
                </button>
              </div>
              {otpSessionId && (
                <div className="space-y-2.5">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">INPUT SEQUENCE</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="w-full rounded-2xl border border-blue-200 bg-white px-6 py-4 text-base font-black tracking-[0.5em] text-center text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-200 shadow-sm"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="000000"
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2.5">
            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">New Proxy Code</label>
            <div className="relative group">
              <input
                type={showNewPassword ? 'text' : 'password'}
                className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-6 py-4 text-sm font-bold text-slate-800 pr-14 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 shadow-inner disabled:opacity-50"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Initialize new password"
                disabled={mode === 'otp' && !otpSessionId}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-4 inline-flex items-center text-slate-400 hover:text-blue-600 transition-colors"
                onClick={() => setShowNewPassword((prev) => !prev)}
              >
                {showNewPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Confirm Protocol</label>
            <input
              type="password"
              className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-6 py-4 text-sm font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 shadow-inner disabled:opacity-50"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Verify new code"
              disabled={mode === 'otp' && !otpSessionId}
            />
          </div>

          <AnimatePresence>
              {error && (
                <motion.p 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-[11px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 p-5 rounded-2xl border border-rose-100 flex items-center gap-3"
                >
                    <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                    {error}
                </motion.p>
              )}
              {success && (
                <motion.p 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-[11px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex items-center gap-3"
                >
                    <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    {success}
                </motion.p>
              )}
          </AnimatePresence>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-50 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 transition-all"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-[1.25rem] bg-slate-900 px-8 py-4 text-[11px] font-black uppercase tracking-[0.3em] text-white transition-all hover:bg-black disabled:opacity-50 shadow-xl shadow-slate-900/10 active:scale-95"
            >
              {loading && <FiRefreshCw className="h-4 w-4 animate-spin" />}
              AUTHORIZE UPDATE
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default PasswordResetDialog

