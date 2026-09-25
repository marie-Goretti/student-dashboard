import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

export default function LineChartCard({ title, data }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
      {data?.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="annee" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="moyenne" name="Moyenne générale" stroke="#2563eb" strokeWidth={2} />
            <Line type="monotone" dataKey="taux_reussite" name="Taux de réussite (%)" stroke="#16a34a" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-gray-400 text-sm text-center py-16">Aucune donnée disponible</p>
      )}
    </div>
  );
}