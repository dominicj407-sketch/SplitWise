import { Alert } from '@mui/material'

export default function ErrorAlert({ error }: { error: any }) {
  if (!error) return null
  const message = typeof error === 'string' ? error : error?.response?.data?.message || error?.message || 'Error'
  return <Alert severity="error">{message}</Alert>
}
