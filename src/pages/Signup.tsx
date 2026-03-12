import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import ThemeToggle from '../components/ThemeToggle'

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    const { error } = await signUp(email, password, fullName)
    if (error) { setError(error); setLoading(false) }
    else { setSuccess(true); setLoading(false) }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 heart-bg">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-love-gradient shadow-glow mb-4 animate-float">
            <Heart className="w-8 h-8 text-white" fill="currentColor" />
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Check your email!</h2>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            We've sent a confirmation link to <strong className={isDark ? 'text-white' : 'text-slate-800'}>{email}</strong>
          </p>
          <Link to="/login" className="btn-primary inline-block">Go to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 heart-bg">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-love-gradient shadow-glow mb-4 animate-float">
            <Heart className="w-8 h-8 text-white" fill="currentColor" />
          </div>
          <h1 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>Join CallDate</h1>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Create your account and start planning dates</p>
        </div>

        <form onSubmit={handleSubmit} className={`${isDark ? 'card-dark' : 'card-light'} p-6 space-y-4`}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">{error}</div>
          )}

          {[
            { label: 'Full Name', type: 'text', value: fullName, set: setFullName, placeholder: 'Your name' },
            { label: 'Email', type: 'email', value: email, set: setEmail, placeholder: 'you@example.com' },
            { label: 'Password', type: 'password', value: password, set: setPassword, placeholder: 'At least 6 characters' },
            { label: 'Confirm Password', type: 'password', value: confirmPassword, set: setConfirmPassword, placeholder: 'Repeat password' },
          ].map((field) => (
            <div key={field.label}>
              <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>{field.label}</label>
              <input
                type={field.type}
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                placeholder={field.placeholder}
                required
                className="w-full input-base"
              />
            </div>
          ))}

          <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Already have an account?{' '}
            <Link to="/login" className="text-rose font-semibold hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
