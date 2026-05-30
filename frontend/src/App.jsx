import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDoctor, getFloor, getFloors, getRoute } from "./api/api";
import QRScanPage from "./components/QRScanPage";
import NavigationMap from "./components/NavigationMap";
import DirectionPanel from "./components/DirectionPanel";
import DoctorDestinationCard from "./components/DoctorDestinationCard";
import ARCameraNavigation from "./components/ARCameraNavigation";
import CurrentLocationCard from "./components/CurrentLocationCard";
import DestinationSelector from "./components/DestinationSelector";
import DestinationDetailsCard from "./components/DestinationDetailsCard";
import NavigationActionPanel from "./components/NavigationActionPanel";
import { createMotionTrackingService } from "./services/motionTrackingService";
import {
  createInitialNavigationState,
  progressPercentFromState,
  updateNavigationState
} from "./services/navigationEngine";
import { trackNavigationEvent } from "./services/navigationAnalytics";
import { buildRouteOptions, routeOptionById } from "./services/routeOptions";

const DEFAULT_DOCTOR_ID = "D001";
const LIVE_FLOOR_ID = "ground-live";
const RECEPTION_LOCATION = {
  floor: LIVE_FLOOR_ID,
  location_id: "QR_RECEPTION_GROUND",
  node_id: "main_entrance",
  x: 650,
  y: 540,
  label: "Main Entrance",
  name: "Main Entrance"
};

const QR_ANCHORS = {
  QR_RECEPTION_GROUND: RECEPTION_LOCATION,
  QR_RECEPTION_BLOCK: {
    floor: LIVE_FLOOR_ID,
    location_id: "QR_RECEPTION_BLOCK",
    node_id: "reception",
    x: 240,
    y: 520,
    label: "Reception Block",
    name: "Reception Block"
  },
  QR_AHLL_IT: {
    floor: LIVE_FLOOR_ID,
    location_id: "QR_AHLL_IT",
    node_id: "ahll_it_department",
    x: 600,
    y: 400,
    label: "AHLL IT Department",
    name: "AHLL IT Department"
  },
  QR_FOOD_COURT: {
    floor: LIVE_FLOOR_ID,
    location_id: "QR_FOOD_COURT",
    node_id: "food_court",
    x: 720,
    y: 115,
    label: "Food Court",
    name: "Food Court"
  },
  QR_CAFE_AREA: {
    floor: LIVE_FLOOR_ID,
    location_id: "QR_CAFE_AREA",
    node_id: "cafe_area",
    x: 650,
    y: 465,
    label: "Cafe Area",
    name: "Cafe Area"
  }
};

const DEFAULT_LIVE_START_LOCATION = QR_ANCHORS.QR_AHLL_IT;

const LIVE_DESTINATIONS = [
  { room_id: "ahll_it_department", name: "AHLL IT Department" },
  { room_id: "qa_team", name: "QA Team" },
  { room_id: "apollo_rd_team", name: "Apollo R&D Team" },
  { room_id: "discussion_room_1", name: "Discussion Room 1" },
  { room_id: "discussion_room_2", name: "Discussion Room 2" },
  { room_id: "discussion_room_3", name: "Discussion Room 3" },
  { room_id: "discussion_room_4", name: "Discussion Room 4" },
  { room_id: "discussion_room_5", name: "Discussion Room 5" },
  { room_id: "discussion_room_6", name: "Discussion Room 6" },
  { room_id: "discussion_room_7", name: "Discussion Room 7" },
  { room_id: "discussion_room_8", name: "Discussion Room 8" },
  { room_id: "discussion_room_9", name: "Discussion Room 9" },
  { room_id: "cafe_area", name: "Cafe Area" },
  { room_id: "food_court", name: "Food Court" },
  { room_id: "toilet_1", name: "Toilet 1" },
  { room_id: "toilet_2", name: "Toilet 2" },
  { room_id: "toilet_3", name: "Toilet 3" },
  { room_id: "toilet_4", name: "Toilet 4" },
  { room_id: "reception", name: "Reception Block" },
  { room_id: "exit", name: "Main Exit" }
];

const interpolateRouteLocation = (route, progress) => {
  if (!route?.length) {
    return null;
  }

  if (route.length === 1) {
    return route[0];
  }

  const segments = route.slice(1).map((point, index) => {
    const previous = route[index];
    return {
      from: previous,
      to: point,
      length: Math.hypot(point.x - previous.x, point.y - previous.y)
    };
  });
  const totalLength = segments.reduce((total, segment) => total + segment.length, 0);
  let distance = Math.min(1, Math.max(0, progress / 100)) * totalLength;

  const segment = segments.find((item) => {
    if (distance <= item.length) {
      return true;
    }
    distance -= item.length;
    return false;
  }) || segments[segments.length - 1];
  const ratio = segment.length ? distance / segment.length : 0;

  return {
    floor: segment.to.floor,
    x: segment.from.x + (segment.to.x - segment.from.x) * ratio,
    y: segment.from.y + (segment.to.y - segment.from.y) * ratio,
    node_id: segment.to.node_id,
    label: ratio > 0.82 ? segment.to.label : "Moving on route"
  };
};

const initialMotionDebug = (status = "Sensors idle") => ({
  steps: 0,
  distanceMeters: 0,
  heading: 0,
  calibratedHeading: 0,
  isMoving: false,
  movementState: "standing",
  sensorActive: false,
  permissionState: "idle",
  motionEvents: 0,
  orientationEvents: 0,
  accelerometerEvents: 0,
  gyroscopeEvents: 0,
  accelerationDelta: 0,
  locationStatus: "Mobile location idle",
  mobileLocation: null,
  status
});

function App() {
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(LIVE_FLOOR_ID);
  const [floorMap, setFloorMap] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [scanPayload, setScanPayload] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [routeOptions, setRouteOptions] = useState([]);
  const [selectedRouteOptionId, setSelectedRouteOptionId] = useState("fastest");
  const [rerouteNotice, setRerouteNotice] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("");
  const [liveTrackingEnabled, setLiveTrackingEnabled] = useState(false);
  const [currentLiveLocation, setCurrentLiveLocation] = useState(null);
  const [qrAnchorLocation, setQrAnchorLocation] = useState(DEFAULT_LIVE_START_LOCATION);
  const [liveRouteProgress, setLiveRouteProgress] = useState(0);
  const [navigationState, setNavigationState] = useState(() =>
    createInitialNavigationState({ startLocation: DEFAULT_LIVE_START_LOCATION })
  );
  const [navigationRunning, setNavigationRunning] = useState(false);
  const [arrivalComplete, setArrivalComplete] = useState(false);
  const [motionDebug, setMotionDebug] = useState(initialMotionDebug());
  const [mapMode, setMapMode] = useState("map");
  const [status, setStatus] = useState("Ready for AHLL IT QR scan");
  const [error, setError] = useState("");
  const trackerRef = useRef(null);
  const lastRawMotionDistanceRef = useRef(0);
  const headingBaselineRef = useRef(null);
  const navigationStartedAtRef = useRef(0);
  const navigationStateRef = useRef(navigationState);
  const routeAlertStartedAtRef = useRef(null);
  const lastAlertTypeRef = useRef("");
  const rerouteTriggeredRef = useRef(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [floorList, defaultDoctor] = await Promise.all([
          getFloors(),
          getDoctor(DEFAULT_DOCTOR_ID)
        ]);
        setFloors(floorList);
        setDoctor(defaultDoctor);
      } catch (err) {
        setError("Unable to load hospital data. Start the backend on port 5001.");
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    const loadSelectedFloor = async () => {
      try {
        const data = await getFloor(selectedFloor);
        setFloorMap(data);
      } catch (err) {
        setError(`Unable to load ${selectedFloor}`);
      }
    };

    loadSelectedFloor();
  }, [selectedFloor]);

  useEffect(() => {
    navigationStateRef.current = navigationState;
  }, [navigationState]);

  const handleScan = useCallback((payload) => {
    const parsedPayload = typeof payload === "string" ? JSON.parse(payload) : payload;
    const livePayload = {
      ...parsedPayload,
      floor: parsedPayload.floor || parsedPayload.currentFloor || LIVE_FLOOR_ID,
      location_id: parsedPayload.location_id || parsedPayload.currentLocation || "QR_AHLL_IT"
    };

    setError("");
    setRouteResult(null);
    setRouteOptions([]);
    setSelectedRouteOptionId("fastest");
    setRerouteNotice("");
    setSelectedDestination("");
    const qrAnchor = QR_ANCHORS[livePayload.location_id] || DEFAULT_LIVE_START_LOCATION;
    setCurrentLiveLocation(qrAnchor);
    setQrAnchorLocation(qrAnchor);
    setLiveRouteProgress(0);
    const initialNavigationState = createInitialNavigationState({ startLocation: qrAnchor });
    navigationStateRef.current = initialNavigationState;
    setNavigationState(initialNavigationState);
    setNavigationRunning(false);
    setArrivalComplete(false);
    trackerRef.current?.reset();
    lastRawMotionDistanceRef.current = 0;
    headingBaselineRef.current = null;
    routeAlertStartedAtRef.current = null;
    lastAlertTypeRef.current = "";
    rerouteTriggeredRef.current = false;
    setMotionDebug(initialMotionDebug(`${qrAnchor.label} QR anchored`));
    setLiveTrackingEnabled(true);
    setScanPayload(livePayload);
    setSelectedFloor(livePayload.floor);
    trackNavigationEvent("qr_recalibration", { locationId: livePayload.location_id, floor: livePayload.floor });

    setStatus(`Live tracking enabled: ${qrAnchor.label}`);
  }, []);

  const startRoute = useCallback(async (destinationRoomId) => {
    if (!scanPayload) {
      setError("Scan or simulate the AHLL IT QR first.");
      return;
    }

    setSelectedDestination(destinationRoomId);
    setError("");

    try {
      const result = await getRoute({
        current_location_id: scanPayload.location_id,
        destination_room_id: destinationRoomId
      });
      const options = buildRouteOptions(result);
      const initialState = createInitialNavigationState({
        route: result.route,
        startLocation: result.current_location,
        destination: result.destination
      });
      setRouteResult(result);
      setRouteOptions(options);
      setSelectedRouteOptionId(options[0]?.id || "fastest");
      setRerouteNotice("");
      setLiveRouteProgress(0);
      navigationStateRef.current = initialState;
      setNavigationState(initialState);
      setCurrentLiveLocation(initialState.snappedPosition || result.current_location);
      setSelectedFloor(result.current_location.floor);
      setMapMode("map");
      setLiveTrackingEnabled(true);
      setNavigationRunning(false);
      setArrivalComplete(false);
      trackerRef.current?.reset();
      lastRawMotionDistanceRef.current = 0;
      headingBaselineRef.current = null;
      routeAlertStartedAtRef.current = null;
      lastAlertTypeRef.current = "";
      rerouteTriggeredRef.current = false;
      setMotionDebug(initialMotionDebug("Route ready"));
      setStatus(`Route ready: ${result.current_location.name} to ${result.destination.name}`);
      trackNavigationEvent("destination_selected", {
        destinationRoomId,
        destinationName: result.destination.name,
        distanceMeters: result.distance_meters
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to calculate route");
    }
  }, [scanPayload]);

  const handleManualNavigate = useCallback(async (destinationRoomId) => {
    const receptionPayload = {
      floor: LIVE_FLOOR_ID,
      location_id: "QR_AHLL_IT",
      currentLocation: "ahll_it_department",
      currentFloor: LIVE_FLOOR_ID
    };

    setScanPayload(receptionPayload);
    setCurrentLiveLocation(DEFAULT_LIVE_START_LOCATION);
    setQrAnchorLocation(DEFAULT_LIVE_START_LOCATION);
    setLiveRouteProgress(0);
    setRouteOptions([]);
    setSelectedRouteOptionId("fastest");
    setRerouteNotice("");
    const initialNavigationState = createInitialNavigationState({ startLocation: DEFAULT_LIVE_START_LOCATION });
    navigationStateRef.current = initialNavigationState;
    setNavigationState(initialNavigationState);
    setNavigationRunning(false);
    setArrivalComplete(false);
    trackerRef.current?.reset();
    lastRawMotionDistanceRef.current = 0;
    headingBaselineRef.current = null;
    routeAlertStartedAtRef.current = null;
    lastAlertTypeRef.current = "";
    rerouteTriggeredRef.current = false;
    setMotionDebug(initialMotionDebug("AHLL IT QR anchored"));
    setLiveTrackingEnabled(true);
    setSelectedFloor(LIVE_FLOOR_ID);
    setStatus("Live tracking enabled: AHLL IT Department");
    setSelectedDestination(destinationRoomId);
    setError("");

    try {
      const result = await getRoute({
        current_location_id: receptionPayload.location_id,
        destination_room_id: destinationRoomId
      });
      const options = buildRouteOptions(result);
      const initialState = createInitialNavigationState({
        route: result.route,
        startLocation: result.current_location,
        destination: result.destination
      });
      setRouteResult(result);
      setRouteOptions(options);
      setSelectedRouteOptionId(options[0]?.id || "fastest");
      setRerouteNotice("");
      setLiveRouteProgress(0);
      navigationStateRef.current = initialState;
      setNavigationState(initialState);
      setCurrentLiveLocation(initialState.snappedPosition || result.current_location);
      setMapMode("map");
      setNavigationRunning(false);
      setArrivalComplete(false);
      trackerRef.current?.reset();
      lastRawMotionDistanceRef.current = 0;
      headingBaselineRef.current = null;
      routeAlertStartedAtRef.current = null;
      lastAlertTypeRef.current = "";
      rerouteTriggeredRef.current = false;
      setMotionDebug(initialMotionDebug("Route ready"));
      setStatus(`Route ready: ${result.current_location.name} to ${result.destination.name}`);
      trackNavigationEvent("destination_selected", {
        destinationRoomId,
        destinationName: result.destination.name,
        distanceMeters: result.distance_meters
      });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to calculate route");
    }
  }, []);

  const resetDemo = () => {
    setRouteResult(null);
    setRouteOptions([]);
    setSelectedRouteOptionId("fastest");
    setRerouteNotice("");
    setScanPayload(null);
    setSelectedDestination("");
    setLiveTrackingEnabled(false);
    setCurrentLiveLocation(null);
    setQrAnchorLocation(DEFAULT_LIVE_START_LOCATION);
    setLiveRouteProgress(0);
    const initialNavigationState = createInitialNavigationState({ startLocation: DEFAULT_LIVE_START_LOCATION });
    navigationStateRef.current = initialNavigationState;
    setNavigationState(initialNavigationState);
    setNavigationRunning(false);
    setArrivalComplete(false);
    trackerRef.current?.reset();
    lastRawMotionDistanceRef.current = 0;
    headingBaselineRef.current = null;
    routeAlertStartedAtRef.current = null;
    lastAlertTypeRef.current = "";
    rerouteTriggeredRef.current = false;
    setMotionDebug(initialMotionDebug());
    setSelectedFloor(LIVE_FLOOR_ID);
    setMapMode("map");
    setStatus("Ready for AHLL IT QR scan");
  };

  const currentFloorName = useMemo(
    () => floors.find((floor) => String(floor.floor_id) === String(selectedFloor))?.name || `Floor ${selectedFloor}`,
    [floors, selectedFloor]
  );

  const liveFloor = floors.find((floor) => String(floor.floor_id) === LIVE_FLOOR_ID);
  const hasRoute = Boolean(routeResult);
  const selectedRouteOption = routeOptionById(routeOptions, selectedRouteOptionId);
  const destinationLabel = routeResult?.destination?.name || LIVE_DESTINATIONS.find((item) => item.room_id === selectedDestination)?.name;
  const currentLocationLabel = currentLiveLocation?.label || currentLiveLocation?.name || (scanPayload ? "AHLL IT Department" : "Not set");
  const remainingMeters = routeResult ? navigationState.remainingMeters : 0;
  const currentInstruction = useMemo(() => {
    if (routeResult && navigationState.nextInstruction) {
      return navigationState.nextInstruction;
    }

    if (!routeResult?.steps?.length) {
      return scanPayload ? "Select a destination" : "Scan AHLL IT QR";
    }

    if (arrivalComplete || liveRouteProgress >= 100) {
      return "You have arrived";
    }

    const activeIndex = Math.min(
      Math.max(0, routeResult.steps.length - 2),
      Math.floor((liveRouteProgress / 100) * Math.max(1, routeResult.steps.length - 1))
    );

    return routeResult.steps[activeIndex];
  }, [arrivalComplete, liveRouteProgress, navigationState.nextInstruction, routeResult, scanPayload]);

  const acquireMobileLocation = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setMotionDebug((current) => ({
        ...current,
        locationStatus: "Mobile GPS unavailable"
      }));
      return null;
    }

    setMotionDebug((current) => ({
      ...current,
      locationStatus: "Requesting mobile location"
    }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const mobileLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy || 0),
            capturedAt: Date.now()
          };

          setMotionDebug((current) => ({
            ...current,
            mobileLocation,
            locationStatus: `Mobile location acquired (${mobileLocation.accuracy}m)`
          }));
          resolve(mobileLocation);
        },
        () => {
          setMotionDebug((current) => ({
            ...current,
            locationStatus: "Mobile location permission denied"
          }));
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 8000
        }
      );
    });
  }, []);

  const applyNavigationDelta = useCallback(({ deltaMeters, snapshot, forceCorrect = false }) => {
    if (!routeResult || arrivalComplete) {
      return;
    }

    if (Number.isFinite(snapshot?.heading) && snapshot.heading > 0 && headingBaselineRef.current === null) {
      headingBaselineRef.current = snapshot.heading;
    }

    const previousState = navigationStateRef.current;
    const isInitialHeadingGrace =
      (previousState?.routeProgressMeters || 0) < 2 ||
      (navigationStartedAtRef.current && Date.now() - navigationStartedAtRef.current < 2500);
    const nextState = updateNavigationState({
      previousState,
      route: routeResult.route,
      destination: routeResult.destination,
      deltaMeters,
      headingDegrees: snapshot?.heading || previousState.headingDegrees,
      calibratedHeading: snapshot?.calibratedHeading || headingBaselineRef.current || snapshot?.heading || 0,
      forceCorrect: forceCorrect || isInitialHeadingGrace
    });
    const nextProgress = progressPercentFromState(nextState);

    navigationStateRef.current = nextState;
    setNavigationState(nextState);
    setLiveRouteProgress(nextProgress);
    setCurrentLiveLocation(nextState.currentPosition || nextState.snappedPosition);

    if (nextState.wrongDirection) {
      setStatus("Wrong direction");
      if (lastAlertTypeRef.current !== "wrongDirection") {
        trackNavigationEvent("wrong_direction_detected", {
          progressMeters: nextState.routeProgressMeters,
          expectedHeadingDegrees: nextState.expectedHeadingDegrees,
          headingDegrees: nextState.headingDegrees
        });
      }
    } else if (nextState.offRoute) {
      setStatus("Off route: return to highlighted path");
      if (lastAlertTypeRef.current !== "offRoute") {
        trackNavigationEvent("off_route_detected", {
          progressMeters: nextState.routeProgressMeters,
          confidence: nextState.routeConfidence
        });
      }
    } else if (deltaMeters > 0) {
      setStatus(`On route: ${nextState.remainingMeters}m remaining`);
    }

    const alertType = nextState.wrongDirection ? "wrongDirection" : nextState.offRoute ? "offRoute" : "";
    const now = Date.now();
    if (alertType) {
      if (lastAlertTypeRef.current !== alertType) {
        routeAlertStartedAtRef.current = now;
        rerouteTriggeredRef.current = false;
        setRerouteNotice("");
      } else if (routeAlertStartedAtRef.current && now - routeAlertStartedAtRef.current > 5000 && !rerouteTriggeredRef.current) {
        const message = alertType === "wrongDirection"
          ? "Recalculating route from nearest valid node..."
          : "Recalculating route from highlighted path...";
        setRerouteNotice(message);
        rerouteTriggeredRef.current = true;
        trackNavigationEvent("reroute_triggered", {
          reason: alertType,
          progressMeters: nextState.routeProgressMeters,
          destination: routeResult.destination.name
        });
      }
    } else {
      routeAlertStartedAtRef.current = null;
      rerouteTriggeredRef.current = false;
      setRerouteNotice("");
    }
    lastAlertTypeRef.current = alertType;

    if (nextState.remainingMeters <= 0) {
      trackerRef.current?.pause();
      setNavigationRunning(false);
      setArrivalComplete(true);
      setStatus(`You have arrived at ${routeResult.destination.name}`);
      trackNavigationEvent("destination_reached", {
        destination: routeResult.destination.name,
        routeOption: selectedRouteOptionId
      });
    }
  }, [arrivalComplete, routeResult, selectedRouteOptionId]);

  const configureTracker = useCallback(() => {
    trackerRef.current?.pause();
    trackerRef.current = createMotionTrackingService({
      onUpdate: (snapshot) => {
        const rawDistance = snapshot.distanceMeters || 0;
        const deltaMeters = Math.max(0, rawDistance - lastRawMotionDistanceRef.current);
        lastRawMotionDistanceRef.current = rawDistance;

        setMotionDebug((current) => ({
          ...current,
          ...snapshot,
          mobileLocation: snapshot.mobileLocation || current.mobileLocation,
          locationStatus: snapshot.locationStatus || current.locationStatus
        }));

        if (snapshot.isMoving && deltaMeters > 0) {
          applyNavigationDelta({ deltaMeters, snapshot });
        } else if (snapshot.status === "Standing still") {
          setStatus("Standing still: navigation waiting for movement");
        }
      },
      onStop: (snapshot) => {
        setMotionDebug((current) => ({
          ...current,
          ...snapshot,
          mobileLocation: snapshot.mobileLocation || current.mobileLocation,
          locationStatus: snapshot.locationStatus || current.locationStatus
        }));
      }
    });
  }, [applyNavigationDelta]);

  const startLiveNavigation = async () => {
    if (!routeResult) {
      setError("Select a destination first.");
      return;
    }

    configureTracker();
    setMapMode("live");
    lastRawMotionDistanceRef.current = 0;
    headingBaselineRef.current = null;
    navigationStartedAtRef.current = Date.now();
    try {
      const started = await trackerRef.current.start();
      acquireMobileLocation();
      setNavigationRunning(started);
      setArrivalComplete(false);
      setLiveTrackingEnabled(true);
      setStatus(started ? `Live navigation running from ${routeResult.current_location.name}` : "Motion sensor permission is required");
      setMotionDebug((current) => ({
        ...current,
        isMoving: false,
        status: started ? current.status : "Motion sensor permission is required"
      }));
      if (started) {
        trackNavigationEvent("route_started", {
          destination: routeResult.destination.name,
          routeOption: selectedRouteOptionId,
          trackingMode: "motion_sensor"
        });
      }
    } catch (err) {
      setNavigationRunning(false);
      setMotionDebug((current) => ({
        ...current,
        isMoving: false,
        status: "Motion sensor start failed"
      }));
      setStatus("Motion sensor start failed");
    }
  };

  const pauseLiveNavigation = () => {
    trackerRef.current?.pause();
    setNavigationRunning(false);
    setStatus("Live navigation paused");
  };

  const resetLiveNavigation = () => {
    trackerRef.current?.reset();
    lastRawMotionDistanceRef.current = 0;
    headingBaselineRef.current = null;
    navigationStartedAtRef.current = 0;
    routeAlertStartedAtRef.current = null;
    lastAlertTypeRef.current = "";
    rerouteTriggeredRef.current = false;
    setRerouteNotice("");
    setNavigationRunning(false);
    setArrivalComplete(false);
    setLiveRouteProgress(0);
    const initialState = createInitialNavigationState({
      route: routeResult?.route || [],
      startLocation: routeResult?.current_location || DEFAULT_LIVE_START_LOCATION,
      destination: routeResult?.destination
    });
    navigationStateRef.current = initialState;
    setNavigationState(initialState);
    setCurrentLiveLocation(initialState.snappedPosition || routeResult?.current_location || DEFAULT_LIVE_START_LOCATION);
    setMotionDebug(initialMotionDebug("Navigation reset"));
    setStatus(routeResult ? `Route reset: ${routeResult.current_location.name} to ${routeResult.destination.name}` : "Ready for AHLL IT QR scan");
  };

  const calibrateHeading = () => {
    trackerRef.current?.calibrate();
  };

  const handleCameraMovement = useCallback((motionScore) => {
    if (!routeResult || arrivalComplete) {
      return;
    }

    applyNavigationDelta({
      deltaMeters: 0.45,
      snapshot: motionDebug,
      forceCorrect: !motionDebug.motionSupported
    });

    setMotionDebug((current) => {
      return {
        ...current,
        distanceMeters: current.distanceMeters + 0.45,
        isMoving: true,
        cameraMotionScore: motionScore,
        status: "Camera movement detected"
      };
    });
  }, [applyNavigationDelta, arrivalComplete, motionDebug, routeResult]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Hospital Indoor Navigation</p>
          <h1>Apollo Ground Floor Live Wayfinding</h1>
        </div>
        <div className="status-pill">{status}</div>
      </header>

      {error && <div className="alert">{error}</div>}

      {!scanPayload ? (
        <>
          <QRScanPage onScan={handleScan} onNavigate={handleManualNavigate} />
          <section className="initial-live-map">
            <div className="map-header">
              <div>
                <p className="eyebrow">Active Hospital Map</p>
                <h2>Apollo Ground Floor - AHLL IT Navigation</h2>
              </div>
              <span className="status-pill">AHLL IT live start</span>
            </div>
            <NavigationMap
              floorMap={floorMap || liveFloor}
              selectedFloor={LIVE_FLOOR_ID}
              route={[]}
              currentLocation={DEFAULT_LIVE_START_LOCATION}
            />
          </section>
        </>
      ) : (
        <>
          <section className="hn-after-scan-grid">
            <CurrentLocationCard
              scanPayload={scanPayload}
              currentLocationLabel={currentLocationLabel}
              floorLabel={String(selectedFloor) === LIVE_FLOOR_ID ? "Ground Floor" : `Floor ${selectedFloor}`}
            />

            <DestinationSelector
              destinations={LIVE_DESTINATIONS}
              selectedDestination={selectedDestination}
              onSelect={(roomId) => startRoute(roomId)}
            />

            <DestinationDetailsCard
              routeResult={routeResult}
              destinationLabel={destinationLabel}
              selectedRouteOption={selectedRouteOption}
            />

            <NavigationActionPanel
              hasRoute={hasRoute}
              navigationRunning={navigationRunning}
              arrivalComplete={arrivalComplete}
              onStart={startLiveNavigation}
              onPause={pauseLiveNavigation}
              onReset={resetLiveNavigation}
              onCalibrate={calibrateHeading}
              onClear={resetDemo}
            />

            {hasRoute && (
              <section className="hn-card hn-route-status-card" aria-label="Live route status">
                <div className="hn-status-row">
                  <div className="hn-meta">
                    <span>Remaining</span>
                    <strong>{remainingMeters}m</strong>
                  </div>
                  <div className="hn-meta">
                    <span>Next Step</span>
                    <strong>{currentInstruction}</strong>
                  </div>
                  <div className="hn-meta">
                    <span>Tracking</span>
                    <strong>
                      {Math.round((navigationState.routeConfidence || 1) * 100)}%{" "}
                      {navigationState.routeConfidence < 0.45 ? "· scan nearest QR" : ""}
                    </strong>
                  </div>
                </div>
              </section>
            )}
          </section>

          {hasRoute && routeOptions.length > 0 && (
            <section className="route-options-panel">
              <div className="route-options-header">
                <div>
                  <p className="eyebrow">Route Options</p>
                  <h2>Choose navigation preference</h2>
                </div>
                {rerouteNotice && <span className="reroute-pill">{rerouteNotice}</span>}
              </div>
              <div className="route-options-grid">
                {routeOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={selectedRouteOptionId === option.id ? "route-option-card selected" : "route-option-card"}
                    onClick={() => {
                      setSelectedRouteOptionId(option.id);
                      setStatus(`${option.name} route selected`);
                      trackNavigationEvent("route_option_selected", {
                        routeOption: option.id,
                        destination: routeResult.destination.name
                      });
                    }}
                  >
                    <span>{option.badge}</span>
                    <strong>{option.name}</strong>
                    <p>{option.distanceMeters}m - {option.timeMinutes} min - {option.turns} turns</p>
                    <small>{option.accessibility}</small>
                  </button>
                ))}
              </div>
              {navigationState.routeConfidence < 0.45 && (
                <div className="route-confidence-warning">
                  Location accuracy is low. Please scan nearest QR checkpoint.
                </div>
              )}
            </section>
          )}

          <section className="demo-impact-strip">
            <div>
              <span>Demo Scenario</span>
              <strong>AHLL IT to {destinationLabel || "selected destination"}</strong>
            </div>
            <div>
              <span>Patient Experience</span>
              <strong>No app install</strong>
            </div>
            <div>
              <span>Staff Impact</span>
              <strong>Fewer direction queries</strong>
            </div>
            <div>
              <span>Rollout</span>
              <strong>QR-first, BLE-ready</strong>
            </div>
          </section>

          {hasRoute && mapMode === "live" ? (
            <section className="live-ar-page">
              <div className="live-mode-toggle">
                <button type="button" className="tool-active">3D Live Guide</button>
                <button type="button" onClick={() => setMapMode("map")}>Floor Map</button>
              </div>
              <ARCameraNavigation
                floorMap={floorMap || liveFloor}
                steps={routeResult.steps}
                selectedFloor={selectedFloor}
                destination={routeResult.destination}
                route={routeResult.route}
                currentLocation={currentLiveLocation || qrAnchorLocation || routeResult.current_location}
                currentInstruction={currentInstruction}
                progress={Math.round(liveRouteProgress)}
                remainingMeters={remainingMeters}
                walkingTimeMinutes={routeResult.walking_time_minutes}
                isNavigationRunning={navigationRunning}
                hasArrived={arrivalComplete}
                navigationState={navigationState}
                motionDebug={motionDebug}
                onStart={startLiveNavigation}
                onPause={pauseLiveNavigation}
                onReset={resetLiveNavigation}
                onCalibrate={calibrateHeading}
                onCameraMovement={handleCameraMovement}
                onShowMap={() => setMapMode("map")}
                onClearNavigation={resetDemo}
              />
            </section>
          ) : (
            <>
              <section className="navigation-layout">
                <DoctorDestinationCard
                  doctor={doctor}
                  destination={routeResult?.destination}
                  scanPayload={scanPayload}
                  currentLiveLocation={liveTrackingEnabled ? currentLiveLocation : null}
                  liveDestinations={LIVE_DESTINATIONS}
                  selectedDestination={selectedDestination}
                  onNavigate={startRoute}
                  routeResult={routeResult}
                />
                <div className="map-panel">
                  <div className="map-header">
                    <div>
                      <p className="eyebrow">{String(selectedFloor) === LIVE_FLOOR_ID ? "Hospital Floor Map" : "Sample Floor Map"}</p>
                      <h2>{currentFloorName}</h2>
                    </div>
                    <div className="map-tools">
              {hasRoute && (
                <button type="button" onClick={() => setMapMode("live")}>
                  3D Live Guide
                </button>
              )}
                      <button
                        type="button"
                        className={liveTrackingEnabled ? "tool-active" : ""}
                        onClick={() => {
                          setLiveTrackingEnabled((enabled) => !enabled);
                          setStatus(liveTrackingEnabled ? "Live tracking paused" : `Live tracking enabled: ${currentLocationLabel}`);
                        }}
                      >
                        {liveTrackingEnabled ? "Live Tracking On" : "Enable Live Tracking"}
                      </button>
                      <button type="button" className="tool-active">
                        Floor Map
                      </button>
                      <span>{String(selectedFloor) === LIVE_FLOOR_ID ? "Ground Floor" : `F${selectedFloor}`}</span>
                    </div>
                  </div>
                  <NavigationMap
                    floorMap={floorMap || liveFloor}
                    selectedFloor={selectedFloor}
                    route={routeResult?.route || []}
                    currentLocation={liveTrackingEnabled ? (currentLiveLocation || qrAnchorLocation || routeResult?.current_location || scanPayload) : (routeResult?.current_location || qrAnchorLocation || scanPayload)}
                    destination={routeResult?.destination}
                    navigationState={navigationState}
                  />
                  {hasRoute && (
                    <div className="live-navigation-controls">
                      <button type="button" className="primary-btn" onClick={startLiveNavigation}>
                        Start Live Navigation
                      </button>
                      <button type="button" onClick={calibrateHeading}>Calibrate corridor</button>
                      <button type="button" onClick={pauseLiveNavigation}>Pause navigation</button>
                      <button type="button" onClick={resetLiveNavigation}>Reset navigation</button>
                    </div>
                  )}
                </div>
                <DirectionPanel
                  steps={routeResult?.steps || ["Scan AHLL IT QR", "Select a destination", "Follow the blue path"]}
                  route={routeResult?.route || []}
                  selectedFloor={selectedFloor}
                  currentFloor={LIVE_FLOOR_ID}
                  destinationFloor={routeResult?.destination?.floor || LIVE_FLOOR_ID}
                  distanceMeters={remainingMeters || routeResult?.distance_meters}
                  walkingTimeMinutes={routeResult?.walking_time_minutes}
                />
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}

export default App;

