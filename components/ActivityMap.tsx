"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";

interface LatLon {
  lat: number;
  lon: number;
}

interface ActivityMapProps {
  points: LatLon[];
}

const startIcon = L.divIcon({
  className: "",
  html: '<div style="width:12px;height:12px;border-radius:50%;background:#16a34a;border:2px solid white"></div>',
  iconSize: [12, 12],
});

const endIcon = L.divIcon({
  className: "",
  html: '<div style="width:12px;height:12px;border-radius:50%;background:#dc2626;border:2px solid white"></div>',
  iconSize: [12, 12],
});

function FitBounds({ points }: { points: LatLon[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon]));
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, points]);

  return null;
}

export default function ActivityMap({ points }: ActivityMapProps) {
  if (points.length === 0) return null;

  const positions: [number, number][] = points.map((p) => [p.lat, p.lon]);
  const start = points[0];
  const end = points[points.length - 1];

  return (
    <MapContainer
      center={positions[0]}
      zoom={13}
      scrollWheelZoom={false}
      className="h-80 w-full rounded border border-foreground/10"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <Polyline positions={positions} pathOptions={{ color: "#2563eb", weight: 3 }} />
      <Marker position={[start.lat, start.lon]} icon={startIcon} />
      <Marker position={[end.lat, end.lon]} icon={endIcon} />
      <FitBounds points={points} />
    </MapContainer>
  );
}
