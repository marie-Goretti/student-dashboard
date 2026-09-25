import { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function UploadCard({ title, description, onUpload, accentColor = 'primary' }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const colorMap = {
    primary: 'border-primary-300 bg-primary-50 text-primary-600',
    green: 'border-green-300 bg-green-50 text-green-600',
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      setError('Seuls les fichiers .xlsx ou .xls sont acceptés.');
      return;
    }
    setError(null);
    setReport(null);
    setFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const result = await onUpload(file);
      setReport(result);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Une erreur est survenue lors de l'import."
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setReport(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>

      {/* --- Zone de drop --- */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
          dragOver ? colorMap[accentColor] : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files[0])}
        />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileSpreadsheet className="text-primary-600" size={32} />
            <p className="text-sm font-medium text-gray-700">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} Ko</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <UploadCloud size={32} />
            <p className="text-sm">Glisse ton fichier ici ou clique pour parcourir</p>
            <p className="text-xs">.xlsx, .xls</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm mt-3">
          <XCircle size={16} /> {error}
        </div>
      )}

      {/* --- Actions --- */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSubmit}
          disabled={!file || loading}
          className="flex-1 bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
          {loading ? 'Import en cours...' : 'Importer'}
        </button>
        {(file || report) && (
          <button
            onClick={reset}
            className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* --- Rapport d'import --- */}
      {report && (
        <div className="mt-5 border-t pt-4">
          <div className="flex items-center gap-2 text-green-600 mb-3">
            <CheckCircle2 size={18} />
            <span className="font-medium text-sm">Import terminé</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <div className="bg-gray-50 rounded-lg py-2">
              <p className="text-lg font-bold text-gray-800">{report.total}</p>
              <p className="text-xs text-gray-500">Lignes traitées</p>
            </div>
            <div className="bg-green-50 rounded-lg py-2">
              <p className="text-lg font-bold text-green-600">{report.created}</p>
              <p className="text-xs text-gray-500">Créées</p>
            </div>
            <div className="bg-blue-50 rounded-lg py-2">
              <p className="text-lg font-bold text-blue-600">{report.updated}</p>
              <p className="text-xs text-gray-500">Mises à jour</p>
            </div>
          </div>

          {report.errors?.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-red-600 mb-2">
                {report.errors.length} erreur(s) :
              </p>
              <ul className="space-y-1">
                {report.errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-500">
                    Ligne {err.ligne} ({err.matricule}) — {err.erreur}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}