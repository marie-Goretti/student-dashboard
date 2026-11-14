import Sidebar from './Sidebar';
import GlobalToastNotification from '../common/GlobalToastNotification';

export default function MainLayout({ children }) {
  return (
    <div className="flex bg-cream min-h-screen font-sans text-ink antialiased print:bg-white print:min-h-0">
      <Sidebar />
      <GlobalToastNotification />
      {/* Sur mobile : pleine largeur + padding-top pour le bouton hamburger
          Sur desktop (≥ md) : marge gauche = largeur sidebar */}
      <main className="w-full md:ml-56 flex-1 pt-14 px-4 pb-6 md:pt-4 md:px-5 overflow-x-hidden print:ml-0 print:p-0 print:overflow-visible">
        {children}
      </main>
    </div>
  );
}
