import api from './axios';

export const getTasks = (filters = {}) => api.get('/tasks/', { params: filters });
export const createTask = (data) => api.post('/tasks/', data);
export const updateTask = (id, data) => api.put(`/tasks/${id}/`, data);
export const deleteTask = (id) => api.delete(`/tasks/${id}/`);
export const getTaskStats = () => api.get('/tasks/stats/');
export const getActivityLog = () => api.get('/activity-log/');