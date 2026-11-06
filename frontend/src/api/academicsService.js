import axiosClient from './axiosClient';

let modulesCache = null;
let anneesCache = null;

export const clearAcademicsCache = () => {
  modulesCache = null;
  anneesCache = null;
};

export const getModules = async (force = false) => {
  if (modulesCache && !force) return modulesCache;
  const { data } = await axiosClient.get('/academics/modules/');
  modulesCache = data;
  return data;
};

export const getAnnees = async (force = false) => {
  if (anneesCache && !force) return anneesCache;
  const { data } = await axiosClient.get('/academics/annees/');
  anneesCache = data;
  return data;
};

export const getEvaluations = async (filters = {}) => {
  const { data } = await axiosClient.get('/academics/evaluations/', { params: filters });
  return data;
};
