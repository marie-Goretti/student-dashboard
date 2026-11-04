import Sidebar from './Sidebar';

export default function MainLayout({ children }) {
  return (
    <div className="flex bg-cream min-h-screen font-sans text-ink antialiased">
      <Sidebar />
      <main className="ml-[72px] flex-1 p-4 md:px-6 md:py-4 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
