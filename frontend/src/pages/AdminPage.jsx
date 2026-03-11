import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  isLoggedIn, logout,
  getAllEvents, deleteEvent,
  getRegistrations, addRegistration, deleteRegistration, updateRegistrationStatus,
  getEventStats, changePassword
} from '../api'
import EventForm from '../components/EventForm'

function formatDate(str) {
  const d = new Date(str)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function isPast(str) {
  return new Date(str) < new Date()
}

function StatsPanel() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    getEventStats().then(setStats).catch(() => {})
  }, [])

  if (!stats) return (
    <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Chargement...
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Événements total', value: stats.totalEvents },
          { label: 'À venir', value: stats.upcomingEvents },
          { label: 'Inscrits total', value: stats.totalRegistrations },
          { label: 'En attente', value: stats.totalWaiting },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-3xl font-semibold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Top événements</h3>
          {stats.popularEvents.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucune donnée</p>
          ) : stats.popularEvents.map((e, i) => (
            <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-800">{e.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(e.event_date)}</p>
              </div>
              <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">{e.total}</span>
            </div>
          ))}
        </div>

        <div className="card p-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Répartition par âge</h3>
          {stats.ageDistribution.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucune donnée</p>
          ) : stats.ageDistribution.map((a, i) => (
            <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-700">{a.tranche}</span>
              <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">{a.count}</span>
            </div>
          ))}
        </div>

        {stats.byTheme.length > 0 && (
          <div className="card p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Événements par thème</h3>
            {stats.byTheme.map((t, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-700">{t.theme}</span>
                <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">{t.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RegistrationsModal({ event, onClose }) {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', age: '', phone: '' })
  const [addError, setAddError] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  async function load() {
    try {
      const data = await getRegistrations(event.id)
      setRegistrations(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id) {
    if (!confirm('Supprimer cette inscription ?')) return
    await deleteRegistration(id)
    load()
  }

  async function handleStatusChange(id, newStatus) {
    await updateRegistrationStatus(id, newStatus)
    load()
  }

  async function handleAdd(e) {
    e.preventDefault()
    setAddError('')
    try {
      await addRegistration(event.id, { ...addForm, age: addForm.age ? parseInt(addForm.age) : null })
      setAddForm({ first_name: '', last_name: '', age: '', phone: '' })
      setShowAdd(false)
      load()
    } catch (err) {
      setAddError(err.message)
    }
  }

  const registered = registrations.filter(r => r.status === 'registered')
  const waiting = registrations.filter(r => r.status === 'waiting')

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-xl border border-slate-200 w-full max-w-2xl my-8 shadow-xl">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-slate-900">{event.title}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{registered.length} / {event.max_participants} inscrits &middot; {waiting.length} en attente</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Chargement...
            </div>
          ) : (
            <>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <h4 className="text-sm font-semibold text-slate-700">Inscrits ({registered.length})</h4>
                  </div>
                  <button onClick={() => setShowAdd(s => !s)} className="btn-secondary text-xs py-1.5 px-3">
                    + Ajouter
                  </button>
                </div>

                {showAdd && (
                  <form onSubmit={handleAdd} className="bg-slate-50 rounded-lg p-4 mb-3 border border-slate-200">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <input className="input text-sm" placeholder="Prénom *" value={addForm.first_name} onChange={e => setAddForm(f => ({ ...f, first_name: e.target.value }))} autoFocus />
                      <input className="input text-sm" placeholder="Nom *" value={addForm.last_name} onChange={e => setAddForm(f => ({ ...f, last_name: e.target.value }))} />
                      <input className="input text-sm" placeholder="Âge" type="number" value={addForm.age} onChange={e => setAddForm(f => ({ ...f, age: e.target.value }))} />
                      <input className="input text-sm" placeholder="Téléphone" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    {addError && <p className="text-red-600 text-xs mb-2">{addError}</p>}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary text-xs py-1.5 px-3">Annuler</button>
                      <button className="btn-primary text-xs py-1.5 px-3">Ajouter</button>
                    </div>
                  </form>
                )}

                {registered.length === 0 ? (
                  <p className="text-slate-400 text-sm py-3">Aucun inscrit pour le moment.</p>
                ) : (
                  <div className="space-y-1.5">
                    {registered.map((r, i) => (
                      <div key={r.id} className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
                        <span className="text-xs font-medium text-slate-400 w-5 text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{r.first_name} {r.last_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {[r.age ? `${r.age} ans` : null, r.phone || null, new Date(r.registered_at).toLocaleDateString('fr-FR')].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <button onClick={() => handleDelete(r.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded" title="Supprimer">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {waiting.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 bg-amber-400 rounded-full" />
                    <h4 className="text-sm font-semibold text-slate-700">Liste d'attente ({waiting.length})</h4>
                  </div>
                  <div className="space-y-1.5">
                    {waiting.map((r, i) => (
                      <div key={r.id} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                        <span className="text-xs font-medium text-slate-400 w-5 text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{r.first_name} {r.last_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {[r.age ? `${r.age} ans` : null, r.phone || null].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <button onClick={() => handleStatusChange(r.id, 'registered')} className="text-xs text-emerald-700 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors font-medium">
                          Confirmer
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded" title="Supprimer">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('events')
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [filter, setFilter] = useState('all')
  const [pwForm, setPwForm] = useState({ old: '', new1: '', new2: '' })
  const [pwMsg, setPwMsg] = useState('')

  useEffect(() => {
    if (!isLoggedIn()) navigate('/admin/login')
  }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await getAllEvents()
      setEvents(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (tab === 'events') load() }, [tab])

  async function handleDelete(event) {
    if (!confirm(`Supprimer "${event.title}" ? Cette action est irréversible.`)) return
    await deleteEvent(event.id)
    load()
  }

  async function handlePwChange(e) {
    e.preventDefault()
    setPwMsg('')
    if (pwForm.new1 !== pwForm.new2) { setPwMsg('Les mots de passe ne correspondent pas'); return }
    try {
      await changePassword(pwForm.old, pwForm.new1)
      setPwMsg('Mot de passe modifié avec succès.')
      setPwForm({ old: '', new1: '', new2: '' })
    } catch (err) {
      setPwMsg(err.message)
    }
  }

  const filteredEvents = events.filter(e => {
    if (filter === 'upcoming') return !isPast(e.event_date)
    if (filter === 'past') return isPast(e.event_date)
    return true
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-slate-900 text-sm">Activités Jeunesse</span>
            <nav className="flex items-center">
              {[
                { id: 'events', label: 'Événements' },
                { id: 'stats', label: 'Statistiques' },
                { id: 'settings', label: 'Paramètres' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 h-14 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" target="_blank" className="btn-ghost hidden sm:block">Voir le site</a>
            <button onClick={() => { logout(); navigate('/admin/login') }} className="btn-secondary text-sm py-1.5 px-4">
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8">
        {tab === 'events' && (
          <div>
            <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
              <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
                {[
                  { id: 'all', label: 'Tous' },
                  { id: 'upcoming', label: 'À venir' },
                  { id: 'past', label: 'Passés' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`text-sm px-4 py-1.5 rounded-md font-medium transition-colors ${filter === f.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button onClick={() => { setEditingEvent(null); setShowForm(true) }} className="btn-primary flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Nouvel événement
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Chargement...
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-slate-400 text-sm">Aucun événement</p>
              </div>
            ) : (
              <div className="card divide-y divide-slate-100">
                {filteredEvents.map(event => (
                  <div key={event.id} className={`flex gap-4 items-center px-5 py-4 hover:bg-slate-50 transition-colors ${isPast(event.event_date) ? 'opacity-50' : ''}`}>
                    {event.photo_path ? (
                      <img src={event.photo_path} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 border border-slate-200" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">{event.title}</h3>
                        {event.theme && (
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">{event.theme}</span>
                        )}
                        {isPast(event.event_date) && (
                          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Passé</span>
                        )}
                        {!event.is_active && (
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Masqué</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(event.event_date)}{event.location ? ` · ${event.location}` : ''}</p>
                    </div>
                    <div className="hidden sm:block text-right flex-shrink-0 min-w-[90px]">
                      <p className="text-sm font-semibold text-slate-800">{event.registered_count} <span className="font-normal text-slate-400">/ {event.max_participants}</span></p>
                      {event.waiting_count > 0 && <p className="text-xs text-amber-600">+{event.waiting_count} attente</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        title="Gérer les inscriptions"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="hidden sm:inline">Inscrits</span> {event.registered_count}
                      </button>
                      <button
                        onClick={() => { setEditingEvent(event); setShowForm(true) }}
                        className="btn-secondary text-xs py-1.5 px-3"
                        title="Modifier"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(event)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                        title="Supprimer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'stats' && <StatsPanel />}

        {tab === 'settings' && (
          <div className="max-w-md">
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-5">Changer le mot de passe</h3>
              <form onSubmit={handlePwChange} className="space-y-4">
                <div>
                  <label className="label">Mot de passe actuel</label>
                  <input className="input" type="password" value={pwForm.old} onChange={e => setPwForm(f => ({ ...f, old: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Nouveau mot de passe</label>
                  <input className="input" type="password" value={pwForm.new1} onChange={e => setPwForm(f => ({ ...f, new1: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Confirmer le nouveau mot de passe</label>
                  <input className="input" type="password" value={pwForm.new2} onChange={e => setPwForm(f => ({ ...f, new2: e.target.value }))} />
                </div>
                {pwMsg && (
                  <div className={`text-sm p-3 rounded-lg border ${pwMsg.includes('succès') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    {pwMsg}
                  </div>
                )}
                <button className="btn-primary">Enregistrer</button>
              </form>
            </div>
          </div>
        )}
      </main>

      {showForm && (
        <EventForm
          event={editingEvent}
          onClose={() => { setShowForm(false); setEditingEvent(null) }}
          onSaved={() => { setShowForm(false); setEditingEvent(null); load() }}
        />
      )}

      {selectedEvent && (
        <RegistrationsModal event={selectedEvent} onClose={() => { setSelectedEvent(null); load() }} />
      )}
    </div>
  )
}
