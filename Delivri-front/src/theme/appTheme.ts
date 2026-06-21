import { createTheme } from '@mui/material';

/** RTL דרך direction + stylis plugin בלבד — בלי left/right ידניים שיוצרים כפילויות */
export const appTheme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'light',
    primary: { main: '#0d9488', light: '#5eead4', dark: '#0f766e', contrastText: '#fff' },
    secondary: { main: '#6366f1', light: '#a5b4fc', dark: '#4f46e5' },
    success: { main: '#22c55e' },
    warning: { main: '#f59e0b' },
    error: { main: '#ef4444' },
    background: { default: '#f0fdfa', paper: '#ffffff' },
    text: { primary: '#134e4a', secondary: '#64748b' },
  },
  typography: {
    fontFamily: '"Rubik", "Segoe UI", "Arial", sans-serif',
    allVariants: { letterSpacing: '0.01em' },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    body1: { fontSize: '0.9375rem' },
    body2: { fontSize: '0.875rem' },
    caption: { fontSize: '0.75rem' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { direction: 'rtl' },
        body: { direction: 'rtl', textAlign: 'right' },
        '#root': { direction: 'rtl', minHeight: '100%', textAlign: 'right' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 10, gap: 6 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: { gap: 8 },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: { textAlign: 'right' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        input: { textAlign: 'right' },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: { textAlign: 'right' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { textAlign: 'right' },
        head: { fontWeight: 700, fontSize: '0.75rem' },
      },
    },
    MuiDrawer: {
      defaultProps: { anchor: 'right' },
    },
    MuiDialog: {
      defaultProps: { dir: 'rtl' },
      styleOverrides: {
        paper: { textAlign: 'right' },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { textAlign: 'right' },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: { textAlign: 'right' },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: { paddingInline: 20, paddingBlockEnd: 20 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { textAlign: 'right', alignItems: 'flex-start' },
        message: { textAlign: 'right', width: '100%' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: { minWidth: 36 },
      },
    },
    MuiAutocomplete: {
      defaultProps: { dir: 'rtl' },
      styleOverrides: {
        inputRoot: { textAlign: 'right' },
        listbox: { textAlign: 'right' },
        option: { textAlign: 'right', justifyContent: 'flex-start' },
        groupLabel: { textAlign: 'right' },
      },
    },
    MuiPopper: {
      defaultProps: { dir: 'rtl' },
    },
    MuiMenu: {
      defaultProps: { dir: 'rtl' },
      styleOverrides: {
        paper: { textAlign: 'right' },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: { textAlign: 'right', justifyContent: 'flex-start' },
      },
    },
    MuiSnackbar: {
      defaultProps: {
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
      },
    },
  },
});
