import MainLayout from '../components/layout/MainLayout';
import StudentSearchBar from '../components/students/StudentSearchBar';
import { UserSearch } from 'lucide-react';

export default function StudentsSearchPage() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fiche Étudiant</h1>
        <p className="text-gray-500 text-sm">
          Recherche un étudiant pour consulter son relevé de notes et ses performances.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-10 flex flex-col items-center gap-4">
        <div className="p-4 bg-primary-50 rounded-full text-primary-600">
          <UserSearch size={32} />
        </div>
        <StudentSearchBar autoFocus />
        <p className="text-xs text-gray-400">
          Tape au moins 2 caractères (nom, prénom ou matricule) pour lancer la recherche.
        </p>
      </div>
    </MainLayout>
  );
}