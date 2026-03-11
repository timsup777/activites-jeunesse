import { useState } from 'react'
import { createEvent, updateEvent } from '../api'

const THEMES = ['Sport', 'Culture', 'Nature', 'Créativité', 'Bien-être', 'Voyage', 'Jeux', 'Autre']

export default function EventForm({ event, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: event?.title || '',
    theme: event?.theme || '',
    description: event?.description || '',
    event_date: event?.event_date ? event.event_date.slice(0, 16) : '',
    location: event?.location || '',
    max_participants: event?.max_participants || 20,
    link: event?.link || '',
    is_active: event?.is_active !== undefined ? event.is_active : 1,
  })
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(event?.photo_path || null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.title || !form.event_date) { setError('Titre et date requis'); return }
    setLoading(true)

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    if (photo) fd.append('photo', photo)

    try {
      if (event) {
        await updateEvent(event.id, fd)
      } else {
        await createEvent(fd)
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-auto" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl border border-slate-200 w-full max-w-lg my-8 shadow-xl">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-semibold text-slate-900">{event ? 'Modifier l\'événement' : 'Nouvel événement'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Photo */}
          <div>
            <label className="label">Photo</label>
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={photoPreview} alt="" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setPhotoPreview(null) }}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full w-7 h-7 flex items-center justify-center shadow-sm text-slate-600 hover:text-red-500 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="w-full h-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors group">
                <svg className="w-6 h-6 text-slate-300 group-hover:text-slate-400 mb-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-slate-400 group-hover:text-slate-500 transition-colors">Cliquer pour ajouter une photo</span>
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            )}
          </div>

          {/* Titre */}
          <div>
            <label className="label">Titre *</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nom de l'activité" autoFocus />
          </div>

          {/* Thème */}
          <div>
            <label className="label">Thème</label>
            <div className="flex flex-wrap gap-2">
              {THEMES.map(t => (
                <button
                  key={t} type="button"
                  onClick={() => setForm(f => ({ ...f, theme: f.theme === t ? '' : t }))}
                  className={`text-xs px-3.5 py-1.5 rounded-full border font-medium transition-colors ${form.theme === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Date et lieu */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date et heure *</label>
              <input className="input" type="datetime-local" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Lieu</label>
              <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Lieu de l'activité" />
            </div>
          </div>

          {/* Places */}
          <div>
            <label className="label">Nombre de places maximum</label>
            <input className="input" type="number" min="1" max="500" value={form.max_participants} onChange={e => setForm(f => ({ ...f, max_participants: parseInt(e.target.value) || 20 }))} />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Décrivez l'activité..."
            />
          </div>

          {/* Lien */}
          <div>
            <label className="label">Lien (optionnel)</label>
            <input className="input" type="url" value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="https://..." />
          </div>

          {/* Visibilité */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Visible sur le site public</p>
              <p className="text-xs text-slate-400 mt-0.5">Les visiteurs pourront voir et s'inscrire à cet événement</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_active: f.is_active ? 0 : 1 }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-slate-900' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Annuler</button>
            <button className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Enregistrement...' : event ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
