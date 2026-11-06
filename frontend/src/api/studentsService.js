import axiosClient from './axiosClient';

let niveauxCache = null;

export const clearStudentsCache = () => {
  niveauxCache = null;
};

export const getNiveaux = async (force = false) => {
  if (niveauxCache && !force) return niveauxCache;
  const { data } = await axiosClient.get('/students/niveaux/');
  niveauxCache = data;
  return data;
};

export const getEtudiants = async (params = {}) => {
  const { data } = await axiosClient.get('/students/etudiants/', { params });
  return data;
};
