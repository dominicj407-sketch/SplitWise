import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://localhost:8080/api',
})

api.interceptors.request.use(config => {
  const raw = localStorage.getItem('auth_token')
  if (raw) {
    const headers: any = config.headers ? (config.headers as any) : {}
    headers['Authorization'] = `Bearer ${raw}`
    config.headers = headers
  }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    }
    return Promise.reject(err)
  }
)
