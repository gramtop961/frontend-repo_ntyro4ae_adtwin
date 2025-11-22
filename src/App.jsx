import { useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { Send, Trash2, LogIn, LogOut, Mic, Upload, Moon, Sun, Settings, Bot, User, FileText, History, HelpCircle } from 'lucide-react'
import Spline from '@splinetool/react-spline'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])
  return { theme, setTheme }
}

function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'))

  const saveAuth = (t, u) => {
    setToken(t)
    setUser(u)
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, saveAuth, logout }
}

function Header({ onToggleTheme, theme }) {
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-white/70 dark:bg-black/40 border-b border-black/10 dark:border-white/10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
          <Bot size={22} /> Flames Assistant
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/help" className="px-3 py-2 rounded hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2"><HelpCircle size={16}/> Help</Link>
          <Link to="/dashboard" className="px-3 py-2 rounded hover:bg-black/5 dark:hover:bg.White/10 flex items-center gap-2"><History size={16}/> Dashboard</Link>
          <button onClick={onToggleTheme} className="px-3 py-2 rounded hover:bg-black/5 dark:hover:bg-white/10" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>} 
          </button>
          {token ? (
            <button onClick={() => { logout(); navigate('/login') }} className="px-3 py-2 rounded bg-red-500/90 hover:bg-red-600 text-white flex items-center gap-2"><LogOut size={16}/> Logout</button>
          ) : (
            <Link to="/login" className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"><LogIn size={16}/> Login</Link>
          )}
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative h-[360px] md:h-[420px] w-full overflow-hidden">
      <Spline scene="https://prod.spline.design/AeAqaKLmGsS-FPBN/scene.splinecode" style={{ width: '100%', height: '100%' }} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-white/80 dark:to-black/90"/>
      <div className="absolute inset-0 flex items-end md:items-center justify-center">
        <div className="text-center p-6 md:p-8">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Your Friendly AI Assistant</h1>
          <p className="mt-3 md:mt-4 text-sm md:text-base text-black/70 dark:text-white/70">Ask questions, analyze files, and create content. Fast, lightweight, and delightful.</p>
        </div>
      </div>
    </section>
  )
}

function ChatBubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
          <Bot size={18}/>
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${isUser ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-black/5 dark:bg-white/10 text-black dark:text-white rounded-bl-sm'}`}>
        {content}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 text-black dark:text-white flex items-center justify-center shrink-0">
          <User size={18}/>
        </div>
      )}
    </div>
  )
}

function ChatArea() {
  const { token, user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [files, setFiles] = useState([])
  const fileInputRef = useRef()
  const [recognizing, setRecognizing] = useState(false)

  const canUseVoice = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  let recognitionRef = useRef(null)
  useEffect(() => {
    if (canUseVoice) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      const rec = new SR()
      rec.continuous = false
      rec.lang = 'en-US'
      rec.onresult = (e) => {
        const t = Array.from(e.results).map(r => r[0].transcript).join(' ')
        setInput(prev => (prev ? prev + ' ' : '') + t)
      }
      rec.onend = () => setRecognizing(false)
      recognitionRef.current = rec
    }
  }, [])

  const startVoice = () => {
    if (!canUseVoice) return
    setRecognizing(true)
    recognitionRef.current.start()
  }

  const stopVoice = () => {
    if (!canUseVoice) return
    recognitionRef.current.stop()
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    if (!res.ok) return
    const data = await res.json()
    setFiles(prev => [...prev, { id: data.file_id, name: file.name }])
  }

  const sendMessage = async () => {
    if (!input.trim() || !token) return
    const newMessages = [...messages, { role: 'user', content: input }]
    setMessages(newMessages)
    setLoading(true)
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: input, conversation_id: conversationId, file_ids: files.map(f => f.id) })
    })
    setInput('')
    if (!res.ok) {
      setLoading(false)
      return
    }
    const data = await res.json()
    setConversationId(data.conversation_id)
    setMessages([...newMessages, { role: 'assistant', content: data.response }])
    setLoading(false)
  }

  const clearChat = async () => {
    setMessages([])
    setConversationId(null)
    setFiles([])
    if (token) {
      await fetch(`${API_BASE}/conversations/clear`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    }
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-black/70 dark:text-white/70">
          <History size={16}/> Recent chat will auto-save to your account
        </div>
        <button onClick={clearChat} className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20"><Trash2 size={16}/> Clear</button>
      </div>

      <div className="space-y-4 min-h-[320px]">
        {messages.length === 0 && (
          <div className="text-center text-black/60 dark:text-white/60 text-sm">Start by asking a question or upload a file for analysis.</div>
        )}
        {messages.map((m, idx) => (
          <ChatBubble key={idx} role={m.role} content={m.content} />
        ))}
        {loading && <div className="text-sm text-black/60 dark:text-white/60 animate-pulse">Assistant is typing...</div>}
      </div>

      <div className="mt-4 border rounded-2xl p-2 bg-white dark:bg-black border-black/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/10" title="Upload file"><Upload size={18}/></button>
          <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.jpg,.jpeg,.png" onChange={handleUpload} className="hidden"/>
          {canUseVoice && (
            recognizing ? (
              <button onClick={stopVoice} className="p-2 rounded bg-red-500/90 text-white" title="Stop recording"><Mic size={18}/></button>
            ) : (
              <button onClick={startVoice} className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/10" title="Voice input"><Mic size={18}/></button>
            )
          )}
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Type your message..." rows={1} className="flex-1 resize-none outline-none bg-transparent p-2 text-sm"/>
          <button onClick={sendMessage} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2" disabled={loading}><Send size={16}/> Send</button>
        </div>
        {files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {files.map(f => (
              <span key={f.id} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 dark:bg-white/10 text-blue-700 dark:text-blue-300"><FileText size={14}/> {f.name}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LoginPage() {
  const { saveAuth } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState('login')
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    const url = `${API_BASE}/auth/${mode === 'login' ? 'login' : 'signup'}`
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mode === 'login' ? { email, password } : { name, email, password }) })
    if (!res.ok) return
    const data = await res.json()
    saveAuth(data.token, data.user)
    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-black dark:to-black">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow">
        <h2 className="text-xl font-semibold mb-4">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2 rounded border bg-transparent" required />
          )}
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" className="w-full px-3 py-2 rounded border bg-transparent" required />
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" className="w-full px-3 py-2 rounded border bg-transparent" required />
          <button className="w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white">{mode === 'login' ? 'Login' : 'Sign up'}</button>
        </form>
        <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="mt-3 w-full text-sm text-blue-600">{mode === 'login' ? 'New here? Create an account' : 'Have an account? Login'}</button>
      </div>
    </div>
  )
}

function Dashboard() {
  const { token, user } = useAuth()
  const [items, setItems] = useState([])
  useEffect(() => {
    const run = async () => {
      if (!token) return
      const res = await fetch(`${API_BASE}/conversations`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    }
    run()
  }, [token])

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-black">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><History size={16}/> Recent Conversations</h3>
          <div className="space-y-2 max-h-64 overflow-auto pr-2">
            {items.length === 0 ? <div className="text-sm text-black/60 dark:text-white/60">No conversations yet.</div> : items.map(it => (
              <div key={it.id} className="text-sm p-2 rounded hover:bg-black/5 dark:hover:bg-white/10">{it.title || 'Untitled'}</div>
            ))}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-black">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><Settings size={16}/> Theme</h3>
          <p className="text-sm text-black/60 dark:text-white/60">Switch between light and dark modes from the top bar.</p>
          <div className="mt-3 text-sm">Logged in as: <span className="font-medium">{user?.email || '-'}</span></div>
        </div>
      </div>
    </div>
  )
}

function Help() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 text-sm leading-6 text-black/80 dark:text-white/80">
      <h2 className="text-2xl font-bold mb-3">How to use</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>Type your question in the box and press Send.</li>
        <li>Upload PDFs, images, or text files. I can extract text and summarize.</li>
        <li>Use the microphone button for voice input on supported browsers.</li>
        <li>Your conversations are saved to your account and shown in the dashboard.</li>
        <li>Use Clear to reset the chat anytime.</li>
      </ul>
    </div>
  )
}

function Layout({ children }) {
  const { theme, setTheme } = useTheme()
  return (
    <div className="min-h-screen bg-white text-black dark:bg-[#0a0a0a] dark:text-white">
      <Header theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
      <Hero />
      <main className="py-6">{children}</main>
      <footer className="py-8 text-center text-xs text-black/60 dark:text-white/60">© {new Date().getFullYear()} Flames Assistant</footer>
    </div>
  )
}

function Home() {
  return (
    <Layout>
      <ChatArea />
    </Layout>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/help" element={<Layout><Help /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}
