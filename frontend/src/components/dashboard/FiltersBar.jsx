import { useEffect, useState } from 'react';
import { getNiveaux } from '../../api/studentsService';
import { getModules, getAnnees } from '../../api/academicsService';
import { RotateCcw } from 'lucide-react';

const NIVEAU_LABELS = {
  B1M: 'B1M',
  B1SI: 'B1SI',
  B2M: 'B2M',
  B2SI: 'B2SI',
  B3M: 'B3M',
  B3SI: 'B3SI',
  M1M: 'M1M',
  M1SI: 'M1SI',
  M2M: 'M2M',
  M2SI: 'M2SI',
};

const NIVEAU_ORDER = Object.keys(NIVEAU_LABELS);

export default function FiltersBar({ filters, onChange }) {
  const [niveaux, setNiveaux] = useState([]);
  const [modules, setModules] = useState([]);
  const [annees, setAnnees] = useState([]);

  useEffect(() => {
    getNiveaux().then((data) => {
      const list = data.results ?? data;
      const sorted = [...list]
        .filter((n) => NIVEAU_ORDER.includes(n.code_niv))
        .sort((a, b) => NIVEAU_ORDER.indexOf(a.code_niv) - NIVEAU_ORDER.indexOf(b.code_niv));
      setNiveaux(sorted);
    });

    getModules().then((data) => {
      const list = data.results ?? data;
      setModules(list);
    });

    getAnnees().then((data) => {
      const list = (data.results ?? data).filter((a) => a.annee_academique && a.annee_academique !== 'nan');
      setAnnees(list);
    });
  }, []);

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== '');

  const selectContainerClass =
    'flex items-center gap-1.5 bg-white border border-cream-200 rounded-xl px-3 py-1.5 shadow-xs text-xs';
  const labelClass = 'text-ink/50 font-medium whitespace-nowrap';
  const selectClass = 'bg-transparent text-ink font-semibold outline-none cursor-pointer text-xs';

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-xs p-3.5 flex items-center justify-between gap-3 flex-wrap mb-6">
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Année */}
        <div className={selectContainerClass}>
          <span className={labelClass}>Année</span>
          <select
            className={selectClass}
            value={filters.id_annee || ''}
            onChange={(e) => handleChange('id_annee', e.target.value)}
          >
            <option value="">2024–2025</option>
            {annees.map((a) => (
              <option key={a.id_annee} value={a.id_annee}>
                {a.annee_academique}
              </option>
            ))}
          </select>
        </div>

        {/* Programme / Filière */}
        <div className={selectContainerClass}>
          <span className={labelClass}>Programme</span>
          <select
            className={selectClass}
            value={filters.filiere || ''}
            onChange={(e) => handleChange('filiere', e.target.value)}
          >
            <option value="">Tous</option>
            <option value="management">Management</option>
            <option value="si">Système d'Information</option>
          </select>
        </div>

        {/* Niveau */}
        <div className={selectContainerClass}>
          <span className={labelClass}>Niveau</span>
          <select
            className={selectClass}
            value={filters.id_niv || ''}
            onChange={(e) => handleChange('id_niv', e.target.value)}
          >
            <option value="">Tous</option>
            {niveaux.map((n) => (
              <option key={n.id_niv} value={n.id_niv}>
                {n.code_niv}
              </option>
            ))}
          </select>
        </div>

        {/* Semestre */}
        <div className={selectContainerClass}>
          <span className={labelClass}>Semestre</span>
          <select
            className={selectClass}
            value={filters.semestre || ''}
            onChange={(e) => handleChange('semestre', e.target.value)}
          >
            <option value="">Tous</option>
            <option value="S1">Semestre 1</option>
            <option value="S2">Semestre 2</option>
          </select>
        </div>

        {/* Module */}
        <div className={selectContainerClass}>
          <span className={labelClass}>Module</span>
          <select
            className={`${selectClass} max-w-[140px] truncate`}
            value={filters.id_mod || ''}
            onChange={(e) => handleChange('id_mod', e.target.value)}
          >
            <option value="">Tous</option>
            {modules.map((m) => (
              <option key={m.id_mod} value={m.id_mod}>
                {m.nom_mod}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bouton Réinitialiser */}
      <button
        onClick={() => onChange({})}
        disabled={!hasActiveFilters}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
          hasActiveFilters
            ? 'text-maroon-500 hover:bg-maroon-50 cursor-pointer'
            : 'text-ink/30 cursor-not-allowed opacity-60'
        }`}
      >
        <RotateCcw size={13} />
        Réinitialiser
      </button>
    </div>
  );
}