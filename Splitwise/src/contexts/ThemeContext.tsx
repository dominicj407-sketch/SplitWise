import { ReactNode, useEffect } from 'react';

// Single black & gold theme -- no light/dark toggle. The `dark` class drives every
// `dark:` Tailwind utility across the app, so we just apply it once at startup.
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return <>{children}</>;
};
