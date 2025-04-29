import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState, useEffect, useRef } from 'react';

// Fix marker icon issue for leaflet in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ORS_API_KEY = "5b3ce3597851110001cf62488617c8c46e1c45519a418de6c94ca410"

const SearchIcon = () => (
  <svg className="w-6 h-6 text-[#bdbdbd]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" stroke="currentColor" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeLinecap="round" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-6 h-6 text-[#bdbdbd]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" stroke="currentColor" />
    <path d="M12 6v6l4 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DEFAULT_START = "Lagos, Nigeria";
const DEFAULT_START_COORDS = [6.5244, 3.3792]; // Lagos

async function geocode(address) {
  console.log("Geocoding address:", address);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Geocode response:", data);
    if (data && data.length > 0) {
      const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      console.log("Geocoded coords:", coords);
      return coords;
    }
    return null;
  } catch (err) {
    console.error("Geocoding error:", err);
    return null;
  }
}

async function fetchRoute(startCoords, endCoords) {
  console.log("Fetching route from", startCoords, "to", endCoords);
  const url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [startCoords[1], startCoords[0]], // [lon, lat]
          [endCoords[1], endCoords[0]],
        ],
        instructions: false,
        alternative_routes: {
          target_count: 3,
          share_factor: 0.6,
          weight_factor: 1.4
        }
      }),
    });
    const data = await res.json();
    console.log("ORS route response:", data);
    if (!res.ok) {
      console.error("ORS API error:", data);
      return null;
    }
    return data;
  } catch (err) {
    console.error("ORS fetch error:", err);
    return null;
  }
}

// Helper to fly to marker when destination changes
function FlyToDestination({ position }) {
  const map = useMap();
  if (position) {
    map.flyTo(position, 13, { duration: 1.5 });
  }
  return null;
}

// Helper to fly to user location only once when it becomes available
function FlyToUserLocationOnce({ position, hasCentered, setHasCentered }) {
  const map = useMap();
  useEffect(() => {
    if (position && !hasCentered) {
      map.flyTo(position, 13, { duration: 1.5 });
      setHasCentered(true);
    }
    // eslint-disable-next-line
  }, [position, hasCentered]);
  return null;
}

// Haversine formula to calculate distance between two lat/lon points in meters
function getDistanceFromLatLonInMeters([lat1, lon1], [lat2, lon2]) {
  const R = 6371000; // Radius of the earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

async function reverseGeocode([lat, lon]) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.display_name) {
      return data.display_name;
    }
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
}

const MapView = () => {
  const [destination, setDestination] = useState('');
  const [destCoords, setDestCoords] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userCoords, setUserCoords] = useState(null);
  const [userLocationStatus, setUserLocationStatus] = useState('pending'); // pending, success, fail
  const [selectedOnMap, setSelectedOnMap] = useState(null);
  const [selectedOnMapAddress, setSelectedOnMapAddress] = useState('');
  const [hasCenteredOnUser, setHasCenteredOnUser] = useState(false);
  const [locationTried, setLocationTried] = useState(false);
  const mapRef = useRef();

  // Try to get user location on mount and when requested
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocationStatus('fail');
      return;
    }
    const geoSuccess = (pos) => {
      console.log("Got user location:", pos.coords.latitude, pos.coords.longitude, "Accuracy:", pos.coords.accuracy, "meters");
      setUserCoords([pos.coords.latitude, pos.coords.longitude]);
      setUserLocationStatus('success');
    };
    const geoError = (err) => {
      console.warn("Geolocation error:", err);
      setUserLocationStatus('fail');
    };
    // Use watchPosition for better mobile support
    const watchId = navigator.geolocation.watchPosition(
      geoSuccess,
      geoError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
    setLocationTried(true);
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Manual location request button for mobile
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setUserLocationStatus('fail');
      return;
    }
    setUserLocationStatus('pending');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords([pos.coords.latitude, pos.coords.longitude]);
        setUserLocationStatus('success');
      },
      (err) => {
        setUserLocationStatus('fail');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
    setLocationTried(true);
  };

  // When user clicks on map, set destination coordinates, reverse geocode address, and calculate route
  function MapClickHandler() {
    const map = useMap();
    useEffect(() => {
      const handleClick = async (e) => {
        const coords = [e.latlng.lat, e.latlng.lng];
        setDestCoords(coords);
        setSelectedOnMap(coords);
        setLoading(true);
        const address = await reverseGeocode(coords);
        setSelectedOnMapAddress(address);
        setDestination(address);

        // Calculate route only once here
        setError('');
        setRoutes([]);
        const start = userCoords || DEFAULT_START_COORDS;
        const distance = getDistanceFromLatLonInMeters(start, coords);
        if (distance > 150000) {
          setError("Route distance exceeds 150km limit for free API. Please choose a closer destination.");
          setLoading(false);
          return;
        }
        const orsData = await fetchRoute(start, coords);
        if (!orsData || !orsData.features || orsData.features.length === 0) {
          setError("No route found.");
          setLoading(false);
          return;
        }
        const newRoutes = orsData.features.map((feature, idx) => ({
          id: idx + 1,
          time: Math.round(feature.properties.summary.duration / 60),
          desc: `Route ${idx + 1} to ${address}`,
          geometry: feature.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
        }));
        setRoutes(newRoutes);
        setLoading(false);
      };
      map.on('click', handleClick);
      return () => map.off('click', handleClick);
    }, [userCoords]);
    return null;
  }

  const handleDestinationChange = (e) => {
    setDestination(e.target.value);
    setSelectedOnMap(null);
    setSelectedOnMapAddress('');
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setRoutes([]);
    setDestCoords(null);
    setSelectedOnMap(null);
    setSelectedOnMapAddress('');
    if (!destination) return;
    setLoading(true);
    try {
      console.log("Searching for destination:", destination);
      const coords = await geocode(destination);
      if (!coords) {
        setError("Destination not found.");
        setLoading(false);
        console.warn("Destination not found for:", destination);
        return;
      }
      setDestCoords(coords);
      const start = userCoords || DEFAULT_START_COORDS;

      // Check distance before routing
      const distance = getDistanceFromLatLonInMeters(start, coords);
      console.log("Distance between start and destination (meters):", distance);
      if (distance > 150000) {
        setError("Route distance exceeds 150km limit for free API. Please choose a closer destination.");
        setLoading(false);
        return;
      }

      console.log("Routing from", start, "to", coords);
      const orsData = await fetchRoute(start, coords);
      if (!orsData || !orsData.features || orsData.features.length === 0) {
        setError("No route found.");
        setLoading(false);
        console.warn("No route found for:", start, coords, orsData);
        return;
      }
      const newRoutes = orsData.features.map((feature, idx) => ({
        id: idx + 1,
        time: Math.round(feature.properties.summary.duration / 60),
        desc: `Route ${idx + 1} to ${destination}`,
        geometry: feature.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
      }));
      setRoutes(newRoutes);
      console.log("Routes set:", newRoutes);
    } catch (err) {
      setError("Error fetching route.");
      console.error("Error in handleSearch:", err);
    }
    setLoading(false);
  };

  const startLabel = userCoords
    ? "Your Location"
    : userLocationStatus === "fail"
      ? DEFAULT_START + " (default)"
      : DEFAULT_START;

  const startCoords = userCoords || DEFAULT_START_COORDS;

  // Decide map center: user location if available, else Lagos
  const mapCenter = userCoords && !hasCenteredOnUser ? userCoords : DEFAULT_START_COORDS;

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-64px)] bg-[#eae6db] px-2">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] bg-[#232623] rounded-[32px] shadow-2xl p-4 sm:p-8 flex flex-col gap-4 sm:gap-6"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-[#eae6db] mb-2">Smart Route Planner</h1>
        {/* Search input */}
        <form onSubmit={handleSearch}>
          <div className="flex items-center bg-[#353835] rounded-2xl px-4 py-2 sm:px-5 sm:py-3 mb-1">
            <SearchIcon />
            <input
              type="text"
              placeholder="Enter destination or click map"
              value={destination}
              onChange={handleDestinationChange}
              className="bg-transparent border-none outline-none ml-3 text-base sm:text-lg text-[#eae6db] placeholder-[#bdbdbd] w-full"
              disabled={loading}
            />
            <button
              type="submit"
              className="ml-2 px-4 py-2 rounded-xl bg-[#6366f1] text-white font-semibold hover:bg-[#818cf8] transition"
              disabled={loading}
            >
              {loading ? "..." : "Go"}
            </button>
          </div>
        </form>
        {/* Start chip */}
        <div className="flex items-center bg-[#353835] rounded-2xl px-4 py-2 sm:px-5 sm:py-3 mb-1">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#bdbdbd] text-[#232623] font-bold mr-3">A</span>
          <span className="text-base sm:text-lg text-[#eae6db] truncate">{startLabel}</span>
          <span className="ml-auto">
            <svg className="w-6 h-6 text-[#bdbdbd]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
        {/* Show location error or manual request button */}
        {userLocationStatus === 'fail' && (
          <div className="text-red-400 text-center py-2">
            Location unavailable or denied.
            <button
              className="ml-2 px-3 py-1 rounded bg-[#6366f1] text-white text-sm"
              onClick={requestLocation}
              type="button"
            >
              Try Again
            </button>
          </div>
        )}
        {userLocationStatus === 'pending' && !userCoords && locationTried && (
          <div className="text-yellow-500 text-center py-2">
            Waiting for location permission...
            <button
              className="ml-2 px-3 py-1 rounded bg-[#6366f1] text-white text-sm"
              onClick={requestLocation}
              type="button"
            >
              Request Location
            </button>
          </div>
        )}
        {/* Alternative Routes */}
        <div className="text-lg sm:text-xl font-semibold text-[#eae6db] mt-2 mb-2">Alternative Routes</div>
        {/* OSM Map */}
        <div className="w-full rounded-3xl overflow-hidden mb-2" style={{height: '160px'}}>
          <MapContainer
            center={mapCenter}
            zoom={13}
            scrollWheelZoom={false}
            style={{ height: '160px', width: '100%' }}
            className="rounded-3xl"
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {/* Show user location marker */}
            {userCoords && (
              <>
                <Marker position={userCoords} icon={L.icon({ iconUrl: "https://cdn-icons-png.flaticon.com/512/64/64113.png", iconSize: [32, 32], iconAnchor: [16, 32] })}>
                  <Popup>Your Location</Popup>
                </Marker>
                <FlyToUserLocationOnce position={userCoords} hasCentered={hasCenteredOnUser} setHasCentered={setHasCenteredOnUser} />
              </>
            )}
            {/* Start marker (fallback) */}
            {!userCoords && (
              <Marker position={DEFAULT_START_COORDS}>
                <Popup>Start: {startLabel}</Popup>
              </Marker>
            )}
            {/* Destination marker */}
            {destCoords && (
              <>
                <Marker position={destCoords}>
                  <Popup>
                    {selectedOnMapAddress || destination}
                  </Popup>
                </Marker>
                <FlyToDestination position={destCoords} />
              </>
            )}
            {/* Allow selecting destination by clicking map */}
            <MapClickHandler />
            {/* Draw route(s) */}
            {routes.map(route => (
              <Polyline
                key={route.id}
                positions={route.geometry}
                color={route.id === 1 ? "#6366f1" : "#bdbdbd"}
                weight={route.id === 1 ? 6 : 4}
                opacity={route.id === 1 ? 0.9 : 0.6}
              />
            ))}
          </MapContainer>
        </div>
        {/* Route cards */}
        <div className="flex flex-col gap-3">
          {error && <div className="text-red-400 text-center py-2">{error}</div>}
          {!error && routes.length === 0 ? (
            <div className="text-[#bdbdbd] text-center py-4">Enter a destination or click the map to see routes</div>
          ) : (
            routes.map(route => (
              <div key={route.id} className="flex items-center bg-[#353835] rounded-2xl px-5 py-3">
                <ClockIcon />
                <span className="ml-4 text-lg text-[#eae6db]">{route.time} min</span>
                <span className="ml-4 text-sm text-[#bdbdbd] truncate">{route.desc}</span>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default MapView;
