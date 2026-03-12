import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import ThemeToggle from '../components/ThemeToggle'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const isDark = theme === 'dark'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 heart-bg">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-love-gradient shadow-glow mb-4 animate-float">
            <Heart className="w-8 h-8 text-white" fill="currentColor" />
          </div>
          <h1 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>CallDate</h1>
          <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Welcome back! Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className={`${isDark ? 'card-dark' : 'card-light'} p-6 space-y-4`}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full input-base"
            />
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full input-base"
            />
          </div>

          <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Don't have an account?{' '}
            <Link to="/signup" className="text-rose font-semibold hover:underline">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
