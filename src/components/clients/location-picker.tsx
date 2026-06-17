'use client';

import { useState, useCallback } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchIcon } from 'lucide-react';

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  address: string | null;
  onChange: (lat: number, lng: number, address: string) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '300px',
};

const defaultCenter = {
  lat: 12.9716,
  lng: 77.5946, // Bangalore, India
};

const libraries: ('places' | 'geometry' | 'drawing' | 'visualization')[] = ['places'];

export function LocationPicker({ lat, lng, address, onChange }: LocationPickerProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [searchInput, setSearchInput] = useState('');
  const [mapCenter, setMapCenter] = useState(
    lat && lng ? { lat, lng } : defaultCenter
  );
  const [marker, setMarker] = useState(
    lat && lng ? { lat, lng } : null
  );

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      if (!isLoaded) return;

      const geocoder = new google.maps.Geocoder();
      try {
        const result = await geocoder.geocode({ location: { lat, lng } });
        if (result.results[0]) {
          onChange(lat, lng, result.results[0].formatted_address);
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      }
    },
    [isLoaded, onChange]
  );

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarker({ lat, lng });
      reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  const handleSearch = useCallback(async () => {
    if (!isLoaded || !searchInput.trim()) return;

    const geocoder = new google.maps.Geocoder();
    try {
      const result = await geocoder.geocode({ address: searchInput });
      if (result.results[0]) {
        const location = result.results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();
        setMapCenter({ lat, lng });
        setMarker({ lat, lng });
        onChange(lat, lng, result.results[0].formatted_address);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  }, [isLoaded, searchInput, onChange]);

  if (!isLoaded) {
    return <Skeleton className="w-full h-[300px]" />;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="location-search">Search Location</Label>
        <div className="flex gap-2">
          <Input
            id="location-search"
            placeholder="Search for a location..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
          <button
            type="button"
            onClick={handleSearch}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80"
          >
            <SearchIcon className="size-4" />
          </button>
        </div>
      </div>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={marker ? 15 : 12}
        onClick={handleMapClick}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
        }}
      >
        {marker && <Marker position={marker} />}
      </GoogleMap>

      {address && (
        <p className="text-sm text-muted-foreground">
          Selected: {address}
        </p>
      )}
    </div>
  );
}
