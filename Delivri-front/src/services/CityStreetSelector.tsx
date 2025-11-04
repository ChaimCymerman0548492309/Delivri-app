import { useEffect, useState } from 'react';
import {
  Autocomplete,
  Box,
  CircularProgress,
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material';

interface Props {
  onSelect: (city: string, street: string, houseNumber?: string) => void;
}

interface ApiResponse {
  result: {
    records: Array<Record<string, string>>;
  };
}

const CITY_FIELD = 'שם_ישוב';
const STREET_FIELD = 'שם_רחוב';

const CityStreetSelector: React.FC<Props> = ({ onSelect }) => {
  const [cities, setCities] = useState<string[]>([]);
  const [streetRecords, setStreetRecords] = useState<Array<Record<string, string>>>([]);
  const [filteredStreets, setFilteredStreets] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedStreet, setSelectedStreet] = useState<string | null>(null);
  const [houseNumber, setHouseNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCities = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          'https://data.gov.il/api/3/action/datastore_search?resource_id=a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3&limit=50000',
        );
        const data = (await response.json()) as ApiResponse;
        const records = data.result.records;

        setStreetRecords(records);
        const uniqueCities = Array.from(
          new Set(records.map((record) => record[CITY_FIELD]).filter(Boolean)),
        ).sort((a, b) => a.localeCompare(b, 'he'));
        setCities(uniqueCities);
      } catch (error) {
        console.error('Failed to load city list', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCities();
  }, []);

  const handleCityChange = (value: string | null) => {
    setSelectedCity(value);
    setSelectedStreet(null);

    if (value) {
      const cityStreets = streetRecords
        .filter((record) => record[CITY_FIELD] === value)
        .map((record) => record[STREET_FIELD])
        .filter(Boolean);

      const uniqueStreets = Array.from(new Set(cityStreets)).sort((a, b) => a.localeCompare(b, 'he'));
      setFilteredStreets(uniqueStreets);
    } else {
      setFilteredStreets([]);
    }
  };

  const handleConfirm = () => {
    if (!selectedCity || !selectedStreet) {
      alert('בחר עיר ורחוב לפני הוספת התחנה למסלול');
      return;
    }

    onSelect(selectedCity, selectedStreet, houseNumber.trim() || undefined);
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: 'background.paper',
        boxShadow: 3,
        direction: 'rtl',
      }}>
      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
        בחירת עיר, רחוב ומספר בית
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          <Grid >
            <Autocomplete
              size="small"
              fullWidth
              options={cities}
              value={selectedCity}
              onChange={(_, value) => handleCityChange(value)}
              renderInput={(params) => <TextField {...params} label="עיר" variant="outlined" />}
            />
          </Grid>

          <Grid >
            <Autocomplete
              size="small"
              fullWidth
              options={filteredStreets}
              value={selectedStreet}
              disabled={!selectedCity}
              onChange={(_, value) => setSelectedStreet(value)}
              renderInput={(params) => <TextField {...params} label="רחוב" variant="outlined" />}
            />
          </Grid>

          <Grid >
            <TextField
              size="small"
              fullWidth
              label="מספר בית"
              variant="outlined"
              value={houseNumber}
              onChange={(event) => setHouseNumber(event.target.value)}
            />
          </Grid>

          <Grid >
            <Box
              onClick={handleConfirm}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                textAlign: 'center',
                py: 1,
                borderRadius: 1.5,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'primary.dark' },
                transition: '0.3s',
              }}>
              הוספת התחנה למסלול
            </Box>
          </Grid>
        </Grid>
      )}
    </Paper>
  );
};

export default CityStreetSelector;
