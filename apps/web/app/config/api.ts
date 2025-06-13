// src/config/api.ts
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://mued-api-0036ad93dbdb.herokuapp.com'
  : 'http://localhost:8000';