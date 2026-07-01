import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardActionArea, CardActions, CardContent, Container, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, MenuItem, Paper, Stack, TextField, Typography, useTheme, Chip, Tooltip } from '@mui/material'
import AppHeader from '@components/AppHeader'
import ErrorAlert from '@components/ErrorAlert'
import { EventsApi, GroupsApi, SubEventsApi, UsersApi, SettlementsApi } from '@api/index'
import type { EventResponse, GroupResponse, SubEventResponse, UserResponse, PairwiseBalance } from '@api/types'
import { useAuth } from '@context/AuthContext'
import { Link as RouterLink, useParams, useNavigate } from 'react-router-dom'
import { formatMoney } from '@utils/format'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'

import DeleteIcon from '@mui/icons-material/Delete'

export default function EventDashboard() {
  const { user } = useAuth()
  const { eventId } = useParams()
  const eid = Number(eventId)
  const theme = useTheme()
  const nav = useNavigate()

  const [event, setEvent] = useState<EventResponse | null>(null)
  const [group, setGroup] = useState<GroupResponse | null>(null)
  const [users, setUsers] = useState<UserResponse[]>([])
  const [subs, setSubs] = useState<SubEventResponse[]>([])
  const [pairwise, setPairwise] = useState<PairwiseBalance[]>([])
  const [mySpend, setMySpend] = useState<string>('0')
  const [error, setError] = useState<any>(null)

  const [createOpen, setCreateOpen] = useState(false)

  const [description, setDescription] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [subEventDate, setSubEventDate] = useState('')
  const payerId = user?.id
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [equalSplit, setEqualSplit] = useState(false)
  const [customShares, setCustomShares] = useState<Record<number, string>>({})

  const refresh = async () => {
    const e = await EventsApi.get(eid)
    setEvent(e)
    setSubs(await SubEventsApi.listByEvent(eid))
    const g = await GroupsApi.get(e.groupId)
    setGroup(g)
    const us = await UsersApi.list()
    setUsers(us)
    try {
      const ev = await SettlementsApi.eventPairwise(eid)
      setPairwise(ev.pairwiseBalances || [])
    } catch { }
    try {
      const sp = await SettlementsApi.mySpendEvent(eid)
      setMySpend(String(sp.amount ?? '0'))
    } catch { }
  }

  useEffect(() => { refresh().catch(setError) }, [eid])

  useEffect(() => {
    const tid = setInterval(async () => {
      try {
        const ev = await SettlementsApi.eventPairwise(eid)
        setPairwise(ev.pairwiseBalances || [])
      } catch { }
    }, 10000)
    return () => clearInterval(tid)
  }, [eid])

  const members = useMemo(() => users.filter(u => (group?.memberIds || []).includes(u.id || -1)), [users, group?.memberIds])

  const customSum = useMemo(() => {
    if (equalSplit) return 0
    return (selectedMembers || []).reduce((acc, uid) => acc + Number(customShares[uid] || 0), 0)
  }, [equalSplit, selectedMembers, customShares])

  const totalNum = useMemo(() => Number(totalAmount || 0), [totalAmount])
  const splitMismatch = useMemo(() => {
    if (equalSplit) return false
    if (!totalAmount) return false
    if ((selectedMembers || []).length === 0) return false
    return Math.abs(customSum - totalNum) > 0.01
  }, [equalSplit, totalAmount, selectedMembers, customSum, totalNum])

  const createSubevent = async () => {
    setError(null)
    const shares = (equalSplit ? selectedMembers : Object.keys(customShares).map(Number))
      .map(uid => ({ userId: uid, amount: String(equalSplit ? Number(totalAmount || 0) / (selectedMembers.length || 1) : Number(customShares[uid] || 0)) }))

    if (!equalSplit) {
      const total = Number(totalAmount || 0)
      const sum = shares.reduce((acc, s) => acc + Number(s.amount || 0), 0)
      if (Math.abs(sum - total) > 0.01) {
        setError({ message: 'Share splits must sum to total amount' })
        return
      }
    }
    await SubEventsApi.create({ eventId: eid, description, totalAmount, payerId: payerId as number, subEventDate, shares })
    setDescription('')
    setTotalAmount('')
    setSubEventDate('')
    setSelectedMembers([])
    setCustomShares({})
    setEqualSplit(false)
    setCreateOpen(false)
    refresh()
  }

  const deleteEvent = async () => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return
    try {
      await EventsApi.deleteEvent(eid)
      nav(`/groups/${event?.groupId}`)
    } catch (e) { setError(e) }
  }

  if (!event) return <AppHeader />

  return (
    <>
      <AppHeader />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => nav(`/groups/${event.groupId}`)} sx={{ mb: 2 }}>
          Back to Group
        </Button>
        <ErrorAlert error={error} />

        <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>{event.name}</Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {event.startDate && new Date(event.startDate).toLocaleDateString()} - {event.endDate && new Date(event.endDate).toLocaleDateString()}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Your total spend: <Box component="span" fontWeight="bold" color="primary.main">{formatMoney(mySpend)}</Box>
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              {user && event && user.id === event.creatorId && (
                <Tooltip title={subs.length > 0 ? "Cannot delete event with existing expenses. Please delete all expenses first." : ""}>
                  <span>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={deleteEvent}
                      disabled={subs.length > 0}
                    >
                      Delete
                    </Button>
                  </span>
                </Tooltip>
              )}
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
                Add Expense
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>Expenses</Typography>
            <Stack spacing={2}>
              {subs.map(s => (
                <Card key={s.id} variant="outlined" sx={{
                  transition: '0.2s',
                  '&:hover': { borderColor: theme.palette.primary.main, boxShadow: theme.shadows[2] }
                }}>
                  <CardActionArea onClick={() => nav(`/subevents/${s.id}`)}>
                    <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">{s.description}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {s.subEventDate ? new Date(s.subEventDate).toLocaleDateString() : 'No Date'}
                        </Typography>
                      </Box>
                      <Typography variant="h6" color="primary.main">{formatMoney(s.totalAmount)}</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
              {subs.length === 0 && (
                <Typography color="text.secondary">No expenses yet. Add one to get started.</Typography>
              )}
            </Stack>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Settlements</Typography>
                {event?.weekNumber && event?.year && (
                  <IconButton component={RouterLink} to={`/settlements/${event.groupId}/weekly/${event.weekNumber}/${event.year}`} size="small">
                    <ReceiptLongIcon />
                  </IconButton>
                )}
              </Stack>
              <Stack spacing={1}>
                {pairwise.map((p, idx) => (
                  <Box key={`evpw-${idx}`} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="body2">
                      <Box component="span" fontWeight="bold">{p.user1}</Box> owes <Box component="span" fontWeight="bold">{p.user2}</Box>
                    </Typography>
                    <Typography variant="subtitle2" color="error.main">{formatMoney(p.amount)}</Typography>
                  </Box>
                ))}
                {pairwise.length === 0 && (
                  <Typography variant="body2" color="text.secondary">All settled up!</Typography>
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Add Expense Dialog */}
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Description" value={description} onChange={e => setDescription(e.target.value)} fullWidth />
              <TextField label="Total Amount" type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} fullWidth />
              <TextField
                label="Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={subEventDate}
                onChange={e => setSubEventDate(e.target.value)}
                inputProps={{ min: event.startDate, max: event.endDate }}
                helperText={`Must be between ${new Date(event.startDate).toLocaleDateString()} and ${new Date(event.endDate).toLocaleDateString()}`}
                fullWidth
              />

              <TextField select label="Participants" SelectProps={{
                multiple: true, value: selectedMembers, onChange: e => {
                  const v = e.target.value
                  setSelectedMembers(typeof v === 'string' ? v.split(',').map(Number) : v as number[])
                }
              }} fullWidth>
                {members.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
              </TextField>

              <TextField select label="Split Type" value={equalSplit ? 'equal' : 'custom'} onChange={e => setEqualSplit(e.target.value === 'equal')} fullWidth>
                <MenuItem value="equal">Split equally</MenuItem>
                <MenuItem value="custom">Custom amounts</MenuItem>
              </TextField>

              {!equalSplit && selectedMembers.length > 0 && (
                <Stack spacing={2} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="subtitle2">Custom Splits:</Typography>
                  {selectedMembers.map(uid => (
                    <TextField
                      key={uid}
                      label={`Amount for ${users.find(u => u.id === uid)?.name || uid}`}
                      type="number"
                      size="small"
                      value={customShares[uid] || ''}
                      onChange={e => setCustomShares(prev => ({ ...prev, [uid]: e.target.value }))}
                      fullWidth
                    />
                  ))}
                </Stack>
              )}

              {splitMismatch && (
                <Alert severity="error">
                  Total amount ({formatMoney(totalNum)}) does not match sum of split amounts ({formatMoney(customSum)}).
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createSubevent} variant="contained" disabled={!description || !totalAmount || !subEventDate || !payerId || selectedMembers.length === 0 || (!equalSplit && splitMismatch)}>
              Add Expense
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    </>
  )
}
