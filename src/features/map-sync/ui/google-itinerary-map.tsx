"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import type { RouteCoordinate } from "@/features/map-sync/model/directions-adapter";
import type { Theme } from "@/shared/lib/theme-preference";

type GoogleLatLngLiteral = {
  lat: number;
  lng: number;
};

type GoogleMapInstance = {
  fitBounds: (bounds: GoogleLatLngBounds, padding?: number) => void;
  panTo: (position: GoogleLatLngLiteral) => void;
  setCenter: (position: GoogleLatLngLiteral) => void;
  setOptions: (options: { styles: readonly GoogleMapStyle[] }) => void;
  setZoom: (zoom: number) => void;
};

type GoogleLatLngBounds = {
  extend: (position: GoogleLatLngLiteral) => void;
};

type GoogleMarker = {
  setMap: (map: GoogleMapInstance | null) => void;
};

type GooglePolyline = {
  setMap: (map: GoogleMapInstance | null) => void;
};

type GoogleMapsEventListener = {
  remove: () => void;
};

type GoogleMapStyle = {
  elementType?: string;
  featureType?: string;
  stylers: readonly { color?: string; visibility?: "off" | "on" | "simplified" }[];
};

type GoogleMapsNamespace = {
  maps: {
    LatLngBounds: new () => GoogleLatLngBounds;
    Map: new (
      element: HTMLElement,
      options: {
        center: GoogleLatLngLiteral;
        clickableIcons: boolean;
        fullscreenControl: boolean;
        gestureHandling: "cooperative";
        mapTypeControl: boolean;
        styles: readonly GoogleMapStyle[];
        streetViewControl: boolean;
        zoom: number;
      },
    ) => GoogleMapInstance;
    Marker: new (options: {
      icon: {
        fillColor: string;
        fillOpacity: number;
        path: string | number;
        scale: number;
        strokeColor: string;
        strokeWeight: number;
      };
      label: string;
      map: GoogleMapInstance;
      position: GoogleLatLngLiteral;
      title: string;
      zIndex: number;
    }) => GoogleMarker & {
      addListener: (eventName: "click", handler: () => void) => GoogleMapsEventListener;
    };
    Polyline: new (options: {
      geodesic: boolean;
      map: GoogleMapInstance;
      path: GoogleLatLngLiteral[];
      strokeColor: string;
      strokeOpacity: number;
      strokeWeight: number;
    }) => GooglePolyline;
    SymbolPath: {
      CIRCLE: string | number;
    };
  };
};

declare global {
  interface Window {
    __tripmateGoogleMapsReady?: () => void;
    google?: GoogleMapsNamespace;
  }
}

const googleMapsScriptId = "tripmate-google-maps-javascript";
const googleMapsCallbackName = "__tripmateGoogleMapsReady";
let googleMapsLoadPromise: Promise<GoogleMapsNamespace> | null = null;
const noRouteCoordinates: readonly RouteCoordinate[] = [];

const darkGoogleMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#1b1b1b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#efefef" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#151515" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#4a4446" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#a9a3a5" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#242124" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#2b2729" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#c9c2c5" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#30262b" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#f1c5cf" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#3d383a" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#2a2729" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#e0dadd" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#575053" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#393336" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#322e30" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d8d0d3" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#292d38" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#bdc9ef" }] },
] as const satisfies readonly GoogleMapStyle[];

type GoogleItineraryMapMarker = {
  coordinate: RouteCoordinate;
  id: string;
  isSelected: boolean;
  name: string;
};

type GoogleItineraryMapProps = {
  destination: string;
  markers: readonly GoogleItineraryMapMarker[];
  onSelect: (itemId: string) => void;
  routeCoordinates?: readonly RouteCoordinate[];
};

type MapState = "error" | "loading" | "ready" | "limit";

class GoogleMapsAccessError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GoogleMapsAccessError";
  }
}

function getGoogleMapsNamespace() {
  const maps = window.google?.maps;

  return maps?.Map && maps?.Marker && maps?.Polyline && maps?.LatLngBounds ? window.google : null;
}

function loadGoogleMapsJavascript(apiKey: string): Promise<GoogleMapsNamespace> {
  const loadedGoogleMaps = getGoogleMapsNamespace();

  if (loadedGoogleMaps) {
    return Promise.resolve(loadedGoogleMaps);
  }

  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  googleMapsLoadPromise = new Promise<GoogleMapsNamespace>((resolve, reject) => {
    const existingScript = document.getElementById(googleMapsScriptId);

    if (existingScript) {
      googleMapsLoadPromise = null;
      reject(new Error("Google Maps JavaScript API를 불러오는 중입니다."));
      return;
    }

    const script = document.createElement("script");
    const parameters = new URLSearchParams({
      auth_referrer_policy: "origin",
      callback: googleMapsCallbackName,
      key: apiKey,
      language: "ko",
      loading: "async",
      region: "KR",
      v: "weekly",
    });

    const finish = (callback: () => void) => {
      delete window.__tripmateGoogleMapsReady;
      callback();
    };

    window.__tripmateGoogleMapsReady = () => {
      const loadedMaps = getGoogleMapsNamespace();

      if (!loadedMaps) {
        finish(() => reject(new Error("Google Maps JavaScript API를 초기화하지 못했습니다.")));
        return;
      }

      finish(() => resolve(loadedMaps));
    };

    script.async = true;
    script.id = googleMapsScriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?${parameters.toString()}`;
    script.onerror = () => {
      finish(() => reject(new Error("Google Maps JavaScript API를 불러오지 못했습니다.")));
    };
    document.head.append(script);
  }).catch((error: unknown) => {
    document.getElementById(googleMapsScriptId)?.remove();
    googleMapsLoadPromise = null;
    throw error;
  });

  return googleMapsLoadPromise;
}

async function reserveGoogleMapsAccess() {
  const response = await fetch("/api/google-maps-access", {
    cache: "no-store",
    method: "POST",
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: unknown } | null;
    const message =
      typeof data?.message === "string"
        ? data.message
        : "지도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";

    throw new GoogleMapsAccessError(response.status, message);
  }
}

function getMarkerLabel(index: number) {
  return index < 26 ? String.fromCharCode("A".charCodeAt(0) + index) : `${index + 1}`;
}

function toGoogleCoordinate(coordinate: RouteCoordinate): GoogleLatLngLiteral {
  return { lat: coordinate.latitude, lng: coordinate.longitude };
}

function getDocumentTheme(): Theme {
  if (typeof document === "undefined") {
    return "light";
  }

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getMapStyles(theme: Theme): readonly GoogleMapStyle[] {
  return theme === "dark" ? darkGoogleMapStyles : [];
}

function GoogleItineraryMapWithMarkers({
  destination,
  markers,
  onSelect,
  routeCoordinates = noRouteCoordinates,
}: GoogleItineraryMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_KEY?.trim() ?? "";
  const [mapState, setMapState] = useState<MapState>("loading");
  const [mapMessage, setMapMessage] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);
  const [theme, setTheme] = useState<Theme>(getDocumentTheme);
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const mapsRef = useRef<GoogleMapsNamespace | null>(null);
  const hasFittedBoundsRef = useRef(false);
  const accessPromiseRef = useRef<Promise<void> | null>(null);
  const handleMarkerSelect = useEffectEvent((itemId: string) => onSelect(itemId));

  const markersSignature = useMemo(
    () =>
      markers
        .map(
          (marker) =>
            `${marker.id}:${marker.coordinate.latitude}:${marker.coordinate.longitude}:${marker.isSelected}`,
        )
        .join("|"),
    [markers],
  );
  const routeSignature = useMemo(
    () => routeCoordinates.map((coordinate) => `${coordinate.latitude}:${coordinate.longitude}`).join("|"),
    [routeCoordinates],
  );

  const fitMapToMarkers = useCallback(() => {
    const map = mapRef.current;
    const maps = mapsRef.current?.maps;

    if (!map || !maps || markers.length === 0) {
      return;
    }

    if (markers.length === 1) {
      map.setCenter(toGoogleCoordinate(markers[0].coordinate));
      map.setZoom(14);
      return;
    }

    const bounds = new maps.LatLngBounds();
    markers.forEach((marker) => bounds.extend(toGoogleCoordinate(marker.coordinate)));
    map.fitBounds(bounds, 48);
  }, [markers]);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setTheme(getDocumentTheme());
    const observer = new MutationObserver(syncTheme);

    syncTheme();
    observer.observe(root, { attributeFilter: ["data-theme"], attributes: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!apiKey) {
      return;
    }

    let cancelled = false;

    const accessPromise = accessPromiseRef.current ?? reserveGoogleMapsAccess();
    accessPromiseRef.current = accessPromise;

    void accessPromise
      .then(() => {
        if (cancelled) {
          return null;
        }

        return loadGoogleMapsJavascript(apiKey);
      })
      .then((googleMaps) => {
        if (cancelled || !googleMaps || !canvasRef.current) {
          return;
        }

        mapsRef.current = googleMaps;
        mapRef.current = new googleMaps.maps.Map(canvasRef.current, {
          center: { lat: 37.5665, lng: 126.978 },
          clickableIcons: false,
          fullscreenControl: false,
          gestureHandling: "cooperative",
          mapTypeControl: false,
          styles: getMapStyles(getDocumentTheme()),
          streetViewControl: false,
          zoom: 12,
        });
        hasFittedBoundsRef.current = false;
        setMapState("ready");
      })
      .catch((error: unknown) => {
        accessPromiseRef.current = null;

        if (cancelled) {
          return;
        }

        if (error instanceof GoogleMapsAccessError && error.status === 429) {
          setMapMessage(error.message);
          setMapState("limit");
          return;
        }

        setMapMessage(
          error instanceof Error
            ? error.message
            : "지도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
        setMapState("error");
      });

    return () => {
      cancelled = true;
      mapRef.current = null;
      mapsRef.current = null;
      hasFittedBoundsRef.current = false;
    };
  }, [apiKey, retryVersion]);

  useEffect(() => {
    if (mapState !== "ready") {
      return;
    }

    mapRef.current?.setOptions({ styles: getMapStyles(theme) });
  }, [mapState, theme]);

  useEffect(() => {
    const maps = mapsRef.current?.maps;
    const map = mapRef.current;
    const mapMarkers: GoogleMarker[] = [];
    const listeners: GoogleMapsEventListener[] = [];
    let polyline: GooglePolyline | null = null;
    const cleanupMapObjects = () => {
      listeners.forEach((listener) => listener.remove());
      mapMarkers.forEach((marker) => marker.setMap(null));
      polyline?.setMap(null);
    };

    if (mapState !== "ready" || !maps || !map) {
      return cleanupMapObjects;
    }

    markers.forEach((marker, index) => {
      const isSelected = marker.isSelected;
      const mapMarker = new maps.Marker({
        icon: {
          fillColor: isSelected ? "#e00b41" : "#ff385c",
          fillOpacity: 1,
          path: maps.SymbolPath.CIRCLE,
          scale: isSelected ? 12 : 10,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
        label: getMarkerLabel(index),
        map,
        position: toGoogleCoordinate(marker.coordinate),
        title: marker.name,
        zIndex: isSelected ? 2 : 1,
      });

      mapMarkers.push(mapMarker);
      listeners.push(mapMarker.addListener("click", () => handleMarkerSelect(marker.id)));
    });

    if (routeCoordinates.length >= 2) {
      polyline = new maps.Polyline({
        geodesic: true,
        map,
        path: routeCoordinates.map(toGoogleCoordinate),
        strokeColor: "#ff385c",
        strokeOpacity: 0.86,
        strokeWeight: 4,
      });
    }

    if (!hasFittedBoundsRef.current) {
      fitMapToMarkers();
      hasFittedBoundsRef.current = true;
    } else {
      const selectedMarker = markers.find((marker) => marker.isSelected);

      if (selectedMarker) {
        map.panTo(toGoogleCoordinate(selectedMarker.coordinate));
      }
    }

    return cleanupMapObjects;
  }, [
    fitMapToMarkers,
    mapState,
    markers,
    markersSignature,
    routeCoordinates,
    routeSignature,
  ]);

  const mapLabel = `${destination} 선택 일정 지도`;
  const displayedMapState = apiKey ? mapState : "configuration";
  const displayedMapMessage =
    displayedMapState === "configuration" ? "지도 키 설정을 확인해 주세요." : mapMessage;
  const canRetry = displayedMapState === "error";

  return (
    <div className="google-map" role="region" aria-label={mapLabel}>
      <div ref={canvasRef} className="google-map-canvas" aria-hidden={displayedMapState !== "ready"} />

      {displayedMapState === "ready" ? (
        <button className="google-map-fit-button" type="button" onClick={fitMapToMarkers}>
          일정 전체 보기
        </button>
      ) : (
        <div className="google-map-state" role="status">
          <strong>
            {displayedMapState === "loading"
                ? "실제 지도를 불러오는 중이에요"
                : "지도를 표시하지 못했어요"}
          </strong>
          <p>
            {displayedMapMessage || "잠시 후 다시 시도해 주세요."}
          </p>
          {canRetry ? (
            <button type="button" onClick={() => setRetryVersion((version) => version + 1)}>
              지도 다시 시도
            </button>
          ) : null}
        </div>
      )}

      <ul className="sr-only" aria-label="지도 장소 목록">
        {markers.map((marker) => (
          <li key={marker.id}>
            <button
              type="button"
              aria-label={`${marker.name} 지도에서 선택`}
              aria-pressed={marker.isSelected}
              onClick={() => onSelect(marker.id)}
            >
              {marker.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyGoogleItineraryMap({ destination }: Pick<GoogleItineraryMapProps, "destination">) {
  return (
    <div className="google-map" role="region" aria-label={`${destination} 선택 일정 지도`}>
      <div className="google-map-state" role="status">
        <strong>아직 지도에 표시할 장소가 없어요</strong>
        <p>장소를 추가하면 해당 위치를 지도에서 바로 확인할 수 있어요.</p>
      </div>
    </div>
  );
}

export function GoogleItineraryMap(props: GoogleItineraryMapProps) {
  if (props.markers.length === 0) {
    return <EmptyGoogleItineraryMap destination={props.destination} />;
  }

  return <GoogleItineraryMapWithMarkers {...props} />;
}
