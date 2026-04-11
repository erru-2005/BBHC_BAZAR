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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000000]/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-3xl bg-[#0f1218] border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Reset password</p>
            <h3 className="text-xl font-bold text-white tracking-tight">{label} Account</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close reset password dialog"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-5 px-6 py-6" onSubmit={handleSubmit}>
          <div className="flex gap-2 text-xs font-bold text-slate-300">
            {(['current', 'otp']).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key)
                  setError('')
                  setSuccess('')
                }}
                className={`flex-1 rounded-xl border px-3 py-2.5 transition-all outline-none ${
                  mode === key
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/50'
                    : 'border-white/10 bg-[#1a1f2e] text-slate-400 hover:border-white/30 hover:text-slate-200'
                }`}
              >
                {modeCopy[key]}
              </button>
            ))}
          </div>

          {mode === 'current' && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="w-full rounded-xl border border-white/10 bg-[#1a1f2e] px-4 py-3 text-sm text-white pr-10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors placeholder:text-slate-500"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  className="absolute inset-y-0 right-3 inline-flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                >
                  {showCurrentPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={sendOtp}
                className="text-left text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors mt-1 inline-block"
                disabled={otpSending}
              >
                {otpSending ? 'Sending OTP…' : 'Forgot password? Send OTP to verified number'}
              </button>
            </div>
          )}

          {mode === 'otp' && (
            <div className="space-y-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white mb-0.5">OTP Verification</p>
                  <p className="text-xs text-slate-400">
                    {maskedPhone ? `Sent to ${maskedPhone}` : 'Send OTP to your verified number'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={sendOtp}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-400 transition hover:bg-indigo-500 hover:text-white"
                  disabled={otpSending}
                >
                  <FiSend className="h-3.5 w-3.5" />
                  {otpSending ? 'Sending…' : maskedPhone ? 'Resend' : 'Send'}
                </button>
              </div>
              {otpSessionId && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Enter OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="w-full rounded-xl border border-white/10 bg-[#1a1f2e] px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors placeholder:text-slate-500"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit code"
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                className="w-full rounded-xl border border-white/10 bg-[#1a1f2e] px-4 py-3 text-sm text-white pr-10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={mode === 'otp' && !otpSessionId}
              />
              <button
                type="button"
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                className="absolute inset-y-0 right-3 inline-flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                onClick={() => setShowNewPassword((prev) => !prev)}
              >
                {showNewPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">Confirm New Password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-white/10 bg-[#1a1f2e] px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              disabled={mode === 'otp' && !otpSessionId}
            />
          </div>

          {error && <p className="text-sm font-semibold text-rose-500 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">{error}</p>}
          {success && <p className="text-sm font-semibold text-emerald-400 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">{success}</p>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-300 transition-all hover:bg-white/5 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-500/50 disabled:text-white/50 shadow-lg shadow-indigo-500/25"
            >
              {loading && <FiRefreshCw className="h-4 w-4 animate-spin" />}
              Save Password
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PasswordResetDialog

