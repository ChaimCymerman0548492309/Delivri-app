import { useEffect, useMemo, useState } from 'react';
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
import {
  getCityGroupLabel,
  shouldRefreshCitySort,
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

const CityStreetSelector = ({ currentLocation, onSelect, disabled = false }: Props) => {
  const [cities, setCities] = useState<string[]>([]);
  const [sortedCities, setSortedCities] = useState<string[]>([]);
  const [nearbyCities, setNearbyCities] = useState<Set<string>>(new Set());
  const [userCity, setUserCity] = useState<string | null>(null);
  const [streetRecords, setStreetRecords] = useState<Array<Record<string, string>>>([]);
  const [filteredStreets, setFilteredStreets] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedStreet, setSelectedStreet] = useState<string | null>(null);
  const [houseNumber, setHouseNumber] = useState('');
  const [loadingCities, setLoadingCities] = useState(true);
  const [sortingCities, setSortingCities] = useState(false);
  const [loadingStreets, setLoadingStreets] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const response = await fetch(
          `${API.DATA_GOV_IL}?resource_id=a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3&limit=50000`,
        );
        const data = (await response.json()) as ApiResponse;
        const records = data.result.records;
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

  useEffect(() => {
    if (!cities.length || !currentLocation) return;

    let cancelled = false;
    const applySort = async () => {
      if (!shouldRefreshCitySort(currentLocation) && sortedCities.length === cities.length) return;
      setSortingCities(true);
      try {
        const result = await sortCitiesByProximity(cities, currentLocation);
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
  }, [cities, currentLocation]);

  const cityOptions = useMemo(
    () => (sortedCities.length ? sortedCities : cities),
    [sortedCities, cities],
  );

  const handleCityChange = (value: string | null) => {
    setSelectedCity(value);
    setSelectedStreet(null);

    if (value) {
      setLoadingStreets(true);
      const cityStreets = streetRecords
        .filter((record) => record[CITY_FIELD] === value)
        .map((record) => record[STREET_FIELD])
        .filter(Boolean);
      const uniqueStreets = Array.from(new Set(cityStreets)).sort((a, b) => a.localeCompare(b, 'he'));
      setFilteredStreets(uniqueStreets);
      setLoadingStreets(false);
    } else {
      setFilteredStreets([]);
    }
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
        direction: 'rtl',
        width: '100%',
        minWidth: 0,
        position: 'relative',
      }}>
      {sortingCities && (
        <Box sx={{ position: 'absolute', top: 4, left: 4, zIndex: 1 }}>
          <InlineLoader label="ממיין..." size="xs" />
        </Box>
      )}

      {userCity && (
        <Chip
          icon={<NearMeIcon sx={{ fontSize: '14px !important' }} />}
          label={`קרוב ל: ${userCity}`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ mb: 1, maxWidth: '100%', height: 24, fontSize: '0.7rem' }}
        />
      )}

      <Stack spacing={1} sx={{ width: '100%', minWidth: 0 }}>
        <Autocomplete
          size="small"
          fullWidth
          disabled={disabled || submitting}
          options={cityOptions}
          value={selectedCity}
          onChange={(_, value) => handleCityChange(value)}
          groupBy={(option) => getCityGroupLabel(option, nearbyCities)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="עיר"
              placeholder="חפש עיר..."
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {sortingCities && <CircularProgress color="inherit" size={16} sx={{ mr: 1 }} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
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
            paper: { sx: { maxHeight: 280 } },
            listbox: { sx: { maxHeight: 280 } },
          }}
        />

        <Box sx={{ position: 'relative', width: '100%' }}>
          {loadingStreets && <InlineLoader label="טוען רחובות..." size="xs" overlay />}
          <Autocomplete
            size="small"
            fullWidth
            disabled={!selectedCity || disabled || submitting}
            options={filteredStreets}
            value={selectedStreet}
            onChange={(_, value) => setSelectedStreet(value)}
            renderInput={(params) => (
              <TextField {...params} label="רחוב" placeholder={selectedCity ? 'חפש רחוב...' : 'בחר עיר קודם'} />
            )}
            slotProps={{
              paper: { sx: { maxHeight: 240 } },
              listbox: { sx: { maxHeight: 240 } },
            }}
          />
        </Box>

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
              <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
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
