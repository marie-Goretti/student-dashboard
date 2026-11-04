import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, BellOff, Check, CheckCheck, Trash2, AlertTriangle,
  XCircle, CheckCircle2, TrendingUp, X, ExternalLink
} from 'lucide-react';

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    title: 'Session de rattrapage ouverte',
    message: '14 étudiants éligibles pour les rattrapages en B2SI (Semestre 1).',
    time: 'Il y a 10 min',
    unread: true,
    type: 'warning',
    link: '/rattrapages',
    actionLabel: 'Voir les rattrapages',
  },
  {
    id: 2,
    title: 'Alerte taux d\'échec élevé',
    message: 'Le module Algorithmique & Données (B1SI) enregistre 38% d\'échec.',
    time: 'Il y a 45 min',
    unread: true,
    type: 'danger',
    link: '/recommandations',
    actionLabel: 'Recommandations',
  },
  {
    id: 3,
    title: 'Évaluations synchronisées',
    message: 'Les notes d\'examen pour la cohorte B3M ont été importées avec succès.',
    time: 'Il y a 2 heures',
    unread: true,
    type: 'success',
    link: '/niveaux',
    actionLabel: 'Fiche Promotion',
  },
  {
    id: 4,
    title: 'Progression académique',
    message: 'La moyenne générale de l\'établissement progresse de +0.4 pt cette année.',
    time: 'Hier',
    unread: false,
    type: 'info',
    link: '/',
    actionLabel: 'Vue globale',
  },
];

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('edupulse_notifications');
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Sauvegarder dans localStorage
  useEffect(() => {
    try {
      localStorage.setItem('edupulse_notifications', JSON.stringify(notifications));
    } catch (e) {
      console.error(e);
    }
  }, [notifications]);

  // Fermer quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAsRead = (id, e) => {
    e?.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const deleteNotification = (id, e) => {
    e?.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const resetDefault = () => {
    setNotifications(INITIAL_NOTIFICATIONS);
  };

  const handleNotificationClick = (n) => {
    markAsRead(n.id);
    setIsOpen(false);
    if (n.link) {
      navigate(n.link);
    }
  };

  const displayedNotifications = notifications.filter((n) =>
    filter === 'unread' ? n.unread : true
  );

  const getIcon = (type) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={15} className="text-amber-600" />;
      case 'danger':
        return <XCircle size={15} className="text-maroon-600" />;
      case 'success':
        return <CheckCircle2 size={15} className="text-emerald-600" />;
      case 'info':
      default:
        return <TrendingUp size={15} className="text-navy-600" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'danger':
        return 'bg-rose-50 border-rose-200';
      case 'success':
        return 'bg-emerald-50 border-emerald-200';
      case 'info':
      default:
        return 'bg-navy-50 border-navy-200';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton cloche */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition shadow-xs cursor-pointer ${
          isOpen
            ? 'bg-navy-900 text-white border border-navy-900'
            : 'bg-white border border-cream-200 text-ink/70 hover:bg-cream-100'
        }`}
        title="Notifications"
        aria-label="Ouvrir les notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-maroon-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Menu déroulant */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-cream-200 z-50 overflow-hidden animate-in fade-in duration-150">
          {/* En-tête */}
          <div className="p-4 border-b border-cream-200 bg-cream-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-ink text-sm">Notifications</h3>
              {unreadCount > 0 ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-maroon-100 text-maroon-700">
                  {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cream-200 text-ink/60">
                  À jour
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-semibold text-navy-700 hover:text-navy-900 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white transition cursor-pointer"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck size={13} />
                  Tout marquer lu
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg text-ink/40 hover:text-ink hover:bg-white flex items-center justify-center transition cursor-pointer"
                title="Fermer"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Onglets Filtres : Toutes / Non lues */}
          <div className="px-4 py-2 border-b border-cream-100 flex items-center gap-3 bg-white text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`font-semibold pb-1 border-b-2 transition cursor-pointer ${
                filter === 'all'
                  ? 'border-navy-800 text-navy-800'
                  : 'border-transparent text-ink/40 hover:text-ink/70'
              }`}
            >
              Toutes ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`font-semibold pb-1 border-b-2 transition cursor-pointer ${
                filter === 'unread'
                  ? 'border-navy-800 text-navy-800'
                  : 'border-transparent text-ink/40 hover:text-ink/70'
              }`}
            >
              Non lues ({unreadCount})
            </button>
          </div>

          {/* Liste des notifications */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-cream-100">
            {displayedNotifications.length === 0 ? (
              <div className="p-8 text-center text-ink/40 text-xs flex flex-col items-center justify-center gap-2">
                <BellOff size={28} className="text-ink/20" />
                <p className="font-medium">
                  {filter === 'unread'
                    ? 'Aucune notification non lue.'
                    : 'Aucune notification pour le moment.'}
                </p>
                {notifications.length === 0 && (
                  <button
                    onClick={resetDefault}
                    className="mt-2 text-[11px] font-semibold text-navy-700 hover:underline cursor-pointer"
                  >
                    Restaurer les notifications types
                  </button>
                )}
              </div>
            ) : (
              displayedNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 flex items-start gap-3 transition cursor-pointer group ${
                    n.unread
                      ? 'bg-cream-50/70 hover:bg-cream-100/70'
                      : 'bg-white hover:bg-cream-50/50'
                  }`}
                >
                  {/* Icône du type */}
                  <div
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${getBgColor(
                      n.type
                    )}`}
                  >
                    {getIcon(n.type)}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className={`text-xs ${n.unread ? 'font-bold text-ink' : 'font-semibold text-ink/80'} truncate`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-ink/40 shrink-0 font-normal">
                        {n.time}
                      </span>
                    </div>

                    <p className="text-[11px] text-ink/60 line-clamp-2 leading-relaxed mb-2">
                      {n.message}
                    </p>

                    <div className="flex items-center justify-between">
                      {n.actionLabel && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy-700 group-hover:text-navy-900 group-hover:underline">
                          {n.actionLabel}
                          <ExternalLink size={11} />
                        </span>
                      )}

                      <div className="flex items-center gap-1.5 ml-auto">
                        {n.unread && (
                          <button
                            onClick={(e) => markAsRead(n.id, e)}
                            className="p-1 text-ink/40 hover:text-navy-700 rounded transition cursor-pointer"
                            title="Marquer comme lu"
                          >
                            <Check size={13} />
                          </button>
                        )}
                        <button
                          onClick={(e) => deleteNotification(n.id, e)}
                          className="p-1 text-ink/40 hover:text-maroon-600 rounded transition cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Point non lu */}
                  {n.unread && (
                    <span className="w-2 h-2 rounded-full bg-maroon-500 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pied du menu */}
          {notifications.length > 0 && (
            <div className="p-2.5 border-t border-cream-200 bg-cream-50/50 flex items-center justify-between text-[11px]">
              <button
                onClick={clearAll}
                className="text-ink/40 hover:text-maroon-600 transition font-medium cursor-pointer px-2 py-1 rounded"
              >
                Tout effacer
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/recommandations');
                }}
                className="text-navy-700 hover:text-navy-900 font-bold transition cursor-pointer px-2 py-1 rounded"
              >
                Centre de recommandations →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
