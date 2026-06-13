import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Red Icon for User's Location
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const NearbyWorkshops = () => {
    const [userLocation, setUserLocation] = useState(null);
    const [error, setError] = useState(null);

    // Dummy data: In a real app, this would be fetched from an API (like Overpass API or Google Places)
    // based on the user's current location.
    const [workshops, setWorkshops] = useState([]);

    useEffect(() => {
        // Try to get user's location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = [position.coords.latitude, position.coords.longitude];
                    setUserLocation(loc);
                    
                    // Generate dummy workshops around the user's location
                    setWorkshops([
                        {
                            id: 1,
                            name: "Bengkel Motor Jaya",
                            lat: loc[0] + 0.01,
                            lng: loc[1] + 0.01,
                            distance: "1.2 km"
                        },
                        {
                            id: 2,
                            name: "Servis Resmi Ahass",
                            lat: loc[0] - 0.015,
                            lng: loc[1] + 0.005,
                            distance: "2.0 km"
                        },
                        {
                            id: 3,
                            name: "Bengkel Umum Sejahtera",
                            lat: loc[0] + 0.005,
                            lng: loc[1] - 0.01,
                            distance: "0.8 km"
                        }
                    ]);
                },
                (err) => {
                    setError("Gagal mendapatkan lokasi. Pastikan GPS menyala dan izin diberikan.");
                    // Default location (e.g., Jakarta)
                    setUserLocation([-6.200000, 106.816666]);
                }
            );
        } else {
            setError("Browser Anda tidak mendukung Geolocation.");
            setUserLocation([-6.200000, 106.816666]);
        }
    }, []);

    const openInGoogleMaps = (lat, lng) => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, '_blank');
    };

    // Component to center map when userLocation changes
    const MapUpdater = ({ center }) => {
        const map = useMap();
        map.setView(center, map.getZoom());
        return null;
    };

    if (!userLocation) {
        return <div className="loading-state">Mencari lokasi Anda...</div>;
    }

    return (
        <div className="nearby-workshops glass-panel" style={{ marginTop: '20px', overflow: 'hidden' }}>
            <h3 style={{ padding: '15px', margin: 0, borderBottom: '1px solid var(--border-color)' }}>
                📍 Bengkel Terdekat
            </h3>
            
            {/* Map Legend */}
            <div style={{ padding: '10px 15px', fontSize: '13px', display: 'flex', gap: '15px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png" alt="Merah" style={{ width: '12px', height: '20px' }} />
                    <span style={{ fontWeight: '500' }}>Lokasi Anda</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={icon} alt="Biru" style={{ width: '12px', height: '20px' }} />
                    <span style={{ fontWeight: '500' }}>Bengkel Rekomendasi</span>
                </div>
            </div>

            {error && <div style={{ padding: '10px', color: 'var(--red)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>{error}</div>}
            
            <MapContainer 
                center={userLocation} 
                zoom={13} 
                scrollWheelZoom={false}
                style={{ 
                    height: '50vh', 
                    minHeight: '300px', 
                    maxHeight: '400px', 
                    width: '100%',
                    zIndex: 0 // Prevent map from overlapping with mobile sticky headers/navs
                }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapUpdater center={userLocation} />

                {/* User's Location Marker */}
                <Marker position={userLocation} icon={userIcon}>
                    <Popup>
                        <strong style={{ fontSize: '14px' }}>Lokasi Anda Saat Ini</strong>
                    </Popup>
                </Marker>

                {/* Workshops Markers */}
                {workshops.map(workshop => (
                    <Marker key={workshop.id} position={[workshop.lat, workshop.lng]}>
                        <Popup>
                            <div style={{ textAlign: 'center', minWidth: '150px' }}>
                                <h4 style={{ margin: '0 0 5px 0', fontSize: '15px' }}>{workshop.name}</h4>
                                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#666' }}>
                                    Estimasi jarak: <strong>{workshop.distance}</strong>
                                </p>
                                <button 
                                    onClick={() => openInGoogleMaps(workshop.lat, workshop.lng)}
                                    style={{
                                        backgroundColor: '#4285F4',
                                        color: 'white',
                                        border: 'none',
                                        padding: '12px 16px', // Larger touch target for mobile
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        width: '100%',
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                        boxShadow: '0 2px 4px rgba(66,133,244,0.3)'
                                    }}
                                >
                                    🛣️ Arahkan (Google Maps)
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default NearbyWorkshops;
