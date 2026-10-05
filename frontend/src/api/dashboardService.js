import axiosClient from './axiosClient';

export const getKpiSummary = async (filters = {}) => {
  const { data } = await axiosClient.get('/dashboard/kpi-summary/', { params: filters });
  return data;
};

export const getRepartitionParNiveau = async (filters = {}) => {
  const { data } = await axiosClient.get('/dashboard/repartition-niveau/', { params: filters });
  return data;
};

export const getRepartitionParModule = async (filters = {}) => {
  const { data } = await axiosClient.get('/dashboard/repartition-module/', { params: filters });
  return data;
};

export const getEvolutionParAnnee = async (filters = {}) => {
  const { data } = await axiosClient.get('/dashboard/evolution-annee/', { params: filters });
  return data;
};

export const getDistributionNotes = async (filters = {}) => {
  const { data } = await axiosClient.get('/dashboard/distribution-notes/', { params: filters });
  return data;
};

export const getStudentDashboard = async (idEtu) => {
  const { data } = await axiosClient.get(`/dashboard/student/${idEtu}/`);
  return data;
};

export const getTopModules = async (filters = {}, limit = 5) => {
  const { data } = await axiosClient.get('/dashboard/top-modules/', {
    params: { ...filters, limit },
  });
  return data;
};

export const getComparaisonFilieres = async (filters = {}) => {
  const { data } = await axiosClient.get('/dashboard/comparaison-filieres/', { params: filters });
  return data;
};

export const getDevoirVsExamen = async (filters = {}) => {
  const { data } = await axiosClient.get('/dashboard/devoir-vs-examen/', { params: filters });
  return data;
};

export const getPointsCles = async (filters = {}) => {
  const { data } = await axiosClient.get('/dashboard/points-cles/', { params: filters });
  return data;
};