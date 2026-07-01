import { AppBar, Box, Button, IconButton, Toolbar, Typography, useTheme, Menu, MenuItem, Divider, ListItemIcon, ListItemText } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '@context/AuthContext'
import { useColorMode } from '@context/ColorModeContext'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import { useState } from 'react'

export default function AppHeader() {
  const { user, setUser } = useAuth()
  const theme = useTheme()
  const { toggleColorMode } = useColorMode()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleClose()
    localStorage.removeItem('auth_token')
    setUser(null)
  }

  return (
    <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold', color: 'primary.main' }}>
          SmartSplit
        </Typography>

        <Box display="flex" gap={1} alignItems="center">
          <IconButton sx={{ ml: 1 }} onClick={toggleColorMode} color="inherit">
            {theme.palette.mode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>

          {user ? (
            <>
              <Button color="inherit" component={RouterLink} to="/groups">Groups</Button>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <AccountCircleIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">{user.name}</Typography>
                  <Typography variant="caption" display="block" color="text.secondary">ID: {user.id}</Typography>
                  <Typography variant="caption" display="block" color="text.secondary">{user.email}</Typography>
                </Box>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Logout</ListItemText>
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button color="inherit" component={RouterLink} to="/">Login</Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  )
}
