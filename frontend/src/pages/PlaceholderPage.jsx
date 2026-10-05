import MainLayout from '../components/layout/MainLayout';
import HeaderBar from '../components/layout/HeaderBar';

export default function PlaceholderPage({ title, description }) {
  return (
    <MainLayout>
      <HeaderBar currentAnnee="2024-2025" />
      <div className="bg-white rounded-2xl border border-cream-200 p-8 shadow-xs flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-12 h-12 rounded-2xl bg-cream-100 flex items-center justify-center text-ink/40 mb-4 font-serif text-lg font-bold">
          EP
        </div>
        <h2 className="text-xl font-bold text-ink mb-2">{title}</h2>
        <p className="text-sm text-ink/50 max-w-md">
          {description || 'Cette section sera configurée selon vos spécifications.'}
        </p>
      </div>
    </MainLayout>
  );
}
