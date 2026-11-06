/**
 * Service centralisé de gestion des notifications EduPulse.
 * Gère l'ajout, la persistance dans localStorage et la synchronisation en temps réel via événements.
 */

const NOTIFICATIONS_STORAGE_KEY = 'edupulse_notifications';
const PENDING_TOAST_KEY = 'edupulse_pending_toast';

/**
 * Récupère les notifications stockées.
 */
export function getStoredNotifications() {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Erreur lecture notifications:', err);
    return [];
  }
}

/**
 * Ajoute une notification en tête de liste et déclenche l'événement de mise à jour.
 */
export function addNotification(notification) {
  if (!notification) return null;

  try {
    const current = getStoredNotifications();
    const notifId = notification.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    // Si la notification existe déjà (même ID), ne pas la dupliquer
    const alreadyExists = current.some((n) => n.id === notifId);
    if (alreadyExists) {
      return current.find((n) => n.id === notifId);
    }

    const newNotif = {
      id: notifId,
      title: notification.title || 'Notification EduPulse',
      message: notification.message || '',
      time: notification.time || 'À l\'instant',
      unread: true,
      type: notification.type || 'info', // 'warning' | 'danger' | 'success' | 'info'
      link: notification.link || '/students',
      actionLabel: notification.actionLabel || 'Voir les détails',
      created_at: notification.created_at || new Date().toISOString(),
      ...notification,
    };

    const updated = [newNotif, ...current];
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));

    // Émettre un événement pour mise à jour réactive immédiate de NotificationsDropdown
    window.dispatchEvent(
      new CustomEvent('edupulse_notification_added', { detail: newNotif })
    );

    return newNotif;
  } catch (err) {
    console.error('Erreur ajout notification:', err);
    return null;
  }
}

/**
 * Sauvegarde un toast en attente pour affichage lors de la navigation vers la page cible.
 */
export function savePendingToast(toastData) {
  try {
    sessionStorage.setItem(PENDING_TOAST_KEY, JSON.stringify(toastData));
    window.dispatchEvent(
      new CustomEvent('edupulse_toast_trigger', { detail: toastData })
    );
  } catch (err) {
    console.error('Erreur sauvegarde toast:', err);
  }
}

/**
 * Récupère et retire le toast en attente.
 */
export function consumePendingToast() {
  try {
    const raw = sessionStorage.getItem(PENDING_TOAST_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_TOAST_KEY);
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erreur lecture toast:', err);
    return null;
  }
}

/**
 * Notification spécifique lorsqu'un import de fichier suivi de notes détecte de nouveaux étudiants.
 */
export function notifyNewStudentsImport({ count, filename, students = [] }) {
  if (!count || count <= 0) return null;

  const plural = count > 1;
  const title = plural ? `${count} nouveaux étudiants détectés` : '1 nouvel étudiant détecté';
  const fileLabel = filename ? ` (${filename})` : '';
  const message = `${count} nouvel${plural ? 's' : ''} étudiant${plural ? 's' : ''} non répertorié${plural ? 's' : ''} dans la base de données ont été détecté${plural ? 's' : ''} et automatiquement enregistré${plural ? 's' : ''} lors de l'import du fichier de suivi des notes${fileLabel}.`;

  const notifId = `notif-new-students-${filename || 'import'}-${count}-${Math.floor(Date.now() / 30000)}`;

  const notif = addNotification({
    id: notifId,
    title,
    message,
    type: 'warning',
    link: '/students',
    actionLabel: 'Consulter la liste des étudiants',
    count,
    students: students.slice(0, 20),
  });

  savePendingToast({
    id: notifId,
    type: 'warning',
    title,
    message,
    count,
    link: '/students',
    actionLabel: 'Voir les étudiants',
  });

  return notif;
}
