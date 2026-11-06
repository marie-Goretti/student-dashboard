import axiosClient from './axiosClient';
import { notifyNewStudentsImport } from '../utils/notificationService';

export const importStudents = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axiosClient.post('/etl/import-students/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const importGrades = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axiosClient.post('/etl/import-grades/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  const report = data?.report || data;
  const count = report?.etudiants_auto_crees || data?.notification?.count || 0;
  if (count > 0) {
    notifyNewStudentsImport({
      count,
      filename: file?.name,
      students: report?.nouveaux_etudiants || data?.notification?.students || [],
    });
  }

  return data;
};

export const analyzeFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axiosClient.post('/etl/analyze/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const importAuto = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await axiosClient.post('/etl/import-auto/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  const report = data?.report || data;
  const count = report?.etudiants_auto_crees || data?.notification?.count || 0;
  if (count > 0) {
    notifyNewStudentsImport({
      count,
      filename: file?.name,
      students: report?.nouveaux_etudiants || data?.notification?.students || [],
    });
  }

  return data;
};
