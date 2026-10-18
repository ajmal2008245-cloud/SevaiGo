"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { MechanicView } from "@/lib/mechanic-shared";
import { Layers, MapPin, Navigation, Phone, ShieldCheck } from "lucide-react";
import { formatPhoneDisplay, getTelUri } from "@/lib/phone";

export type MapLocation = { latitude: number; longitude: number; label: string; source: "demo" | "gps" | "manual" };

type Props = {
  shops?: MechanicView[];
  location: MapLocation;
  radiusKm?: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  pickerMode?: boolean;
  pickedLocation?: { latitude: number; longitude: number } | null;
  onPickLocation?: (coords: { latitude: number; longitude: number }) => void;
  onCallMechanic?: (shop: MechanicView) => void;
};

const wrenchSvg = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-5.6 5.6a2 2 0 0 0 2.8 2.8l5.6-5.6a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.8-2.8 2.6-2.6Z"/></svg>';
const storePinSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>';

export default function MechanicMap({
  shops = [],
  location,
  radiusKm = 5,
  selectedId = null,
  onSelect = () => {},
  pickerMode = false,
  pickedLocation = null,
  onPickLocation = () => {},
  onCallMechanic,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef<Leaflet.LayerGroup | null>(null);
  const circleRef = useRef<Leaflet.Circle | null>(null);
  const streetLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const satelliteLayerRef = useRef<Leaflet.TileLayer | null>(null);
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(onPickLocation);
  const onCallRef = useRef(onCallMechanic);
  const [ready, setReady] = useState(false);
  const [mapType, setMapType] = useState<"street" | "satellite">("street");

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onPickRef.current = onPickLocation; }, [onPickLocation]);
  useEffect(() => { onCallRef.current = onCallMechanic; }, [onCallMechanic]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as unknown as { __sevaigoCallMechanic?: (id: string) => void }).__sevaigoCallMechanic = (id: string) => {
        const target = shops.find((s) => s.id === id);
        if (target && onCallRef.current) {
          onCallRef.current(target);
        }
      };
    }
  }, [shops]);

  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | null = null;
    async function setup() {
      const L = await import("leaflet");
      if (disposed || !containerRef.current || mapRef.current) return;
      const initialLat = pickedLocation ? pickedLocation.latitude : location.latitude;
      const initialLng = pickedLocation ? pickedLocation.longitude : location.longitude;
      const map = L.map(containerRef.current, { zoomControl: false, scrollWheelZoom: false })
        .setView([initialLat, initialLng], 13);

      const streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      });

      const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      });

      streetLayerRef.current = streetLayer;
      satelliteLayerRef.current = satelliteLayer;

      // Start with street layer
      streetLayer.addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      leafletRef.current = L;
      mapRef.current = map;
      markersRef.current = L.layerGroup().addTo(map);

      circleRef.current = L.circle([location.latitude, location.longitude], {
        radius: radiusKm * 1000,
        color: "#2563eb",
        weight: 1.5,
        dashArray: "6 6",
        opacity: 0.6,
        fillColor: "#3b82f6",
        fillOpacity: 0.04,
        interactive: false,
      }).addTo(map);

      // Picker click handler
      map.on("click", (e: Leaflet.LeafletMouseEvent) => {
        if (pickerMode) {
          onPickRef.current({ latitude: e.latlng.lat, longitude: e.latlng.lng });
        }
      });

      if (containerRef.current && typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
        observer.observe(containerRef.current);
      }
      setTimeout(() => { if (!disposed) map.invalidateSize({ pan: false }); }, 200);
      setReady(true);
    }
    setup();
    return () => {
      disposed = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      markersRef.current = null;
      circleRef.current = null;
      streetLayerRef.current = null;
      satelliteLayerRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerMode]);

  // Toggle Map Type
  const handleToggleMapType = (type: "street" | "satellite") => {
    setMapType(type);
    const map = mapRef.current;
    if (!map || !streetLayerRef.current || !satelliteLayerRef.current) return;
    if (type === "satellite") {
      map.removeLayer(streetLayerRef.current);
      map.addLayer(satelliteLayerRef.current);
    } else {
      map.removeLayer(satelliteLayerRef.current);
      map.addLayer(streetLayerRef.current);
    }
  };

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const group = markersRef.current;
    if (!ready || !L || !map || !group) return;
    group.clearLayers();

    if (pickerMode) {
      // In picker mode, show picked location marker
      if (pickedLocation) {
        const pickerIcon = L.divIcon({
          className: "map-icon-reset",
          html: `<div class="map-shop-pin active picker-pin" style="background:#dc2626;box-shadow:0 0 20px rgba(220,38,38,0.6);border-color:#fff;"><span>${storePinSvg}</span></div>`,
          iconSize: [52, 58],
          iconAnchor: [26, 52],
        });
        const marker = L.marker([pickedLocation.latitude, pickedLocation.longitude], {
          icon: pickerIcon,
          draggable: true,
          zIndexOffset: 1000,
        }).addTo(group);

        marker.on("dragend", (e: Leaflet.LeafletEvent) => {
          const target = e.target as Leaflet.Marker;
          const pos = target.getLatLng();
          onPickRef.current({ latitude: pos.lat, longitude: pos.lng });
        });
      }
      return;
    }

    // Normal mode: only show user marker when real GPS permission is granted
    if (location.source === "gps") {
      const userIcon = L.divIcon({
        className: "map-icon-reset",
        html: '<div class="map-user-pulse"><span class="map-user-dot"></span></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      L.marker([location.latitude, location.longitude], { icon: userIcon, zIndexOffset: 500 })
        .bindTooltip("You Are Here", { direction: "top", offset: [0, -15], className: "map-tooltip-badge" })
        .addTo(group);
    }

    // Place markers ONLY for genuine registered mechanics from the database
    shops.forEach((shop) => {
      const active = selectedId === shop.id;
      const isAvailable = shop.availabilityStatus === "available";
      const isBusy = shop.availabilityStatus === "busy";
      const pinColor = isAvailable ? "#16a34a" : isBusy ? "#d97706" : "#64748b";

      const icon = L.divIcon({
        className: "map-icon-reset",
        html: `<div class="map-shop-pin ${active ? "active" : ""} ${!shop.isOpen ? "closed" : ""}" style="border-color:${pinColor};${active ? `box-shadow:0 0 16px ${pinColor};` : ""}"><span>${wrenchSvg}</span></div>`,
        iconSize: active ? [52, 58] : [44, 50],
        iconAnchor: active ? [26, 53] : [22, 45],
      });

      const marker = L.marker([shop.latitude, shop.longitude], { icon, zIndexOffset: active ? 400 : 100 })
        .on("click", () => onSelectRef.current(shop.id))
        .addTo(group);

      const statusBadge = isAvailable
        ? '<span style="color:#16a34a;font-weight:600;">● Available</span>'
        : isBusy
        ? '<span style="color:#d97706;font-weight:600;">● Busy</span>'
        : '<span style="color:#64748b;font-weight:600;">○ Offline</span>';

      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
      const telUri = getTelUri(shop.phone);
      const displayPhone = formatPhoneDisplay(shop.phone);

      marker.bindPopup(`
        <div style="font-family:inherit;min-width:200px;padding:4px;">
          <div style="font-weight:800;font-size:14px;color:#1e293b;margin-bottom:2px;">${shop.shopName}</div>
          <div style="font-size:12px;color:#64748b;margin-bottom:4px;">${shop.distanceKm} km away • ${statusBadge}</div>
          <div style="font-size:12px;color:#334155;margin-bottom:6px;">${shop.address}</div>
          <div style="font-size:12px;color:#16a34a;font-weight:700;margin-bottom:8px;">📞 ${displayPhone}</div>
          <div style="display:flex;gap:6px;margin-top:6px;">
            <a href="${telUri || '#'}" onclick="if (window.__sevaigoCallMechanic) { window.__sevaigoCallMechanic('${shop.id}'); } ${!telUri ? 'alert(\'No valid phone number registered for this workshop.\'); return false;' : ''}" style="flex:1;background:#16a34a;color:#fff;text-align:center;padding:7px 10px;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none;display:inline-block;">Call Mechanic</a>
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="flex:1;background:#f1f5f9;color:#0f172a;text-align:center;padding:7px 10px;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none;display:inline-block;">Directions</a>
          </div>
        </div>
      `);
    });

    // Update search radius circle
    if (circleRef.current) {
      circleRef.current.setLatLng([location.latitude, location.longitude]);
      circleRef.current.setRadius(radiusKm * 1000);
    }
  }, [shops, location, selectedId, ready, pickerMode, pickedLocation, radiusKm]);

  useEffect(() => {
    if (ready && !pickerMode) {
      mapRef.current?.flyTo([location.latitude, location.longitude], radiusKm > 20 ? 11 : radiusKm > 10 ? 12 : 13, { duration: 0.75 });
    }
  }, [location.latitude, location.longitude, ready, pickerMode, radiusKm]);

  useEffect(() => {
    if (ready && pickerMode && pickedLocation) {
      mapRef.current?.panTo([pickedLocation.latitude, pickedLocation.longitude], { animate: true, duration: 0.5 });
    }
  }, [pickedLocation?.latitude, pickedLocation?.longitude, ready, pickerMode]);

  useEffect(() => {
    if (!ready || !selectedId || pickerMode) return;
    const shop = shops.find((item) => item.id === selectedId);
    if (shop) mapRef.current?.panTo([shop.latitude, shop.longitude], { animate: true, duration: 0.5 });
  }, [selectedId, ready, shops, pickerMode]);

  return (
    <div className="relative w-full h-full min-h-[300px]">
      {/* Map Satellite Toggle Control */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-lg shadow-md border border-slate-200 dark:border-slate-800 p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => handleToggleMapType("street")}
          className={`px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
            mapType === "street"
              ? "bg-blue-600 text-white shadow-sm font-semibold"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
          }`}
          title="Standard Street Map"
        >
          <Layers className="w-3.5 h-3.5" />
          Street
        </button>
        <button
          type="button"
          onClick={() => handleToggleMapType("satellite")}
          className={`px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
            mapType === "satellite"
              ? "bg-blue-600 text-white shadow-sm font-semibold"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
          }`}
          title="Satellite Imagery"
        >
          <Layers className="w-3.5 h-3.5" />
          Satellite
        </button>
      </div>

      <div ref={containerRef} className="mechanic-map w-full h-full" role="application" aria-label="Map of registered nearby mechanics" />
    </div>
  );
}

