import type { AutocompleteProps } from '@mui/material';

/** הגדרות RTL משותפות ל-Autocomplete — Popper מחוץ ל-DOM tree צריך dir מפורש */
export const autocompleteRtlProps = {
  dir: 'rtl',
  noOptionsText: 'לא נמצאו תוצאות',
  loadingText: 'טוען...',
  slotProps: {
    popper: {
      dir: 'rtl',
      placement: 'bottom-start' as const,
      sx: { direction: 'rtl' },
    },
    paper: {
      dir: 'rtl',
      sx: { direction: 'rtl', textAlign: 'right' },
    },
    listbox: {
      dir: 'rtl',
      sx: { direction: 'rtl', textAlign: 'right' },
    },
  },
} satisfies Partial<AutocompleteProps<unknown, false, false, false>>;
