

import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Container, Grid, Paper, Stack, Typography, useTheme, Avatar } from '@mui/material'
import AppHeader from '@components/AppHeader'
import ErrorAlert from '@components/ErrorAlert'
import { SettlementsApi, UsersApi } from '@api/index'
import type { GroupPairwise, GroupSettlementSummary, UserResponse } from '@api/types'
import { useNavigate, useParams } from 'react-router-dom'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

export default function SettlementPage() {
  const { groupId } = useParams()
  const gid = Number(groupId)
  const nav = useNavigate()
  const theme = useTheme()

  const [summary, setSummary] = useState<GroupSettlementSummary | null>(null)
  const [pairwise, setPairwise] = useState<GroupPairwise | null>(null)
  const [users, setUsers] = useState<UserResponse[]>([])
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    SettlementsApi.group(gid).then(setSummary).catch(setError)
    SettlementsApi.pairwise(gid).then(setPairwise).catch(setError)
    UsersApi.list().then(setUsers).catch(setError)
  }, [gid])

  const getUserName = (id: number) => users.find(u => u.id === id)?.name || `User ${id}`

  return (
    <>
      <AppHeader />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <ErrorAlert error={error} />
        <Button startIcon={<ArrowBackIcon />} onClick={() => nav(-1)} sx={{ mb: 2 }}>Back</Button>

        <Typography variant="h4" fontWeight="bold" gutterBottom>Group Settlements</Typography>
        <Typography color="text.secondary" paragraph>
          Overview of balances and simplified debts for the group.
        </Typography>

        {/* Net Balances */}
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Net Balances</Typography>
        <Grid container spacing={2}>
          {summary?.balances.map(b => {
            const val = Number(b.netBalance)
            const isPositive = val > 0
            const isZero = val === 0
            return (
              <Grid item xs={12} sm={6} md={4} key={b.userId}>
                <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: isPositive ? 'success.light' : isZero ? 'grey.400' : 'error.light' }}>
                    {isPositive ? <TrendingUpIcon /> : isZero ? '-' : <TrendingDownIcon />}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2">{getUserName(b.userId)}</Typography>
                    <Typography variant="h6" color={isPositive ? 'success.main' : isZero ? 'text.secondary' : 'error.main'}>
                      {isPositive ? '+' : ''}{Number(b.netBalance).toFixed(2)}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            )
          })}
        </Grid>

        {/* Who Owes Whom */}
        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Who Owes Whom</Typography>
        <Stack spacing={2}>
          {pairwise?.owes.length === 0 && (
            <Typography color="text.secondary">No debts found. Everyone is settled up!</Typography>
          )}
          {pairwise?.owes.map((owe, idx) => (
            <Card key={idx} variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box display="flex" flexDirection="column" gap={0.5}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography fontWeight="bold">{getUserName(owe.fromUserId)}</Typography>
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <Typography variant="caption" color="text.secondary">owes</Typography>
                      <ArrowForwardIcon color="action" fontSize="small" />
                    </Box>
                    <Typography fontWeight="bold">{getUserName(owe.toUserId)}</Typography>
                  </Box>
                  {owe.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                      💡 {owe.description}
                    </Typography>
                  )}
                </Box>
                <Typography variant="h6" color="error.main">
                  ₹{Number(owe.amount).toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Container>
    </>
  )
}
