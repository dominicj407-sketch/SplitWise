import { createTheme, PaletteMode } from '@mui/material';

export const getDesignTokens = (mode: PaletteMode) => ({
    palette: {
        mode,
        ...(mode === 'dark'
            ? {
                // Discord Dark Mode Colors
                primary: {
                    main: '#5865F2', // Blurple
                },
                secondary: {
                    main: '#57F287', // Green
                },
                error: {
                    main: '#ED4245', // Red
                },
                background: {
                    default: '#36393f', // Dark Gray
                    paper: '#2f3136', // Slightly lighter gray for panels
                },
                text: {
                    primary: '#dcddde', // Light Gray
                    secondary: '#b9bbbe', // Dimmer Gray
                },
            }
            : {
                // Discord Light Mode Colors
                primary: {
                    main: '#5865F2', // Blurple
                },
                secondary: {
                    main: '#57F287', // Green
                },
                error: {
                    main: '#ED4245', // Red
                },
                background: {
                    default: '#ffffff', // White
                    paper: '#f2f3f5', // Light Gray for panels
                },
                text: {
                    primary: '#2e3338', // Dark Gray
                    secondary: '#747f8d', // Lighter Gray
                },
            }),
    },
    typography: {
        fontFamily: [
            'Inter',
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
            '"Apple Color Emoji"',
            '"Segoe UI Emoji"',
            '"Segoe UI Symbol"',
        ].join(','),
        h1: { fontWeight: 700 },
        h2: { fontWeight: 700 },
        h3: { fontWeight: 600 },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: {
            textTransform: 'none' as const, // Discord buttons are not uppercase
            fontWeight: 500,
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 4, // Discord uses slightly rounded corners, but not full pills usually. 4px is standard.
                    padding: '8px 16px',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none', // Remove default gradient in dark mode
                    boxShadow: mode === 'dark' ? 'none' : '0 1px 0 rgba(4,4,5,0.2),0 1.5px 0 rgba(6,6,7,0.05),0 2px 0 rgba(4,4,5,0.05)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: mode === 'dark' ? '#202225' : '#e3e5e8', // Darker/Lighter top bar
                    color: mode === 'dark' ? '#ffffff' : '#060607',
                    boxShadow: '0 1px 0 rgba(4,4,5,0.2),0 1.5px 0 rgba(6,6,7,0.05),0 2px 0 rgba(4,4,5,0.05)',
                },
            },
        },
    },
});
