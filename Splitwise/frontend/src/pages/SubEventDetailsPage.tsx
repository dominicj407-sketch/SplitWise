

import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Chip, Container, Divider, Grid, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Paper, Stack, Typography, useTheme } from '@mui/material'
import AppHeader from '@components/AppHeader'
import ErrorAlert from '@components/ErrorAlert'
import { PaymentsApi, SharesApi, SubEventsApi, UsersApi } from '@api/index'
import type { ShareResponse, SubEventResponse, UserResponse } from '@api/types'
import { useAuth } from '@context/AuthContext'
import { useNavigate, useParams } from 'react-router-dom'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PendingIcon from '@mui/icons-material/Pending'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'

export default function SubEventDetailsPage() {
  const { user } = useAuth()
  const { subEventId } = useParams()
  const sid = Number(subEventId)
  const nav = useNavigate()
  const theme = useTheme()

  const [subEvent, setSubEvent] = useState<SubEventResponse | null>(null)
  const [shares, setShares] = useState<ShareResponse[]>([])
  const [users, setUsers] = useState<UserResponse[]>([])
  const [error, setError] = useState<any>(null)

  const refresh = () => {
    SubEventsApi.get(sid).then(setSubEvent).catch(setError)
    SharesApi.listBySubEvent(sid).then(setShares).catch(setError)
    UsersApi.list().then(setUsers).catch(setError)
  }

  useEffect(() => { refresh() }, [sid])

  const getUserName = (id: number) => users.find(u => u.id === id)?.name || `User ${id}`

  const markPaid = async (shareId: number) => {
    try { await PaymentsApi.markPaid(shareId); refresh() } catch (e) { setError(e) }
  }

  const confirmPayment = async (shareId: number) => {
    try { await PaymentsApi.confirm(shareId); refresh() } catch (e) { setError(e) }
  }

  if (!subEvent) return <AppHeader />

  return (
    <>
      <AppHeader />
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <ErrorAlert error={error} />
        <Button startIcon={<ArrowBackIcon />} onClick={() => nav(-1)} sx={{ mb: 2 }}>Back</Button>

        <Paper elevation={0} sx={{ p: 3, mb: 3, border: 1, borderColor: 'divider' }}>
          <Typography variant="overline" color="text.secondary">Expense Details</Typography>
          <Typography variant="h4" fontWeight="bold" gutterBottom>{subEvent.description}</Typography>

          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Amount</Typography>
              <Typography variant="h6" color="primary.main">₹{subEvent.totalAmount}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Paid By</Typography>
              <Typography variant="h6">{getUserName(subEvent.payerId)}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Date</Typography>
              <Typography variant="body1">{subEvent.subEventDate ? new Date(subEvent.subEventDate).toLocaleDateString() : 'N/A'}</Typography>
            </Grid>
          </Grid>
        </Paper>

        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Shares & Payments</Typography>
        <Stack spacing={2}>
          {shares.map(share => {
            const isMe = user?.id === share.userId
            const isPayer = user?.id === share.payerId

            return (
              <Card key={share.id} variant="outlined">
                <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2, '&:last-child': { pb: 2 } }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {getUserName(share.userId)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      owes ₹{share.amount}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={2}>
                    {share.status === 'UNPAID' && (
                      <Chip label="Unpaid" color="error" size="small" variant="outlined" />
                    )}
                    {share.status === 'MARKED_AS_PAID' && (
                      <Chip icon={<PendingIcon />} label="Pending Confirmation" color="warning" size="small" variant="outlined" />
                    )}
                    {share.status === 'CONFIRMED' && (
                      <Chip icon={<CheckCircleIcon />} label="Paid" color="success" size="small" variant="outlined" />
                    )}

                    {/* Actions */}
                    {share.status === 'UNPAID' && isMe && (
                      <Button size="small" variant="contained" onClick={() => markPaid(share.id)}>
                        Mark Paid
                      </Button>
                    )}
                    {share.status === 'MARKED_AS_PAID' && isPayer && (
                      <Button size="small" variant="contained" color="success" onClick={() => confirmPayment(share.id)}>
                        Confirm
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            )
          })}
        </Stack>
      </Container>
    </>
  )
}
