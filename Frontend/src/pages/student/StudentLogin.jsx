import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/authSlice';
import { getOrCreateDeviceId } from '../../utils/device';
import BlockedTimer from '../../components/BlockedTimer';

const StudentLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // States
  const [step, setStep] = useState(1); // 1: Login, 2: Forgot Password Email, 3: Verify OTP & Reset
  
  const [rollNo, setRollNo] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const getBackendUrl = () => {
    const envUrl = import.meta.env.VITE_BACKEND_URL;
    if (envUrl) return envUrl;
    return `${window.location.protocol}//${window.location.hostname}:9000`;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${getBackendUrl()}/api/auth/student/login`, {
        rollNo,
        password
      });
      
      const { user, access_token: token, refresh_token } = response.data;
      
      dispatch(loginSuccess({ user, token, userType: 'user', refresh_token }));
      
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await axios.post(`${getBackendUrl()}/api/auth/student/forgot-password`, {
        email
      });
      setSuccessMsg('OTP has been sent to your email.');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await axios.post(`${getBackendUrl()}/api/auth/student/reset-password`, {
        email,
        otp,
        new_password: newPassword
      });
      setSuccessMsg('Password reset successfully! You can now login.');
      setTimeout(() => {
        setStep(1);
        setSuccessMsg('');
        setOtp('');
        setNewPassword('');
        setEmail('');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:w-[500px]">
        {/* Neumorphic Card */}
        <div className="bg-[#F0F2F5] rounded-3xl p-8 sm:p-10 shadow-[20px_20px_60px_#ccd0d4,-20px_-20px_60px_#ffffff]">
          
          {/* Logo / Icon Area */}
          <div className="flex justify-center mb-8">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 rounded-[2.5rem] blur-2xl opacity-20 transition-all duration-1000 animate-pulse" />
              <div className="relative flex items-center justify-center bg-white rounded-[2.2rem] py-4 px-8 border border-slate-100 shadow-xl overflow-hidden min-w-[240px]">
                 <div className="flex items-center gap-0.5">
                    <span className="text-3xl font-black text-slate-900 tracking-tighter font-outfit">BBHC</span>
                    <span className="text-3xl font-black text-[#FF3399] tracking-tighter font-outfit filter drop-shadow-[0_2px_10px_rgba(255,51,153,0.3)]">Bazaar</span>
                 </div>
              </div>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center mb-2">
            {step === 1 ? 'WELCOME BACK' : step === 2 ? 'FORGOT PASSWORD' : 'RESET PASSWORD'}
          </h1>
          <p className="text-sm text-gray-500 text-center mb-8 font-medium">
            {step === 1 ? 'Secure access for students' : step === 2 ? 'We will send you a verification code' : 'Enter the code sent to your email'}
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100 shadow-sm">
              <BlockedTimer errorText={error} />
            </div>
          )}
          
          {/* Success Message */}
          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 text-green-700 text-sm border border-green-100 shadow-sm text-center">
              {successMsg}
            </div>
          )}

          {/* Form Step 1: Login */}
          {step === 1 && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 px-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  required
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="e.g. BBA25044"
                  className="w-full px-5 py-3.5 rounded-xl bg-[#F0F2F5] shadow-[inset_4px_4px_8px_#ccd0d4,inset_-4px_-4px_8px_#ffffff] border-none outline-none text-gray-700 placeholder-gray-400 focus:shadow-[inset_6px_6px_12px_#ccd0d4,inset_-6px_-6px_12px_#ffffff] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 px-1">
                  Password (DOB)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    className="w-full px-5 py-3.5 rounded-xl bg-[#F0F2F5] shadow-[inset_4px_4px_8px_#ccd0d4,inset_-4px_-4px_8px_#ffffff] border-none outline-none text-gray-700 placeholder-gray-400 focus:shadow-[inset_6px_6px_12px_#ccd0d4,inset_-6px_-6px_12px_#ffffff] transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-[#F0F2F5] shadow-[8px_8px_16px_#ccd0d4,-8px_-8px_16px_#ffffff] text-indigo-600 font-bold text-lg hover:shadow-[inset_4px_4px_8px_#ccd0d4,inset_-4px_-4px_8px_#ffffff] active:shadow-[inset_6px_6px_12px_#ccd0d4,inset_-6px_-6px_12px_#ffffff] transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
              </div>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => { setStep(2); setError(''); setSuccessMsg(''); }}
                  className="text-sm font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            </form>
          )}

          {/* Form Step 2: Forgot Password */}
          {step === 2 && (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 px-1">
                  Registered Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-5 py-3.5 rounded-xl bg-[#F0F2F5] shadow-[inset_4px_4px_8px_#ccd0d4,inset_-4px_-4px_8px_#ffffff] border-none outline-none text-gray-700 placeholder-gray-400 focus:shadow-[inset_6px_6px_12px_#ccd0d4,inset_-6px_-6px_12px_#ffffff] transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-[#F0F2F5] shadow-[8px_8px_16px_#ccd0d4,-8px_-8px_16px_#ffffff] text-indigo-600 font-bold text-lg hover:shadow-[inset_4px_4px_8px_#ccd0d4,inset_-4px_-4px_8px_#ffffff] active:shadow-[inset_6px_6px_12px_#ccd0d4,inset_-6px_-6px_12px_#ffffff] transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </div>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); }}
                  className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  &larr; Back to Login
                </button>
              </div>
            </form>
          )}

          {/* Form Step 3: Verify OTP & Reset Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 px-1">
                  Verification Code (OTP)
                </label>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="• • • • • •"
                  className="w-full px-5 py-3.5 rounded-xl bg-[#F0F2F5] shadow-[inset_4px_4px_8px_#ccd0d4,inset_-4px_-4px_8px_#ffffff] border-none outline-none text-gray-700 placeholder-gray-400 focus:shadow-[inset_6px_6px_12px_#ccd0d4,inset_-6px_-6px_12px_#ffffff] transition-all tracking-widest text-center font-bold text-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 px-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-5 py-3.5 rounded-xl bg-[#F0F2F5] shadow-[inset_4px_4px_8px_#ccd0d4,inset_-4px_-4px_8px_#ffffff] border-none outline-none text-gray-700 placeholder-gray-400 focus:shadow-[inset_6px_6px_12px_#ccd0d4,inset_-6px_-6px_12px_#ffffff] transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showNewPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-[#F0F2F5] shadow-[8px_8px_16px_#ccd0d4,-8px_-8px_16px_#ffffff] text-emerald-600 font-bold text-lg hover:shadow-[inset_4px_4px_8px_#ccd0d4,inset_-4px_-4px_8px_#ffffff] active:shadow-[inset_6px_6px_12px_#ccd0d4,inset_-6px_-6px_12px_#ffffff] transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Reset Password'}
                </button>
              </div>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); setSuccessMsg(''); }}
                  className="text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  &larr; Cancel
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
