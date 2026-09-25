import Sidebar from './Sidebar';
import TopBanner from './TopBanner';

export default function MainLayout({ children, heroContent }) {
  return (
    <div className="flex bg-cream min-h-screen">
      <Sidebar />
      <main className="ml-20 flex-1 p-6 md:p-8">
        <TopBanner>{heroContent}</TopBanner>
        {children}
      </main>
    </div>
  );
}