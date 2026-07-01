

import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Container, Grid, Paper, Stack, Typography, useTheme, Avatar } from '@mui/material'
import AppHeader from '@components/AppHeader'
import ErrorAlert from '@components/ErrorAlert'
import { SettlementsApi, UsersApi, EventsApi } from '@api/index'
import type { WeeklySettlementResponse, UserResponse } from '@api/types'
import { useNavigate, useParams } from 'react-router-dom'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

export default function WeeklySettlementsPage() {
  const { groupId, week, year } = useParams()
  const gid = Number(groupId)
  const w = Number(week)
  const y = Number(year)
  const nav = useNavigate()
  const theme = useTheme()

  const [data, setData] = useState<WeeklySettlementResponse | null>(null)
  const [users, setUsers] = useState<UserResponse[]>([])
  const [weeks, setWeeks] = useState<any[]>([])
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    SettlementsApi.balancesByWeek(gid, w, y).then(setData).catch(setError)
    UsersApi.list().then(setUsers).catch(setError)
    EventsApi.listWeeks(gid).then(setWeeks).catch(setError)
  }, [gid, w, y])

  const getUserName = (id: number) => users.find(u => u.id === id)?.name || `User ${id}`

  // Find current week index (weeks are usually sorted desc or asc, need to check API, assuming desc from recent experience or check)
  // EventsApi.listWeeks usually returns list of {weekNumber, year, ...}
  // Let's assume the order returned by API is what we want to navigate through.
  // Usually "Page 1" is the latest.
  // The user wants "{current week number being displayed}/{total number of weeks}"
  // Wait, "Week 2 / 1" in the screenshot.
  // If the user wants "1/2" where 1 is the index and 2 is total.
  // Let's find the index of current (w, y) in the `weeks` array.

  const currentIndex = weeks.findIndex(wk => wk.weekNumber === w && wk.year === y)
  const totalWeeks = weeks.length

  // Display: (currentIndex + 1) / totalWeeks
  // Navigation: 
  // Prev Arrow (Left): Should go to next item in list (older week?) or previous item?
  // Usually Left = Previous in time (older), Right = Next in time (newer).
  // BUT if the list is [Week 5, Week 4, ...], then Index 0 is Week 5.
  // If I am at Week 5 (Index 0), Left Arrow (Previous Time) -> Week 4 (Index 1).
  // Right Arrow (Next Time) -> Future? (Disabled).
  // Let's assume standard pagination: Left = Previous Page (Index - 1), Right = Next Page (Index + 1).
  // BUT the user said "move to the previous or next week".
  // Let's assume Left Arrow = Go to Older Week, Right Arrow = Go to Newer Week.
  // We need to sort weeks chronologically to make this easy.

  const sortedWeeks = [...weeks].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.weekNumber - b.weekNumber
  })

  const sortedIndex = sortedWeeks.findIndex(wk => wk.weekNumber === w && wk.year === y)

  const handlePrevWeek = () => {
    if (sortedIndex > 0) {
      const prev = sortedWeeks[sortedIndex - 1]
      nav(`/settlements/${gid}/weekly/${prev.weekNumber}/${prev.year}`)
    }
  }

  const handleNextWeek = () => {
    if (sortedIndex < sortedWeeks.length - 1) {
      const next = sortedWeeks[sortedIndex + 1]
      nav(`/settlements/${gid}/weekly/${next.weekNumber}/${next.year}`)
    }
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <ErrorAlert error={error} />
        <Button startIcon={<ArrowBackIcon />} onClick={() => nav(-1)} sx={{ mb: 2 }}>Back</Button>

        <Typography variant="h4" fontWeight="bold" gutterBottom>Weekly Settlements</Typography>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Button onClick={handlePrevWeek} variant="outlined" size="small" disabled={sortedIndex <= 0}>
            <ArrowBackIcon fontSize="small" />
          </Button>
          <Typography variant="h6" color="text.secondary">
            {sortedIndex !== -1 ? `${sortedIndex + 1} / ${totalWeeks}` : `${w} / ${y}`}
          </Typography>
          <Button onClick={handleNextWeek} variant="outlined" size="small" disabled={sortedIndex === -1 || sortedIndex >= sortedWeeks.length - 1}>
            <ArrowForwardIcon fontSize="small" />
          </Button>
        </Box>

        {/* Who Owes Whom */}
        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Who Owes Whom (This Week)</Typography>
        <Stack spacing={2}>
          {(!data?.pairwiseBalances || data.pairwiseBalances.length === 0) && (
            <Typography color="text.secondary">No debts found for this week.</Typography>
          )}
          {data?.pairwiseBalances.map((pb, idx) => (
            <Card key={idx} variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography fontWeight="bold">{pb.user1}</Typography>
                  <Box display="flex" flexDirection="column" alignItems="center">
                    <Typography variant="caption" color="text.secondary">owes</Typography>
                    <ArrowForwardIcon color="action" fontSize="small" />
                  </Box>
                  <Typography fontWeight="bold">{pb.user2}</Typography>
                </Box>
                <Typography variant="h6" color="error.main">
                  ₹{Number(pb.amount).toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {/* My Status */}
        {data && (
          <Box mt={4}>
            <Typography variant="h6" gutterBottom>My Status</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="error.main" gutterBottom>To Pay</Typography>
                  {data.toPay.length === 0 ? <Typography variant="body2" color="text.secondary">Nothing to pay</Typography> : (
                    <Stack spacing={1}>
                      {data.toPay.map((tp, i) => (
                        <Box key={i} display="flex" justifyContent="space-between">
                          <Typography>{tp.toUser}</Typography>
                          <Typography fontWeight="bold">₹{tp.amount}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="success.main" gutterBottom>To Receive</Typography>
                  {data.toReceive.length === 0 ? <Typography variant="body2" color="text.secondary">Nothing to receive</Typography> : (
                    <Stack spacing={1}>
                      {data.toReceive.map((tr, i) => (
                        <Box key={i} display="flex" justifyContent="space-between">
                          <Typography>{tr.fromUser}</Typography>
                          <Typography fontWeight="bold">₹{tr.amount}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Container>
    </>
  )
}
