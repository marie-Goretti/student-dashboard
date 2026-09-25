import axiosClient from './axiosClient';

export const getModules = async () => {
  const { data } = await axiosClient.get('/academics/modules/');
  return data;
};

export const getAnnees = async () => {
  const { data } = await axiosClient.get('/academics/annees/');
  return data;
};

export const getEvaluations = async (filters = {}) => {
  const { data } = await axiosClient.get('/academics/evaluations/', { params: filters });
  return data;
};