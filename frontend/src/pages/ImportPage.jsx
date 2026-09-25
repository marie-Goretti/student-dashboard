import MainLayout from '../components/layout/MainLayout';
import UploadCard from '../components/upload/UploadCard';
import { importStudents, importGrades } from '../api/etlService';
import { AlertTriangle } from 'lucide-react';

export default function ImportPage() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import de fichiers</h1>
        <p className="text-gray-500 text-sm">
          Importe d'abord le fichier étudiants, puis le fichier de notes.
        </p>
      </div>

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg p-3 mb-6">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <p>
          L'ordre est important : le fichier de notes référence les étudiants par matricule.
          Si un étudiant n'existe pas encore, sa ligne sera rejetée avec une erreur explicite.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UploadCard
          title="1. Fichier Master Étudiants"
          description="Colonnes attendues : matricule, nom, prenom, date_naissance, mail, annee_souscription"
          onUpload={importStudents}
        />
        <UploadCard
          title="2. Fichier Suivi des Notes"
          description="Colonnes attendues : matricule, code_niv, code_mod, nom_mod, semestre, annee_academique, note_devoir1-4, note_examen, note_rattrapage"
          onUpload={importGrades}
          accentColor="green"
        />
      </div>
    </MainLayout>
  );
}