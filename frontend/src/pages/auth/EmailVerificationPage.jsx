"use client"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Shield, Loader2 } from "lucide-react"
import { useAuthStore } from "../../store/authStore"
import toast from "react-hot-toast"

const EmailVerificationPage = () => {
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const inputRefs = useRef([])
  const navigate = useNavigate()

  const { error, isLoading, verifyEmail } = useAuthStore()

  const handleChange = (index, value) => {
    const newCode = [...code]

    // Handle pasted content
    if (value.length > 1) {
      const pastedCode = value.slice(0, 6).split("")
      for (let i = 0; i < 6; i++) {
        newCode[i] = pastedCode[i] || ""
      }
      setCode(newCode)

      // Focus on the last non-empty input or the first empty one
      const lastFilledIndex = newCode.findLastIndex((digit) => digit !== "")
      const focusIndex = lastFilledIndex < 5 ? lastFilledIndex + 1 : 5
      inputRefs.current[focusIndex].focus()
    } else {
      newCode[index] = value
      setCode(newCode)

      // Move focus to the next input field if value is entered
      if (value && index < 5) {
        inputRefs.current[index + 1].focus()
      }
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const verificationCode = code.join("")
    try {
      await verifyEmail(verificationCode)
      navigate("/")
      toast.success("Email verified successfully")
    } catch (error) {
      console.log(error)
    }
  }

  // Auto submit when all fields are filled
  useEffect(() => {
    if (code.every((digit) => digit !== "")) {
      handleSubmit(new Event("submit"))
    }
  }, [code])

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
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-300 to-indigo-300 text-transparent bg-clip-text">
              Verify Your Email
            </h2>
            <p className="text-indigo-200/70 mt-3 text-sm">
              Enter the 6-digit code sent to your email address
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between gap-2">
              {code.map((digit, index) => (
                <div key={index} className="relative">
                  <div className={`absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-lg opacity-20 blur-sm transition-all duration-300 ${digit ? 'opacity-30' : 'opacity-0'}`}></div>
                  <input
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="6"
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-xl font-bold bg-white/5 text-white border border-white/10 rounded-lg focus:border-violet-500 focus:outline-none relative z-10"
                  />
                  <div className={`h-0.5 w-full absolute -bottom-1 left-0 bg-gradient-to-r from-violet-500 to-indigo-600 rounded transform scale-x-0 transition-transform duration-300 ${digit ? 'scale-x-100' : ''}`}></div>
                </div>
              ))}
            </div>
            
            {error && (
              <div className="bg-red-900/20 border border-red-500/30 px-4 py-3 rounded-lg flex items-center space-x-2">
                <div className="w-1 h-full bg-red-500 rounded"></div>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
            
            <button
              className={`w-full py-4 px-4 relative overflow-hidden rounded-lg font-medium text-white transition-all duration-300 ${
                isLoading || code.some(digit => !digit) ? 'bg-indigo-700/30 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600'
              }`}
              type="submit"
              disabled={isLoading || code.some(digit => !digit)}
            >
              <div className="relative z-10 flex items-center justify-center">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  "Verify Email"
                )}
              </div>
              <div className={`absolute inset-0 bg-white/10 scale-x-0 origin-left transition-transform duration-500 ${!isLoading && !code.some(digit => !digit) ? 'group-hover:scale-x-100' : ''}`}></div>
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-indigo-200/50">
              Didn't receive a code? <span className="text-indigo-400 cursor-pointer hover:text-indigo-300">Resend code</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailVerificationPage