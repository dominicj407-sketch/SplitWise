import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Card, CardActionArea, CardContent, Chip, Container, Dialog, DialogActions, DialogContent, DialogTitle, Fab, Grid, IconButton, List, ListItem, ListItemAvatar, ListItemText, MenuItem, Paper, Stack, Tab, Tabs, TextField, Tooltip, Typography, useTheme, Avatar } from '@mui/material'
import AppHeader from '@components/AppHeader'
import ErrorAlert from '@components/ErrorAlert'
import { EventsApi, GroupsApi, UsersApi, SettlementsApi } from '@api/index'
import type { EventResponse, GroupResponse, UserResponse, WeekSummary, GroupSettlementSummary } from '@api/types'
import { useAuth } from '@context/AuthContext'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import EventIcon from '@mui/icons-material/Event'
import GroupIcon from '@mui/icons-material/Group'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import SettingsIcon from '@mui/icons-material/Settings'

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function GroupDetailsPage() {
  const { user } = useAuth()
  const { groupId } = useParams()
  const gid = Number(groupId)
  const theme = useTheme()
  const nav = useNavigate()

  const [group, setGroup] = useState<GroupResponse | null>(null)
  const [events, setEvents] = useState<EventResponse[]>([])
  const [users, setUsers] = useState<UserResponse[]>([])
  const [error, setError] = useState<any>(null)
  const [tabValue, setTabValue] = useState(0)

  // Dialogs
  const [createEventOpen, setCreateEventOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  // Forms
  const [newEventName, setNewEventName] = useState('')
  const [newEventStartDate, setNewEventStartDate] = useState('')
  const [newEventEndDate, setNewEventEndDate] = useState('')
  const [newMemberId, setNewMemberId] = useState<number | ''>('')

  const [groupCode, setGroupCode] = useState<string>('')
  const [joinRequests, setJoinRequests] = useState<{ id: number; requesterId: number; status: string }[]>([])
  const [weeks, setWeeks] = useState<WeekSummary[]>([])
  const [selectedWeek, setSelectedWeek] = useState<number | ''>('')
  const [selectedYear, setSelectedYear] = useState<number | ''>('')
  const [eventsByWeek, setEventsByWeek] = useState<EventResponse[]>([])
  const [settlementSummary, setSettlementSummary] = useState<GroupSettlementSummary | null>(null)

  const refresh = () => {
    GroupsApi.get(gid).then(g => {
      setGroup(g)
      if (user && user.id === g.creatorId) {
        GroupsApi.listJoinRequests(gid).then(data => {
          console.log('Fetched Join Requests:', data)
          setJoinRequests(data)
        }).catch(() => { })
      }
    }).catch(setError)
    EventsApi.listByGroup(gid).then(setEvents).catch(setError)
    UsersApi.list().then(setUsers).catch(setError)
    // Fetch settlement summary for member removal checks
    SettlementsApi.group(gid).then(setSettlementSummary).catch(() => { })
    GroupsApi.getCode(gid).then((r: any) => setGroupCode(r.groupCode)).catch(() => setGroupCode(''))
    EventsApi.listWeeks(gid).then((ws: WeekSummary[]) => {
      setWeeks(ws)
      if (ws.length > 0) {
        const w0 = ws[0]
        setSelectedWeek(w0.weekNumber)
        setSelectedYear(w0.year)
        EventsApi.listByGroupWeek(gid, w0.weekNumber, w0.year).then(setEventsByWeek).catch(() => setEventsByWeek([]))
      } else {
        setSelectedWeek('')
        setSelectedYear('')
        setEventsByWeek([])
      }
    }).catch(() => setWeeks([]))
  }

  useEffect(() => { refresh() }, [gid, user])

  const addMember = async () => {
    if (!newMemberId) return
    try {
      await GroupsApi.invite(gid, newMemberId as number)
      setNewMemberId('')
      setInviteOpen(false)
      refresh()
    } catch (e) { setError(e) }
  }

  const removeMember = async (uid: number) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    await GroupsApi.removeMember(gid, uid)
    refresh()
  }

  const deleteGroup = async () => {
    if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) return
    try {
      await GroupsApi.deleteGroup(gid)
      nav('/groups')
    } catch (e) { setError(e) }
  }

  const createEvent = async () => {
    if (!user) return
    const startStr = newEventStartDate || new Date().toISOString().slice(0, 10)
    const endStr = newEventEndDate || startStr
    try {
      const warn: any = await GroupsApi.newEventWarning(gid, startStr)
      if (warn?.warn) {
        if (warn.blocked) {
          alert(warn.message || 'Cannot create event due to pending payments in the oldest week.')
          return
        }
        const proceed = window.confirm(warn.message || 'Creating this event will hide the oldest page. Proceed?')
        if (!proceed) return
      }
    } catch { }
    await EventsApi.create({ groupId: gid, name: newEventName, creatorId: user.id, startDate: startStr, endDate: endStr })
    setNewEventName('')
    setNewEventStartDate('')
    setNewEventEndDate('')
    setCreateEventOpen(false)
    refresh()
  }

  const approveJoin = async (requestId: number) => {
    console.log('Approve Join:', { gid, requestId })
    if (!requestId) {
      console.error('Invalid requestId:', requestId)
      return
    }
    try { await GroupsApi.approveJoin(gid, requestId); refresh() } catch { }
  }

  const rejectJoin = async (requestId: number) => {
    console.log('Reject Join:', { gid, requestId })
    if (!requestId) {
      console.error('Invalid requestId:', requestId)
      return
    }
    try { await GroupsApi.rejectJoin(gid, requestId); refresh() } catch { }
  }

  const onChangeWeek = async (weekNumber: number, year: number) => {
    if (!weekNumber || !year) return
    setSelectedWeek(weekNumber)
    setSelectedYear(year)
    try {
      const list = await EventsApi.listByGroupWeek(gid, weekNumber, year)
      setEventsByWeek(list)
    } catch { setEventsByWeek([]) }
  }

  const members = useMemo(() => users.filter(u => (group?.memberIds || []).includes(u.id || -1)), [users, group?.memberIds])

  if (!group) return <AppHeader />

  return (
    <>
      <AppHeader />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <ErrorAlert error={error} />

        {/* Header Section */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>{group.name}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip icon={<GroupIcon />} label={`${members.length} Members`} size="small" />
                {groupCode && (
                  <Chip
                    label={`Code: ${groupCode}`}
                    size="small"
                    variant="outlined"
                    onDelete={async () => { try { await navigator.clipboard.writeText(groupCode) } catch { } }}
                    deleteIcon={<Tooltip title="Copy Code"><ContentCopyIcon sx={{ fontSize: '14px !important' }} /></Tooltip>}
                  />
                )}
              </Stack>
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateEventOpen(true)}>
              New Event
            </Button>
          </Stack>
        </Paper>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto">
            <Tab icon={<EventIcon />} iconPosition="start" label="Events" />
            <Tab icon={<GroupIcon />} iconPosition="start" label="Members" />
            <Tab icon={<ReceiptLongIcon />} iconPosition="start" label="Settlements" />
            {user && user.id === group.creatorId && (
              <Tab icon={<SettingsIcon />} iconPosition="start" label="Admin" />
            )}
          </Tabs>
        </Box>

        {/* Events Tab */}
        <CustomTabPanel value={tabValue} index={0}>
          <Box mb={3} display="flex" alignItems="center" gap={2}>
            <TextField select label="Page / Week" size="small" value={weeks.findIndex(w => w.weekNumber === selectedWeek && w.year === selectedYear)} onChange={e => {
              const idx = Number(e.target.value)
              const w = weeks[idx]
              if (w) onChangeWeek(w.weekNumber, w.year)
            }} sx={{ minWidth: 200 }}>
              {weeks.map((w, idx) => (
                <MenuItem key={`${w.weekNumber}-${w.year}`} value={idx}>Page {idx + 1} ({w.eventCount} events)</MenuItem>
              ))}
            </TextField>
          </Box>

          <Grid container spacing={2}>
            {eventsByWeek.map(e => (
              <Grid item xs={12} md={6} lg={4} key={`w-${e.id}`}>
                <Card variant="outlined" sx={{
                  transition: '0.2s',
                  '&:hover': { borderColor: theme.palette.primary.main, boxShadow: theme.shadows[4] }
                }}>
                  <CardActionArea onClick={() => nav(`/events/${e.id}`)}>
                    <CardContent>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>{e.name}</Typography>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          {e.startDate ? new Date(e.startDate).toLocaleDateString() : ''} - {e.endDate ? new Date(e.endDate).toLocaleDateString() : ''}
                        </Typography>
                        <Chip label="Open" size="small" color="success" variant="outlined" />
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
            {eventsByWeek.length === 0 && (
              <Grid item xs={12}>
                <Typography color="text.secondary" textAlign="center" py={4}>No events in this page.</Typography>
              </Grid>
            )}
          </Grid>
        </CustomTabPanel>

        {/* Members Tab */}
        <CustomTabPanel value={tabValue} index={1}>
          <Stack direction="row" justifyContent="flex-end" mb={2}>
            <Button startIcon={<PersonAddIcon />} onClick={() => setInviteOpen(true)}>Invite Member</Button>
          </Stack>
          <Grid container spacing={2}>
            {members.map(m => {
              const isCreator = user?.id === group.creatorId
              const isSelf = user?.id === m.id
              const memberBalance = settlementSummary?.balances.find(b => b.userId === m.id)?.netBalance || 0
              const hasBalance = Number(memberBalance) !== 0

              return (
                <Grid item xs={12} sm={6} md={4} key={m.id}>
                  <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar>{m.name.charAt(0).toUpperCase()}</Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">{m.name}</Typography>
                        <Typography variant="caption" color="text.secondary">ID: {m.id}</Typography>
                      </Box>
                    </Stack>
                    {isCreator && !isSelf && (
                      <Tooltip title={hasBalance ? "Cannot remove member with pending settlements" : "Remove Member"}>
                        <span>
                          <IconButton color="error" size="small" onClick={() => removeMember(m.id)} disabled={hasBalance}>
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Paper>
                </Grid>
              )
            })}
          </Grid>
        </CustomTabPanel>

        {/* Settlements Tab */}
        <CustomTabPanel value={tabValue} index={2}>
          <Stack spacing={2} alignItems="center" py={4}>
            <Typography variant="h6">Settlements & Balances</Typography>
            <Typography color="text.secondary">View who owes whom and settle debts.</Typography>
            <Stack direction="row" spacing={2}>
              <Button variant="contained" component={RouterLink} to={`/settlements/${group.id}`}>Overall Settlements</Button>
              {selectedWeek && selectedYear && (
                <Button variant="outlined" component={RouterLink} to={`/settlements/${group.id}/weekly/${selectedWeek}/${selectedYear}`}>Weekly Settlements</Button>
              )}
            </Stack>
          </Stack>
        </CustomTabPanel>

        {/* Admin Tab */}
        <CustomTabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>Join Requests</Typography>
          {joinRequests.length > 0 ? (
            <Grid container spacing={2}>
              {joinRequests.map(j => (
                <Grid item xs={12} md={6} key={j.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1">Requester: {users.find(u => u.id === j.requesterId)?.name || j.requesterId}</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        <Button size="small" variant="contained" onClick={() => approveJoin(j.id)}>Approve</Button>
                        <Button size="small" variant="outlined" color="error" onClick={() => rejectJoin(j.id)}>Reject</Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography color="text.secondary">No pending join requests.</Typography>
          )}

          <Box mt={4}>
            <Typography variant="h6" color="error" gutterBottom>Danger Zone</Typography>
            <Paper variant="outlined" sx={{ p: 2, borderColor: 'error.main' }}>
              <Typography variant="body2" gutterBottom>
                Once you delete a group, there is no going back. Please be certain.
              </Typography>
              <Tooltip title={events.length > 0 ? "Cannot delete group with existing events. Please delete all events first." : ""}>
                <span>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={deleteGroup}
                    disabled={events.length > 0}
                  >
                    Delete Group
                  </Button>
                </span>
              </Tooltip>
            </Paper>
          </Box>
        </CustomTabPanel>

        {/* Create Event Dialog */}
        <Dialog open={createEventOpen} onClose={() => setCreateEventOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Event Name"
              fullWidth
              variant="outlined"
              value={newEventName}
              onChange={e => setNewEventName(e.target.value)}
            />
            <TextField
              margin="dense"
              label="Start Date"
              type="date"
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              value={newEventStartDate}
              onChange={e => setNewEventStartDate(e.target.value)}
            />
            <TextField
              margin="dense"
              label="End Date"
              type="date"
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              value={newEventEndDate}
              onChange={e => setNewEventEndDate(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateEventOpen(false)}>Cancel</Button>
            <Button onClick={createEvent} variant="contained" disabled={!newEventName}>Create</Button>
          </DialogActions>
        </Dialog>

        {/* Invite Dialog */}
        <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="User ID"
              type="number"
              fullWidth
              variant="outlined"
              value={newMemberId}
              onChange={e => setNewMemberId(e.target.value ? Number(e.target.value) : '')}
              helperText={typeof newMemberId === 'number' && !!newMemberId ? `User: ${users.find(u => u.id === newMemberId)?.name || 'Unknown'}` : 'Enter User ID to invite'}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={addMember} variant="contained" disabled={!newMemberId}>Invite</Button>
          </DialogActions>
        </Dialog>

      </Container>
    </>
  )
}
