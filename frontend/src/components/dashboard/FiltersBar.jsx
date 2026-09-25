import { useEffect, useState } from 'react';
import { getNiveaux } from '../../api/studentsService';
import { getModules, getAnnees } from '../../api/academicsService';
import { Filter } from 'lucide-react';

// Libellés lisibles des 10 niveaux officiels, alignés sur la normalisation
// backend (CODE NIVEAU -> 3 premiers caractères -> l'un de ces 10 codes).
// Sert uniquement à l'affichage : la valeur envoyée à l'API reste id_niv.
const NIVEAU_LABELS = {
  B1M: 'B1M — Bachelor 1 Management',
  B1SI: 'B1SI — Bachelor 1 Système d\'Information',
  B2M: 'B2M — Bachelor 2 Management',
  B2SI: 'B2SI — Bachelor 2 Système d\'Information',
  B3M: 'B3M — Bachelor 3 Management',
  B3SI: 'B3SI — Bachelor 3 Système d\'Information',
  M1M: 'M1M — Master 1 Management',
  M1SI: 'M1SI — Master 1 Système d\'Information',
  M2M: 'M2M — Master 2 Management',
  M2SI: 'M2SI — Master 2 Système d\'Information',
};

// Ordre d'affichage souhaité dans le menu déroulant.
const NIVEAU_ORDER = Object.keys(NIVEAU_LABELS);

function formatNiveauLabel(codeNiv) {
  return NIVEAU_LABELS[codeNiv] || codeNiv; // fallback si un code imprévu apparaît
}

export default function FiltersBar({ filters, onChange }) {
  const [niveaux, setNiveaux] = useState([]);
  const [modules, setModules] = useState([]);
  const [annees, setAnnees] = useState([]);

  useEffect(() => {
    getNiveaux().then((data) => {
      const list = data.results ?? data;
      // Trie selon l'ordre officiel des niveaux plutôt que l'ordre alphabétique brut
      const sorted = [...list].sort(
        (a, b) => NIVEAU_ORDER.indexOf(a.code_niv) - NIVEAU_ORDER.indexOf(b.code_niv)
      );
      setNiveaux(sorted);
    });
    getModules().then((data) => setModules(data.results ?? data));
    getAnnees().then((data) => setAnnees(data.results ?? data));
  }, []);

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  const selectClass =
    'border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3 flex-wrap mb-6">
      <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
        <Filter size={16} /> Filtres :
      </div>

      <select
        className={selectClass}
        value={filters.id_niv || ''}
        onChange={(e) => handleChange('id_niv', e.target.value)}
      >
        <option value="">Tous les niveaux</option>
        {niveaux.map((n) => (
          <option key={n.id_niv} value={n.id_niv}>
            {formatNiveauLabel(n.code_niv)}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.id_mod || ''}
        onChange={(e) => handleChange('id_mod', e.target.value)}
      >
        <option value="">Tous les modules</option>
        {modules.map((m) => (
          <option key={m.id_mod} value={m.id_mod}>{m.nom_mod}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.id_annee || ''}
        onChange={(e) => handleChange('id_annee', e.target.value)}
      >
        <option value="">Toutes les années</option>
        {annees.map((a) => (
          <option key={a.id_annee} value={a.id_annee}>{a.annee_academique}</option>
        ))}
      </select>

      {(filters.id_niv || filters.id_mod || filters.id_annee) && (
        <button
          onClick={() => onChange({})}
          className="text-sm text-red-500 hover:underline ml-2"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}