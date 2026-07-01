import { useState } from 'react'
import { Box, Button, Container, Paper, TextField, Typography, Stack, Alert } from '@mui/material'
import { useAuth } from '@context/AuthContext'
import { AuthApi, UsersApi } from '@api/index'
import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const { setUser } = useAuth()
  const nav = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      if (isLogin) {
        const res = await AuthApi.login({ email, password })
        localStorage.setItem('auth_token', res.token)
        setUser(res.user)
        nav('/groups')
      } else {
        await UsersApi.create({ name, email, password })
        setIsLogin(true)
        setError({ message: 'Account created! Please login.' })
      }
    } catch (err: any) {
      setError(err)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" textAlign="center" gutterBottom fontWeight="bold" color="primary">
          SmartSplit
        </Typography>
        <Typography variant="subtitle1" textAlign="center" color="text.secondary" mb={4}>
          {isLogin ? 'Welcome back!' : 'Create an account'}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message || 'An error occurred'}</Alert>}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {!isLogin && (
              <TextField
                label="Name"
                fullWidth
                value={name}
                onChange={e => setName(e.target.value)}
                required={!isLogin}
              />
            )}
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="contained" size="large" fullWidth>
              {isLogin ? 'Login' : 'Sign Up'}
            </Button>
          </Stack>
        </form>

        <Box mt={2} textAlign="center">
          <Button onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}
