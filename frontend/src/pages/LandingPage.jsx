import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo / Titre */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold text-white tracking-tight">Activités Jeunesse</h1>
          <p className="text-slate-400 mt-2 text-sm">Bienvenue — choisissez votre espace</p>
        </div>

        {/* Deux choix */}
        <div className="space-y-4">
          {/* Participants */}
          <button
            onClick={() => navigate('/activites')}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 rounded-xl p-6 text-left transition-all duration-150 group border border-white/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">Espace Participants</p>
                <p className="text-slate-500 text-sm mt-0.5">Voir les activités et s'inscrire</p>
              </div>
              <svg className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Admin */}
          <button
            onClick={() => navigate('/admin/login')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl p-6 text-left transition-all duration-150 group border border-slate-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">Espace Administration</p>
                <p className="text-slate-400 text-sm mt-0.5">Gérer les événements</p>
              </div>
              <svg className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
