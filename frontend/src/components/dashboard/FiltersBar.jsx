import { useEffect, useState } from 'react';
import { getNiveaux } from '../../api/studentsService';
import { getModules, getAnnees } from '../../api/academicsService';
import { RotateCcw } from 'lucide-react';

const NIVEAU_LABELS = {
  B1M: 'B1M', B1SI: 'B1SI',
  B2M: 'B2M', B2SI: 'B2SI',
  B3M: 'B3M', B3SI: 'B3SI',
  M1M: 'M1M', M1SI: 'M1SI',
  M2M: 'M2M', M2SI: 'M2SI',
};
const NIVEAU_ORDER = Object.keys(NIVEAU_LABELS);

export default function FiltersBar({
  filters,
  onChange,
  showAnnee = true,
  showProgramme = true,
  showNiveau = true,
  showSemestre = true,
  showModule = true,
  defaultLatestAnnee = false,
}) {
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
      const list = (data.results ?? data)
        .filter((a) => a.annee_academique && a.annee_academique !== 'nan' && a.annee_academique !== 'None')
        .sort((a, b) => String(b.annee_academique).localeCompare(String(a.annee_academique)));
      setAnnees(list);
      if (defaultLatestAnnee && list.length > 0 && filters.id_annee === undefined) {
        onChange({ ...filters, id_annee: list[0].id_annee });
      }
    });
  }, []);

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  const latestAnneeId = annees[0]?.id_annee;
  const hasActiveFilters = defaultLatestAnnee
    ? Boolean(
        filters.id_niv ||
        filters.filiere ||
        filters.semestre ||
        filters.id_mod ||
        (latestAnneeId !== undefined && filters.id_annee !== undefined && String(filters.id_annee) !== String(latestAnneeId))
      )
    : Object.values(filters).some((v) => v !== undefined && v !== '');

  const pill = 'flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-xs shrink-0';
  const lbl  = 'text-ink/40 font-medium whitespace-nowrap';
  const sel  = 'bg-transparent text-ink/70 font-medium outline-none cursor-pointer text-xs';

  return (
    <div className="print:hidden bg-white rounded-xl border border-gray-100 p-3 mb-4">
      <div className="flex items-center gap-2">
        {/* Filtres avec scroll horizontal invisible sur mobile */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-1 pb-0.5">

          {showAnnee && (
            <div className={pill}>
              <span className={lbl}>Ann</span>
              <select className={sel} value={filters.id_annee || ''} onChange={(e) => handleChange('id_annee', e.target.value)}>
                <option value="">Toutes</option>
                {annees.map((a) => (
                  <option key={a.id_annee} value={a.id_annee}>{a.annee_academique}</option>
                ))}
              </select>
            </div>
          )}

          {showProgramme && (
            <div className={pill}>
              <span className={lbl}>Prog.</span>
              <select className={sel} value={filters.filiere || ''} onChange={(e) => handleChange('filiere', e.target.value)}>
                <option value="">Tous</option>
                <option value="management">Management</option>
                <option value="si">SI</option>
              </select>
            </div>
          )}

          {showNiveau && (
            <div className={pill}>
              <span className={lbl}>Niv.</span>
              <select className={sel} value={filters.id_niv || ''} onChange={(e) => handleChange('id_niv', e.target.value)}>
                <option value="">Tous</option>
                {niveaux.map((n) => (
                  <option key={n.id_niv} value={n.id_niv}>{n.code_niv}</option>
                ))}
              </select>
            </div>
          )}

          {showSemestre && (
            <div className={pill}>
              <span className={lbl}>Sem.</span>
              <select
                className={sel}
                value={filters.semestre === 'S1' ? '1' : filters.semestre === 'S2' ? '2' : (filters.semestre || '')}
                onChange={(e) => handleChange('semestre', e.target.value)}
              >
                <option value="">Tous</option>
                <option value="1">S1</option>
                <option value="2">S2</option>
              </select>
            </div>
          )}
        </div>

        {/* Reset */}
        <button
          onClick={() => onChange(defaultLatestAnnee && latestAnneeId !== undefined ? { id_annee: latestAnneeId } : {})}
          disabled={!hasActiveFilters}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
            hasActiveFilters
              ? 'text-maroon-500 hover:bg-maroon-50 cursor-pointer'
              : 'text-ink/30 cursor-not-allowed opacity-50'
          }`}
        >
          <RotateCcw size={13} />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </div>
  );
}
