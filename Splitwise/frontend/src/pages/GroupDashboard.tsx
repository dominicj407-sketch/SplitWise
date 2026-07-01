import { useEffect, useState } from 'react'
import { Box, Button, Card, CardActionArea, CardContent, Container, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Paper, Stack, TextField, Typography, Fab } from '@mui/material'
import AppHeader from '@components/AppHeader'
import ErrorAlert from '@components/ErrorAlert'
import { GroupsApi } from '@api/index'
import type { GroupResponse } from '@api/types'
import { useAuth } from '@context/AuthContext'
import { useNavigate } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import GroupIcon from '@mui/icons-material/Group'

export default function GroupDashboard() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [groups, setGroups] = useState<GroupResponse[]>([])
  const [error, setError] = useState<any>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [joinOpen, setJoinOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [invitations, setInvitations] = useState<any[]>([])
  const [joinRequests, setJoinRequests] = useState<any[]>([])

  const refresh = () => {
    if (user) {
      GroupsApi.listForUser(user.id).then(setGroups).catch(setError)
      GroupsApi.listMyInvitations(user.id).then(setInvitations).catch(() => setInvitations([]))
      GroupsApi.listPendingJoinRequests().then(setJoinRequests).catch(() => setJoinRequests([]))
    }
  }

  useEffect(() => { refresh() }, [user])

  const createGroup = async () => {
    if (!user || !newGroupName) return
    try {
      await GroupsApi.create({ name: newGroupName, creatorId: user.id, memberIds: [user.id] })
      setNewGroupName('')
      setCreateOpen(false)
      refresh()
    } catch (e) { setError(e) }
  }

  const joinGroup = async () => {
    if (!user || !joinCode) return
    try {
      await GroupsApi.submitJoinRequest({ groupCode: joinCode, userId: user.id })
      setJoinCode('')
      setJoinOpen(false)
      alert('Join request sent!')
      refresh()
    } catch (e) { setError(e) }
  }

  const respondToInvitation = async (id: number, status: 'ACCEPTED' | 'REJECTED') => {
    if (!user) return
    try {
      await GroupsApi.respondToInvitation(id, status, user.id)
      refresh()
    } catch (e) { setError(e) }
  }

  const respondToJoinRequest = async (groupId: number, requestId: number, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') await GroupsApi.approveJoin(groupId, requestId)
      else await GroupsApi.rejectJoin(groupId, requestId)
      refresh()
    } catch (e) { setError(e) }
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <ErrorAlert error={error} />

        {(invitations.length > 0 || joinRequests.length > 0) && (
          <Box mb={4}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>Notifications</Typography>
            <Stack spacing={2}>
              {invitations.map(i => (
                <Paper key={`inv-${i.id}`} variant="outlined" sx={{ p: 2, borderColor: 'primary.main', bgcolor: 'primary.50' }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">Invitation to join "{i.groupName}"</Typography>
                      <Typography variant="body2">Invited by {i.invitedByName}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" color="primary" onClick={() => respondToInvitation(i.id, 'ACCEPTED')}>Accept</Button>
                      <Button variant="outlined" color="error" onClick={() => respondToInvitation(i.id, 'REJECTED')}>Reject</Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
              {joinRequests.map(j => (
                <Paper key={`req-${j.id}`} variant="outlined" sx={{ p: 2, borderColor: 'warning.main', bgcolor: 'warning.50' }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">Request to join group (Code: {j.groupCode})</Typography>
                      <Typography variant="body2">Requester ID: {j.requesterId}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" color="success" onClick={() => respondToJoinRequest(j.groupId, j.id, 'approve')}>Approve</Button>
                      <Button variant="outlined" color="error" onClick={() => respondToJoinRequest(j.groupId, j.id, 'reject')}>Reject</Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}

        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" fontWeight="bold">My Groups</Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" startIcon={<GroupIcon />} onClick={() => setJoinOpen(true)}>
              Join Group
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              New Group
            </Button>
          </Stack>
        </Stack>

        <Grid container spacing={3}>
          {groups.map(g => (
            <Grid item xs={12} sm={6} md={4} key={g.id}>
              <Card variant="outlined" sx={{ height: '100%', transition: '0.2s', '&:hover': { boxShadow: 3, borderColor: 'primary.main' } }}>
                <CardActionArea onClick={() => nav(`/groups/${g.id}`)} sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                      <GroupIcon color="primary" />
                      <Typography variant="h6" fontWeight="bold" noWrap>{g.name}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Created: {new Date(g.createdAt).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
          {groups.length === 0 && (
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>You are not in any groups yet.</Typography>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
                  Create one now
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>

        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Group Name"
              fullWidth
              variant="outlined"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createGroup} variant="contained" disabled={!newGroupName}>Create</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={joinOpen} onClose={() => setJoinOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Join Group</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Group Code"
              fullWidth
              variant="outlined"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setJoinOpen(false)}>Cancel</Button>
            <Button onClick={joinGroup} variant="contained" disabled={!joinCode}>Join</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  )
}
