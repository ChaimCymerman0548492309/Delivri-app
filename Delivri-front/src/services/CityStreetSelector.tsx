import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { NearMe as NearMeIcon } from '@mui/icons-material';
import InlineLoader from '../components/ui/InlineLoader';
import { API } from '../config/api';
import { autocompleteRtlProps } from '../theme/autocompleteRtl';
import { locationStableKey } from '../utils/geoUtils';
import {
  getCityGroupLabel,
  sortCitiesByProximity,
} from './cityProximity';

interface Props {
  currentLocation: [number, number] | null;
  onSelect: (city: string, street: string, houseNumber?: string) => Promise<void> | void;
  disabled?: boolean;
}

interface ApiResponse {
  result: {
    records: Array<Record<string, string>>;
  };
}

const CITY_FIELD = 'שם_ישוב';
const STREET_FIELD = 'שם_רחוב';

const normalizeGovField = (value?: string) => value?.replace(/\s+/g, ' ').trim() ?? '';

const normalizeStreetRecord = (record: Record<string, string>): Record<string, string> => ({
  ...record,
  [CITY_FIELD]: normalizeGovField(record[CITY_FIELD]),
  [STREET_FIELD]: normalizeGovField(record[STREET_FIELD]),
});

const CityStreetSelector = ({ currentLocation, onSelect, disabled = false }: Props) => {
  const [cities, setCities] = useState<string[]>([]);
  const [sortedCities, setSortedCities] = useState<string[]>([]);
  const [nearbyCities, setNearbyCities] = useState<Set<string>>(new Set());
  const [userCity, setUserCity] = useState<string | null>(null);
  const [streetRecords, setStreetRecords] = useState<Array<Record<string, string>>>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedStreet, setSelectedStreet] = useState<string | null>(null);
  const [houseNumber, setHouseNumber] = useState('');
  const [loadingCities, setLoadingCities] = useState(true);
  const [sortingCities, setSortingCities] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const response = await fetch(
          `${API.DATA_GOV_IL}?resource_id=a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3&limit=50000`,
        );
        const data = (await response.json()) as ApiResponse;
        const records = data.result.records.map(normalizeStreetRecord);
        setStreetRecords(records);
        const uniqueCities = Array.from(
          new Set(records.map((record) => record[CITY_FIELD]).filter(Boolean)),
        ).sort((a, b) => a.localeCompare(b, 'he'));
        setCities(uniqueCities);
        setSortedCities(uniqueCities);
      } catch (error) {
        console.error('Failed to load city list', error);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, []);

  const locationKey = currentLocation ? locationStableKey(currentLocation) : null;
  const locationRef = useRef(currentLocation);
  locationRef.current = currentLocation;

  useEffect(() => {
    const loc = locationRef.current;
    if (!cities.length || !loc || !locationKey) return;

    let cancelled = false;
    const applySort = async () => {
      setSortingCities(true);
      try {
        const result = await sortCitiesByProximity(cities, loc);
        if (!cancelled) {
          setSortedCities(result.sortedCities);
          setNearbyCities(result.nearbyCities);
          setUserCity(result.userCity);
        }
      } finally {
        if (!cancelled) setSortingCities(false);
      }
    };

    applySort();
    return () => {
      cancelled = true;
    };
  }, [cities, locationKey]);

  const cityOptions = useMemo(
    () => (sortedCities.length ? sortedCities : cities),
    [sortedCities, cities],
  );

  const streetOptions = useMemo(() => {
    if (!selectedCity) return [];
    return Array.from(
      new Set(
        streetRecords
          .filter((record) => record[CITY_FIELD] === selectedCity)
          .map((record) => record[STREET_FIELD])
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, 'he'));
  }, [selectedCity, streetRecords]);

  const handleCityChange = (value: string | null) => {
    setSelectedCity(value);
    setSelectedStreet(null);
  };

  const handleConfirm = async () => {
    if (!selectedCity || !selectedStreet) {
      alert('בחר עיר ורחוב לפני הוספת התחנה למסלול');
      return;
    }

    setSubmitting(true);
    try {
      await onSelect(selectedCity, selectedStreet, houseNumber.trim() || undefined);
      setSelectedStreet(null);
      setHouseNumber('');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCities) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, position: 'relative' }}>
        <InlineLoader label="טוען רשימת ערים..." size="sm" fullWidth />
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1,
        borderRadius: 1.5,
        bgcolor: 'background.paper',
        width: '100%',
        minWidth: 0,
        position: 'relative',
      }}>
      {sortingCities && (
        <Box sx={{ position: 'absolute', top: 4, insetInlineStart: 4, zIndex: 1 }}>
          <InlineLoader label="ממיין..." size="xs" />
        </Box>
      )}

      {userCity && (
        <Chip
          icon={<NearMeIcon sx={{ fontSize: '14px !important' }} />}
          label={`העיר שלך: ${userCity}`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ mb: 1, maxWidth: '100%', height: 24, fontSize: '0.7rem' }}
        />
      )}

      {!userCity && currentLocation && sortingCities && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          מזהה ערים קרובות...
        </Typography>
      )}

      <Stack spacing={1} sx={{ width: '100%', minWidth: 0 }}>
        <Autocomplete
          {...autocompleteRtlProps}
          size="small"
          fullWidth
          disabled={disabled || submitting}
          loading={sortingCities}
          options={cityOptions}
          value={selectedCity}
          onChange={(_, value) => handleCityChange(value)}
          isOptionEqualToValue={(a, b) => a === b}
          groupBy={(option) => getCityGroupLabel(option, nearbyCities)}
          renderInput={(params) => (
            <TextField {...params} label="עיר" placeholder="חפש עיר..." />
          )}
          renderOption={(props, option) => {
            const { key, ...rest } = props;
            const isNearby = nearbyCities.has(option);
            return (
              <Box component="li" key={key} {...rest}>
                <Typography variant="body2" sx={{ fontWeight: isNearby ? 600 : 400 }}>
                  {option}
                </Typography>
              </Box>
            );
          }}
          slotProps={{
            ...autocompleteRtlProps.slotProps,
            paper: { ...autocompleteRtlProps.slotProps?.paper, sx: { maxHeight: 280, direction: 'rtl', textAlign: 'right' } },
            listbox: { ...autocompleteRtlProps.slotProps?.listbox, sx: { maxHeight: 280, direction: 'rtl', textAlign: 'right' } },
          }}
        />

        <Autocomplete
          {...autocompleteRtlProps}
          size="small"
          fullWidth
          disabled={!selectedCity || disabled || submitting}
          options={streetOptions}
          value={selectedStreet}
          onChange={(_, value) => setSelectedStreet(value)}
          isOptionEqualToValue={(a, b) => a === b}
          noOptionsText={selectedCity ? 'לא נמצאו רחובות לעיר זו' : 'בחר עיר קודם'}
          renderInput={(params) => (
            <TextField
              {...params}
              label="רחוב"
              placeholder={selectedCity ? `חפש רחוב (${streetOptions.length})...` : 'בחר עיר קודם'}
            />
          )}
          slotProps={{
            ...autocompleteRtlProps.slotProps,
            paper: { ...autocompleteRtlProps.slotProps?.paper, sx: { maxHeight: 240, direction: 'rtl', textAlign: 'right' } },
            listbox: { ...autocompleteRtlProps.slotProps?.listbox, sx: { maxHeight: 240, direction: 'rtl', textAlign: 'right' } },
          }}
        />

        <TextField
          size="small"
          fullWidth
          label="מספר בית"
          placeholder="אופציונלי"
          value={houseNumber}
          disabled={disabled || submitting}
          onChange={(e) => setHouseNumber(e.target.value)}
        />

        <Button
          variant="contained"
          fullWidth
          disabled={!selectedCity || !selectedStreet || disabled || submitting}
          onClick={handleConfirm}
          sx={{
            py: 1.2,
            position: 'relative',
            bgcolor: submitting ? 'primary.dark' : 'primary.main',
          }}>
          {submitting ? (
            <>
              <CircularProgress size={16} color="inherit" sx={{ ml: 1 }} />
              מאתר כתובת...
            </>
          ) : (
            'הוספת התחנה למסלול'
          )}
        </Button>
      </Stack>
    </Paper>
  );
};

export default CityStreetSelector;
