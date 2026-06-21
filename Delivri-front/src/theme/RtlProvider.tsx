import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { prefixer } from 'stylis';
import rtlPlugin from '@mui/stylis-plugin-rtl';

const rtlCache = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

interface RtlProviderProps {
  children: React.ReactNode;
}

/** Emotion cache עם תמיכת RTL מלאה ל-MUI */
const RtlProvider = ({ children }: RtlProviderProps) => (
  <CacheProvider value={rtlCache}>{children}</CacheProvider>
);

export default RtlProvider;
