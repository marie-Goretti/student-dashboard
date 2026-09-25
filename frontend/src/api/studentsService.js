import axiosClient from './axiosClient';

export const getNiveaux = async () => {
  const { data } = await axiosClient.get('/students/niveaux/');
  return data;
};

export const getEtudiants = async (params = {}) => {
  const { data } = await axiosClient.get('/students/etudiants/', { params });
  return data;
};