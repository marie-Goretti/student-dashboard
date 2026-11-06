import Sidebar from './Sidebar';
import GlobalToastNotification from '../common/GlobalToastNotification';

export default function MainLayout({ children }) {
  return (
    <div className="flex bg-cream min-h-screen font-sans text-ink antialiased">
      <Sidebar />
      <GlobalToastNotification />
      <main className="ml-[72px] flex-1 p-4 md:px-6 md:py-4 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
