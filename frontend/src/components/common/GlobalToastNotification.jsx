import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, CheckCircle2, X, ArrowRight } from 'lucide-react';
import { consumePendingToast } from '../../utils/notificationService';

export default function GlobalToastNotification() {
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Vérifier si un toast était mis en attente avant navigation
    const pending = consumePendingToast();
    if (pending) {
      setToast(pending);
    }

    // 2. Écouter les déclenchements directs en direct
    const handleDirectToast = (e) => {
      if (e.detail) {
        setToast(e.detail);
      }
    };
    window.addEventListener('edupulse_toast_trigger', handleDirectToast);
    return () => window.removeEventListener('edupulse_toast_trigger', handleDirectToast);
  }, []);

  // Auto-fermeture après 9 secondes
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 9000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const isWarning = toast.type === 'warning' || toast.count > 0;

  return (
    <aside
      aria-label="Notification d'importation"
      className="fixed top-5 right-5 z-[9999] max-w-md w-[calc(100vw-2.5rem)] animate-in slide-in-from-top-3 fade-in duration-300"
    >
      <div
        className={`rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all ${
          isWarning
            ? 'bg-white/95 border-amber-300/80 text-ink shadow-amber-500/10'
            : 'bg-white/95 border-emerald-300/80 text-ink shadow-emerald-500/10'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Icône du toast */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
              isWarning
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {isWarning ? <Users size={18} /> : <CheckCircle2 size={18} />}
          </div>

          {/* Contenu textuel */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="text-xs font-bold text-ink tracking-tight font-sans">
                {toast.title}
              </h4>
              {toast.count > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  +{toast.count} étudiant{toast.count > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <p className="text-[11.5px] text-ink/75 leading-relaxed">
              {toast.message}
            </p>

            {/* Lien d'action optionnel */}
            {toast.link && (
              <div className="mt-2.5 pt-2 border-t border-cream-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setToast(null);
                    navigate(toast.link);
                  }}
                  className="text-xs font-semibold text-navy-700 hover:text-navy-900 flex items-center gap-1.5 transition cursor-pointer hover:underline"
                >
                  <span>{toast.actionLabel || 'Consulter les étudiants'}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Bouton fermeture */}
          <button
            onClick={() => setToast(null)}
            className="w-6 h-6 rounded-lg text-ink/40 hover:text-ink hover:bg-cream-100 flex items-center justify-center transition shrink-0 cursor-pointer"
            title="Fermer la notification"
            aria-label="Fermer la notification"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
