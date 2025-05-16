// src/config/api.ts
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://mued-api-0036ad93dbdb.herokuapp.com'
  : 'http://localhost:8000';