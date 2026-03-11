import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPublicEvents, registerForEvent, getMyRegistrations, isUserLoggedIn, getUser, logoutUser } from '../api'

function formatDate(str) {
  const d = new Date(str)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function formatTime(str) {
  const d = new Date(str)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function GaugeBar({ current, max }) {
  const pct = Math.min(100, Math.round((current / max) * 100))
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-500'
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
        <span className="font-medium">{current} / {max} inscrits</span>
        <span>
          {pct >= 100
            ? <span className="text-red-600 font-semibold">Complet</span>
            : `${max - current} place${max - current > 1 ? 's' : ''} disponible${max - current > 1 ? 's' : ''}`
          }
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// Modal de confirmation avant inscription
function ConfirmModal({ event, user, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <h3 className="font-semibold text-slate-900 mb-1">Confirmer l'inscription</h3>
        <p className="text-sm text-slate-500 mb-5">{event.title}</p>

        <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Participant</span>
            <span className="font-medium text-slate-900">{user.first_name} {user.last_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Date</span>
            <span className="font-medium text-slate-900 capitalize">{formatDate(event.event_date)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Heure</span>
            <span className="font-medium text-slate-900">{formatTime(event.event_date)}</span>
          </div>
          {event.location && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Lieu</span>
              <span className="font-medium text-slate-900">{event.location}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onClose} disabled={loading}>Annuler</button>
          <button className="btn-primary flex-1" onClick={onConfirm} disabled={loading}>
            {loading ? 'En cours...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal résultat
function ResultModal({ result, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${result.status === 'registered' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
          {result.status === 'registered' ? (
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          {result.status === 'registered' ? 'Inscription confirmée !' : 'Liste d\'attente'}
        </h3>
        <p className="text-slate-500 text-sm mb-6">{result.message}</p>
        <button className="btn-primary w-full" onClick={onClose}>Fermer</button>
      </div>
    </div>
  )
}

function EventCard({ event, myRegistrations, onRegister }) {
  const [expanded, setExpanded] = useState(false)
  const isFull = event.registered_count >= event.max_participants
  const alreadyRegistered = myRegistrations.some(r => r.event_id === event.id)

  return (
    <div className="card flex flex-col">
      {event.photo_path ? (
        <div className="relative h-48 overflow-hidden">
          <img src={event.photo_path} alt={event.title} className="w-full h-full object-cover" />
          {event.theme && (
            <span className="absolute top-3 left-3 bg-white/95 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
              {event.theme}
            </span>
          )}
        </div>
      ) : (
        <div className="h-1.5 bg-slate-900 rounded-t-xl" />
      )}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h2 className="text-base font-semibold text-slate-900 leading-snug">{event.title}</h2>
          {!event.photo_path && event.theme && (
            <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0">{event.theme}</span>
          )}
        </div>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
            <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="capitalize">{formatDate(event.event_date)} à {formatTime(event.event_date)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{event.location}</span>
            </div>
          )}
        </div>

        {event.description && (
          <div className="mb-4">
            <p className={`text-slate-500 text-sm leading-relaxed ${!expanded && 'line-clamp-2'}`}>{event.description}</p>
            {event.description.length > 120 && (
              <button onClick={() => setExpanded(e => !e)} className="text-slate-700 text-xs mt-1 font-medium hover:underline">
                {expanded ? 'Voir moins' : 'Lire la suite'}
              </button>
            )}
          </div>
        )}

        <div className="mt-auto space-y-3 pt-2">
          <GaugeBar current={event.registered_count} max={event.max_participants} />
          {event.waiting_count > 0 && (
            <p className="text-amber-600 text-xs font-medium">{event.waiting_count} personne{event.waiting_count > 1 ? 's' : ''} en liste d'attente</p>
          )}
          <div className="flex gap-2">
            {alreadyRegistered ? (
              <div className="flex-1 text-center py-2.5 px-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Déjà inscrit
              </div>
            ) : (
              <button
                className={`flex-1 text-sm font-medium py-3 px-4 rounded-lg transition-colors ${isFull ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200' : 'btn-primary'}`}
                onClick={() => onRegister(event)}
              >
                {isFull ? 'Liste d\'attente' : 'S\'inscrire'}
              </button>
            )}
            {event.link && (
              <a href={event.link} target="_blank" rel="noopener noreferrer" className="btn-secondary py-3 px-3 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span className="text-xs">Plus d'infos</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PublicPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [myRegistrations, setMyRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmEvent, setConfirmEvent] = useState(null)
  const [result, setResult] = useState(null)
  const [regLoading, setRegLoading] = useState(false)
  const user = getUser()

  async function load() {
    try {
      const [evts, regs] = await Promise.all([
        getPublicEvents(),
        isUserLoggedIn() ? getMyRegistrations() : Promise.resolve([])
      ])
      setEvents(evts)
      setMyRegistrations(regs)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleRegisterClick(event) {
    if (!isUserLoggedIn()) {
      navigate('/compte')
      return
    }
    setConfirmEvent(event)
  }

  async function handleConfirm() {
    if (!confirmEvent) return
    setRegLoading(true)
    try {
      const data = await registerForEvent(confirmEvent.id)
      setConfirmEvent(null)
      setResult(data)
      load()
    } catch (err) {
      setConfirmEvent(null)
      setResult({ status: 'error', message: err.message })
    } finally {
      setRegLoading(false)
    }
  }

  function handleLogout() {
    logoutUser()
    setMyRegistrations([])
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-900">Activités Jeunesse</h1>
            {!isUserLoggedIn() && (
              <p className="text-xs text-slate-500 mt-0.5">Connectez-vous pour vous inscrire</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isUserLoggedIn() ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600 hidden sm:block">
                  Bonjour, <span className="font-medium text-slate-900">{user?.first_name}</span>
                </span>
                <button onClick={handleLogout} className="btn-ghost text-xs py-1.5 px-3">Déconnexion</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/compte?mode=login')} className="btn-ghost text-xs py-1.5 px-3">Se connecter</button>
                <button onClick={() => navigate('/compte')} className="btn-primary text-xs py-1.5 px-3">Créer un compte</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-2 text-slate-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Chargement...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-700 mb-2">Aucune activité à venir</h2>
            <p className="text-slate-400 text-sm">Revenez bientôt pour découvrir les prochains événements.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                myRegistrations={myRegistrations}
                onRegister={handleRegisterClick}
              />
            ))}
          </div>
        )}
      </main>

      {confirmEvent && user && (
        <ConfirmModal
          event={confirmEvent}
          user={user}
          onConfirm={handleConfirm}
          onClose={() => setConfirmEvent(null)}
          loading={regLoading}
        />
      )}

      {result && (
        <ResultModal result={result} onClose={() => { setResult(null) }} />
      )}

      <footer className="border-t border-slate-200 mt-12">
        <div className="max-w-5xl mx-auto px-5 py-5 flex items-center justify-between">
          <p className="text-xs text-slate-400">Activités Jeunesse</p>
          <button onClick={() => navigate('/')} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Accueil</button>
        </div>
      </footer>
    </div>
  )
}
