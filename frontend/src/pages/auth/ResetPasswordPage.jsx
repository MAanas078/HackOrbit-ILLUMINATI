"use client"
import { useState } from "react"
import { Lock, Loader2, ChevronRight, KeyRound } from "lucide-react"
import { useAuthStore } from "../../store/authStore"
import { useNavigate, useParams } from "react-router-dom"
import toast from "react-hot-toast"

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isActive, setIsActive] = useState(false)
  const { resetPassword, error, isLoading, message } = useAuthStore()

  const { token } = useParams()
  const navigate = useNavigate()

  const handleFocus = () => setIsActive(true)
  const handleBlur = () => setIsActive(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    
    try {
      await resetPassword(token, password)
      
      toast.success("Password reset successfully, redirecting to login page...")
      setTimeout(() => {
        navigate("/login")
      }, 2000)
    } catch (error) {
      console.error(error)
      toast.error(error.message || "Error resetting password")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full bg-violet-600/20 blur-3xl -top-20 -left-20"></div>
        <div className="absolute w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl -bottom-20 -right-20"></div>
      </div>
      
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:40px_40px]"></div>
      
      <div 
        className="max-w-md w-full bg-black/30 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/10 relative z-10"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-600"></div>
        
        <div className="p-8">
          <div className="mb-8 text-center">
            <div className="inline-block p-3 bg-indigo-900/30 rounded-xl mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-700 rounded-lg flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-300 to-indigo-300 text-transparent bg-clip-text">
              Reset Password
            </h2>
            <p className="text-indigo-200/70 mt-2 text-sm">Create a new secure password</p>
          </div>
          
          {/* Status Messages */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 px-4 py-3 rounded-lg flex items-center space-x-2 mb-5">
              <div className="w-1 h-full bg-red-500 rounded"></div>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
          
          {message && (
            <div className="bg-green-900/20 border border-green-500/30 px-4 py-3 rounded-lg flex items-center space-x-2 mb-5">
              <div className="w-1 h-full bg-green-500 rounded"></div>
              <p className="text-green-300 text-sm">{message}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password Input */}
            <div className="relative">
              <div className={`absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-lg opacity-20 blur-sm transition-all duration-300 ${password ? 'opacity-30' : 'opacity-0'}`}></div>
              <div className="relative bg-white/5 border border-white/10 rounded-lg overflow-hidden group">
                <div className="flex items-center px-4">
                  <Lock className="w-5 h-5 text-indigo-300/80" />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    className="w-full bg-transparent py-4 px-3 text-white placeholder:text-indigo-200/50 focus:outline-none"
                    required
                  />
                </div>
                <div className={`h-0.5 bg-gradient-to-r from-violet-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ${password ? 'scale-x-100' : ''}`}></div>
              </div>
            </div>
            
            {/* Confirm Password Input */}
            <div className="relative">
              <div className={`absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-lg opacity-20 blur-sm transition-all duration-300 ${confirmPassword ? 'opacity-30' : 'opacity-0'}`}></div>
              <div className="relative bg-white/5 border border-white/10 rounded-lg overflow-hidden group">
                <div className="flex items-center px-4">
                  <Lock className="w-5 h-5 text-indigo-300/80" />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    className="w-full bg-transparent py-4 px-3 text-white placeholder:text-indigo-200/50 focus:outline-none"
                    required
                  />
                </div>
                <div className={`h-0.5 bg-gradient-to-r from-violet-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ${confirmPassword ? 'scale-x-100' : ''}`}></div>
              </div>
            </div>
            
            {/* Password Match Indicator */}
            {password && confirmPassword && (
              <div className={`text-sm ${password === confirmPassword ? 'text-green-400' : 'text-red-400'} flex items-center space-x-2`}>
                <div className={`w-2 h-2 rounded-full ${password === confirmPassword ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span>{password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}</span>
              </div>
            )}
            
            {/* Submit Button */}
            <button
              className={`w-full py-4 px-4 relative overflow-hidden rounded-lg font-medium text-white transition-all duration-300 ${
                isLoading ? 'bg-indigo-700/50' : 'bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600'
              }`}
              type="submit"
              disabled={isLoading}
            >
              <div className="relative z-10 flex items-center justify-center">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <span className="flex items-center justify-center space-x-2">
                    <span>Set New Password</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </div>
              <div className="absolute inset-0 bg-white/10 scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500"></div>
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-indigo-200/50">
              Choose a strong password with a mix of letters, numbers, and symbols
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage