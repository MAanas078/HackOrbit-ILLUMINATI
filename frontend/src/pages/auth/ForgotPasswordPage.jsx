"use client"
import { useState } from "react"
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react"
import { Link } from "react-router-dom"
import { useAuthStore } from "../../store/authStore"

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isActive, setIsActive] = useState(false)
  
  const { isLoading, forgotPassword } = useAuthStore()
  
  const handleFocus = () => setIsActive(true)
  const handleBlur = () => setIsActive(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    await forgotPassword(email)
    setIsSubmitted(true)
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
          {!isSubmitted ? (
            <>
              <div className="mb-8 text-center">
                <div className="inline-block p-3 bg-indigo-900/30 rounded-xl mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-700 rounded-lg flex items-center justify-center">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-300 to-indigo-300 text-transparent bg-clip-text">
                  Forgot Password
                </h2>
                <p className="text-indigo-200/70 mt-3 text-sm">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Input */}
                <div className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-lg opacity-20 blur-sm transition-all duration-300 ${email ? 'opacity-30' : 'opacity-0'}`}></div>
                  <div className="relative bg-white/5 border border-white/10 rounded-lg overflow-hidden group">
                    <div className="flex items-center px-4">
                      <Mail className="w-5 h-5 text-indigo-300/80" />
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        className="w-full bg-transparent py-4 px-3 text-white placeholder:text-indigo-200/50 focus:outline-none"
                        required
                      />
                    </div>
                    <div className={`h-0.5 bg-gradient-to-r from-violet-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ${email ? 'scale-x-100' : ''}`}></div>
                  </div>
                </div>
                
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
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      "Send Reset Link"
                    )}
                  </div>
                  <div className="absolute inset-0 bg-white/10 scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500"></div>
                </button>
              </form>
            </>
          ) : (
            <div className="py-8 text-center">
              <div 
                className="w-20 h-20 mx-auto mb-6 bg-indigo-900/40 rounded-full flex items-center justify-center"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-700 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <h3 className="text-2xl font-semibold text-white mb-4">Check Your Email</h3>
              
              <p className="text-indigo-200/70 mb-8">
                If an account exists for <span className="text-indigo-300 font-medium">{email}</span>, you will receive a password reset link shortly.
              </p>
              
              <div className="text-indigo-200/50 text-sm">
                <p>Didn't receive an email? Check your spam folder or try again.</p>
              </div>
            </div>
          )}
        </div>
          
        <div className="px-8 py-4 bg-black/40 border-t border-white/5 flex justify-center">
          <Link to="/login" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage