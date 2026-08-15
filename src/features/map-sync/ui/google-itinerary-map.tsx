"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { RouteCoordinate } from "@/features/map-sync/model/directions-adapter";

type GoogleLatLngLiteral = {
  lat: number;
  lng: number;
};

type GoogleMapInstance = {
  fitBounds: (bounds: GoogleLatLngBounds, padding?: number) => void;
  panTo: (position: GoogleLatLngLiteral) => void;
  setCenter: (position: GoogleLatLngLiteral) => void;
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

type GoogleMapsEventListener = object;

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
    event: {
      removeListener: (listener: GoogleMapsEventListener) => void;
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

  if (response.ok) {
    return;
  }

  const data = (await response.json().catch(() => null)) as { message?: unknown } | null;
  const message =
    typeof data?.message === "string"
      ? data.message
      : "지도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";

  throw new GoogleMapsAccessError(response.status, message);
}

function getMarkerLabel(index: number) {
  return index < 26 ? String.fromCharCode("A".charCodeAt(0) + index) : `${index + 1}`;
}

function toGoogleCoordinate(coordinate: RouteCoordinate): GoogleLatLngLiteral {
  return { lat: coordinate.latitude, lng: coordinate.longitude };
}

function GoogleItineraryMapWithMarkers({
  destination,
  markers,
  onSelect,
  routeCoordinates = [],
}: GoogleItineraryMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_KEY?.trim() ?? "";
  const [mapState, setMapState] = useState<MapState>("loading");
  const [mapMessage, setMapMessage] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const mapsRef = useRef<GoogleMapsNamespace | null>(null);
  const markerRefs = useRef<GoogleMarker[]>([]);
  const listenerRefs = useRef<GoogleMapsEventListener[]>([]);
  const polylineRef = useRef<GooglePolyline | null>(null);
  const hasFittedBoundsRef = useRef(false);
  const accessPromiseRef = useRef<Promise<void> | null>(null);

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

  const clearMapObjects = useCallback(() => {
    const maps = mapsRef.current?.maps;

    listenerRefs.current.forEach((listener) => maps?.event.removeListener(listener));
    listenerRefs.current = [];
    markerRefs.current.forEach((marker) => marker.setMap(null));
    markerRefs.current = [];
    polylineRef.current?.setMap(null);
    polylineRef.current = null;
  }, []);

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
      clearMapObjects();
      mapRef.current = null;
      mapsRef.current = null;
      hasFittedBoundsRef.current = false;
    };
  }, [apiKey, clearMapObjects, retryVersion]);

  useEffect(() => {
    const maps = mapsRef.current?.maps;
    const map = mapRef.current;

    if (mapState !== "ready" || !maps || !map) {
      return;
    }

    clearMapObjects();

    markers.forEach((marker, index) => {
      const isSelected = marker.isSelected;
      const mapMarker = new maps.Marker({
        icon: {
          fillColor: isSelected ? "#185b3c" : "#277052",
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

      markerRefs.current.push(mapMarker);
      listenerRefs.current.push(mapMarker.addListener("click", () => onSelect(marker.id)));
    });

    if (routeCoordinates.length >= 2) {
      polylineRef.current = new maps.Polyline({
        geodesic: true,
        map,
        path: routeCoordinates.map(toGoogleCoordinate),
        strokeColor: "#ee6c5d",
        strokeOpacity: 0.86,
        strokeWeight: 4,
      });
    }

    if (!hasFittedBoundsRef.current) {
      fitMapToMarkers();
      hasFittedBoundsRef.current = true;
      return;
    }

    const selectedMarker = markers.find((marker) => marker.isSelected);

    if (selectedMarker) {
      map.panTo(toGoogleCoordinate(selectedMarker.coordinate));
    }
  }, [
    clearMapObjects,
    fitMapToMarkers,
    mapState,
    markers,
    markersSignature,
    onSelect,
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
