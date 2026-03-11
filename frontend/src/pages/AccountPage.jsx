import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createAccount, loginUser } from '../api'

export default function AccountPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState(params.get('mode') === 'login' ? 'login' : 'create')

  const [form, setForm] = useState({ first_name: '', last_name: '', age: '', phone: '', pin: '', pin2: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (mode === 'create' && form.pin !== form.pin2) {
      setError('Les codes PIN ne correspondent pas')
      return
    }
    if (form.pin && !/^\d{4}$/.test(form.pin)) {
      setError('Le code PIN doit contenir exactement 4 chiffres')
      return
    }

    setLoading(true)
    try {
      let data
      if (mode === 'create') {
        data = await createAccount({
          first_name: form.first_name,
          last_name: form.last_name,
          age: form.age ? parseInt(form.age) : null,
          phone: form.phone,
          pin: form.pin
        })
      } else {
        data = await loginUser({
          first_name: form.first_name,
          last_name: form.last_name,
          pin: form.pin
        })
      }
      localStorage.setItem('user_token', data.token)
      navigate('/activites')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-300 text-sm transition-colors mb-6 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>
          <h1 className="text-2xl font-semibold text-white">
            {mode === 'create' ? 'Créer un compte' : 'Se connecter'}
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">Activités Jeunesse</p>
        </div>

        {/* Onglets */}
        <div className="flex bg-slate-800 rounded-lg p-1 mb-6">
          <button
            onClick={() => { setMode('create'); setError('') }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'create' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Créer un compte
          </button>
          <button
            onClick={() => { setMode('login'); setError('') }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'login' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Se connecter
          </button>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prénom *</label>
                <input className="input" value={form.first_name} onChange={set('first_name')} placeholder="Prénom" autoFocus />
              </div>
              <div>
                <label className="label">Nom *</label>
                <input className="input" value={form.last_name} onChange={set('last_name')} placeholder="Nom" />
              </div>
            </div>

            {mode === 'create' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Âge</label>
                  <input className="input" type="number" min="0" max="99" value={form.age} onChange={set('age')} placeholder="Ex. 14" />
                </div>
                <div>
                  <label className="label">Téléphone</label>
                  <input className="input" value={form.phone} onChange={set('phone')} placeholder="06..." />
                </div>
              </div>
            )}

            <div>
              <label className="label">Code PIN (4 chiffres) *</label>
              <input
                className="input tracking-widest text-center text-lg font-semibold"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={form.pin}
                onChange={set('pin')}
                placeholder="----"
              />
              {mode === 'create' && (
                <p className="text-xs text-slate-400 mt-1">Ce code vous servira à vous connecter</p>
              )}
            </div>

            {mode === 'create' && (
              <div>
                <label className="label">Confirmer le code PIN *</label>
                <input
                  className="input tracking-widest text-center text-lg font-semibold"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.pin2}
                  onChange={set('pin2')}
                  placeholder="----"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
            )}

            <button className="btn-primary w-full py-3" disabled={loading}>
              {loading ? 'En cours...' : mode === 'create' ? 'Créer mon compte' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
