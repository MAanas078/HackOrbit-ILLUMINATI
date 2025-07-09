"use client"
import { useState } from "react"
import { User, Mail, Lock, Loader2, ChevronRight } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import PasswordStrengthMeter from "../../components/auth/PasswordStrengthMeter"
import { useAuthStore } from "../../store/authStore"

const SignUpPage = () => {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isActive, setIsActive] = useState(false)
  const navigate = useNavigate()

  const { signup, error, isLoading } = useAuthStore()
  
  const handleFocus = () => setIsActive(true)
  const handleBlur = () => setIsActive(false)

  const handleSignUp = async (e) => {
    e.preventDefault()
    
    try {
      await signup(email, password, name)
      navigate("/verify-email")
    } catch (error) {
      console.log(error)
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
                <User className="w-6 h-6 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-300 to-indigo-300 text-transparent bg-clip-text">
              Create Account
            </h2>
            <p className="text-indigo-200/70 mt-2 text-sm">Sign up to get started</p>
          </div>
          
          <form onSubmit={handleSignUp} className="space-y-5">
            {/* Name Input */}
            <div className="relative">
              <div className={`absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-lg opacity-20 blur-sm transition-all duration-300 ${name ? 'opacity-30' : 'opacity-0'}`}></div>
              <div className="relative bg-white/5 border border-white/10 rounded-lg overflow-hidden group">
                <div className="flex items-center px-4">
                  <User className="w-5 h-5 text-indigo-300/80" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    className="w-full bg-transparent py-4 px-3 text-white placeholder:text-indigo-200/50 focus:outline-none"
                  />
                </div>
                <div className={`h-0.5 bg-gradient-to-r from-violet-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ${name ? 'scale-x-100' : ''}`}></div>
              </div>
            </div>
            
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
                  />
                </div>
                <div className={`h-0.5 bg-gradient-to-r from-violet-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ${email ? 'scale-x-100' : ''}`}></div>
              </div>
            </div>
            
            {/* Password Input */}
            <div className="relative">
              <div className={`absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-lg opacity-20 blur-sm transition-all duration-300 ${password ? 'opacity-30' : 'opacity-0'}`}></div>
              <div className="relative bg-white/5 border border-white/10 rounded-lg overflow-hidden group">
                <div className="flex items-center px-4">
                  <Lock className="w-5 h-5 text-indigo-300/80" />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    className="w-full bg-transparent py-4 px-3 text-white placeholder:text-indigo-200/50 focus:outline-none"
                  />
                </div>
                <div className={`h-0.5 bg-gradient-to-r from-violet-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ${password ? 'scale-x-100' : ''}`}></div>
              </div>
            </div>
            
            {/* Password Strength Meter */}
            <div className="mt-2">
              <PasswordStrengthMeter password={password} />
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 px-4 py-3 rounded-lg flex items-center space-x-2">
                <div className="w-1 h-full bg-red-500 rounded"></div>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
            
            {/* Sign Up Button */}
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
                    <span>Create Account</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </div>
              <div className="absolute inset-0 bg-white/10 scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500"></div>
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-white/10 flex justify-center">
            <p className="text-sm text-indigo-200/70">
              Already have an account?{" "}
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-indigo-200/50">
        Your data is encrypted and secure
      </div>
    </div>
  )
}

export default SignUpPage