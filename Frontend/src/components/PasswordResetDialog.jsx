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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Reset password</p>
            <h3 className="text-lg font-semibold text-gray-900">{label} account</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close reset password dialog"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-4 px-4 py-5" onSubmit={handleSubmit}>
          <div className="flex gap-2 text-xs font-medium text-gray-600">
            {(['current', 'otp']).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key)
                  setError('')
                  setSuccess('')
                }}
                className={`flex-1 rounded-lg border px-3 py-2 transition ${
                  mode === key
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {modeCopy[key]}
              </button>
            ))}
          </div>

          {mode === 'current' && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-800">Current password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm pr-10 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  className="absolute inset-y-0 right-2 inline-flex items-center text-gray-500 hover:text-gray-700"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                >
                  {showCurrentPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={sendOtp}
                className="text-left text-xs font-semibold text-blue-600 hover:text-blue-700"
                disabled={otpSending}
              >
                {otpSending ? 'Sending OTP…' : 'Forgot password? Send OTP to verified number'}
              </button>
            </div>
          )}

          {mode === 'otp' && (
            <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">OTP verification</p>
                  <p className="text-xs text-gray-600">
                    {maskedPhone ? `Sent to ${maskedPhone}` : 'Send OTP to your verified number'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={sendOtp}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-800 transition hover:border-black hover:text-black"
                  disabled={otpSending}
                >
                  <FiSend className="h-3.5 w-3.5" />
                  {otpSending ? 'Sending…' : maskedPhone ? 'Resend OTP' : 'Send OTP'}
                </button>
              </div>
              {otpSessionId && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-800">Enter OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit code"
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-800">New password</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm pr-10 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={mode === 'otp' && !otpSessionId}
              />
              <button
                type="button"
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                className="absolute inset-y-0 right-2 inline-flex items-center text-gray-500 hover:text-gray-700"
                onClick={() => setShowNewPassword((prev) => !prev)}
              >
                {showNewPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-800">Confirm new password</label>
            <input
              type="password"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              disabled={mode === 'otp' && !otpSessionId}
            />
          </div>

          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          {success && <p className="text-sm font-semibold text-emerald-600">{success}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-600"
            >
              {loading && <FiRefreshCw className="h-4 w-4 animate-spin" />}
              Save password
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PasswordResetDialog

