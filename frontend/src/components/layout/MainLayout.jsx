import Sidebar from './Sidebar';
import GlobalToastNotification from '../common/GlobalToastNotification';

export default function MainLayout({ children }) {
  return (
    <div className="flex bg-cream min-h-screen font-sans text-ink antialiased print:bg-white print:min-h-0">
      <Sidebar />
      <GlobalToastNotification />
      <main className="ml-[72px] flex-1 p-4 md:px-6 md:py-4 overflow-x-hidden print:ml-0 print:p-0 print:overflow-visible">
        {children}
      </main>
    </div>
  );
}
