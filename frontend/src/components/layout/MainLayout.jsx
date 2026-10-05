import Sidebar from './Sidebar';

export default function MainLayout({ children }) {
  return (
    <div className="flex bg-cream min-h-screen font-sans text-ink antialiased">
      <Sidebar />
      <main className="ml-[72px] flex-1 p-5 md:p-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}