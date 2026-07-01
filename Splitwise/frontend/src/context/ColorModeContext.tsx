import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider, createTheme, PaletteMode } from '@mui/material';
import { getDesignTokens } from '../theme';

interface ColorModeContextType {
    toggleColorMode: () => void;
    mode: PaletteMode;
}

export const ColorModeContext = createContext<ColorModeContextType>({
    toggleColorMode: () => { },
    mode: 'dark',
});

export const useColorMode = () => useContext(ColorModeContext);

export const ColorModeProvider = ({ children }: { children: React.ReactNode }) => {
    const [mode, setMode] = useState<PaletteMode>('dark');

    useEffect(() => {
        const savedMode = localStorage.getItem('colorMode') as PaletteMode;
        if (savedMode) {
            setMode(savedMode);
        }
    }, []);

    const colorMode = useMemo(
        () => ({
            toggleColorMode: () => {
                setMode((prevMode) => {
                    const newMode = prevMode === 'light' ? 'dark' : 'light';
                    localStorage.setItem('colorMode', newMode);
                    return newMode;
                });
            },
            mode,
        }),
        [mode],
    );

    const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                {children}
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
};
