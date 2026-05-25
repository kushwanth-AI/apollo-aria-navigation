import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDoctor, getFloor, getFloors, getRoute } from "./api/api";
import QRScanPage from "./components/QRScanPage";
import NavigationMap from "./components/NavigationMap";
import DirectionPanel from "./components/DirectionPanel";
import DoctorDestinationCard from "./components/DoctorDestinationCard";
import ARCameraNavigation from "./components/ARCameraNavigation";
import { createLiveMotionTracker } from "./services/liveMotionTracker";

const DEFAULT_DOCTOR_ID = "D001";
const LIVE_FLOOR_ID = "ground-live";

const LIVE_DESTINATIONS = [
  { room_id: "discussion_room_1", name: "General OPD 1" },
  { room_id: "discussion_room_2", name: "General OPD 2" },
  { room_id: "discussion_room_3", name: "Sample Collection Lab" },
  { room_id: "discussion_room_4", name: "Billing Counter" },
  { room_id: "discussion_room_5", name: "Radiology / X-Ray" },
  { room_id: "pharmacy", name: "Pharmacy" },
  { room_id: "lift", name: "Lift" },
  { room_id: "stairs", name: "Stairs" },
  { room_id: "exit", name: "Exit" }
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
  status
});

function App() {
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState(LIVE_FLOOR_ID);
  const [floorMap, setFloorMap] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [scanPayload, setScanPayload] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [liveTrackingEnabled, setLiveTrackingEnabled] = useState(false);
  const [currentLiveLocation, setCurrentLiveLocation] = useState(null);
  const [liveRouteProgress, setLiveRouteProgress] = useState(0);
  const [navigationRunning, setNavigationRunning] = useState(false);
  const [arrivalComplete, setArrivalComplete] = useState(false);
  const [motionDebug, setMotionDebug] = useState(initialMotionDebug());
  const [mapMode, setMapMode] = useState("map");
  const [status, setStatus] = useState("Ready for Reception QR scan");
  const [error, setError] = useState("");
  const trackerRef = useRef(null);

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
    if (!routeResult || !liveTrackingEnabled) {
      return;
    }

    setCurrentLiveLocation(interpolateRouteLocation(routeResult.route, liveRouteProgress));
  }, [routeResult, liveTrackingEnabled, liveRouteProgress]);

  const handleScan = useCallback((payload) => {
    const parsedPayload = typeof payload === "string" ? JSON.parse(payload) : payload;
    const livePayload = {
      ...parsedPayload,
      floor: parsedPayload.floor || parsedPayload.currentFloor || LIVE_FLOOR_ID,
      location_id: parsedPayload.location_id || parsedPayload.currentLocation || "QR_RECEPTION_GROUND"
    };

    setError("");
    setRouteResult(null);
    setSelectedDestination("");
    setCurrentLiveLocation(null);
    setLiveRouteProgress(0);
    setNavigationRunning(false);
    setArrivalComplete(false);
    trackerRef.current?.reset();
    setMotionDebug(initialMotionDebug("Reception QR anchored"));
    setLiveTrackingEnabled(true);
    setScanPayload(livePayload);
    setSelectedFloor(livePayload.floor);

    if (livePayload.location_id === "QR_RECEPTION_GROUND") {
      setStatus("Live tracking enabled: Reception");
      return;
    }

    setStatus(`Live tracking enabled: ${livePayload.location_id.replace("QR_", "").replaceAll("_", " ")}`);
  }, []);

  const startRoute = useCallback(async (destinationRoomId) => {
    if (!scanPayload) {
      setError("Scan or simulate the Reception QR first.");
      return;
    }

    setSelectedDestination(destinationRoomId);
    setError("");

    try {
      const result = await getRoute({
        current_location_id: scanPayload.location_id,
        destination_room_id: destinationRoomId
      });
      setRouteResult(result);
      setLiveRouteProgress(0);
      setCurrentLiveLocation(result.current_location);
      setSelectedFloor(result.current_location.floor);
      setMapMode("map");
      setLiveTrackingEnabled(true);
      setNavigationRunning(false);
      setArrivalComplete(false);
      trackerRef.current?.reset();
      setMotionDebug(initialMotionDebug("Route ready"));
      setStatus(`Route ready: Reception to ${result.destination.name}`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to calculate route");
    }
  }, [scanPayload]);

  const handleManualNavigate = useCallback(async (destinationRoomId) => {
    const receptionPayload = {
      floor: LIVE_FLOOR_ID,
      location_id: "QR_RECEPTION_GROUND",
      currentLocation: "reception",
      currentFloor: LIVE_FLOOR_ID
    };

    setScanPayload(receptionPayload);
    setCurrentLiveLocation(null);
    setLiveRouteProgress(0);
    setNavigationRunning(false);
    setArrivalComplete(false);
    trackerRef.current?.reset();
    setMotionDebug(initialMotionDebug("Reception QR anchored"));
    setLiveTrackingEnabled(true);
    setSelectedFloor(LIVE_FLOOR_ID);
    setStatus("Live tracking enabled: Reception");
    setSelectedDestination(destinationRoomId);
    setError("");

    try {
      const result = await getRoute({
        current_location_id: receptionPayload.location_id,
        destination_room_id: destinationRoomId
      });
      setRouteResult(result);
      setLiveRouteProgress(0);
      setCurrentLiveLocation(result.current_location);
      setMapMode("map");
      setNavigationRunning(false);
      setArrivalComplete(false);
      trackerRef.current?.reset();
      setMotionDebug(initialMotionDebug("Route ready"));
      setStatus(`Route ready: Reception to ${result.destination.name}`);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to calculate route");
    }
  }, []);

  const resetDemo = () => {
    setRouteResult(null);
    setScanPayload(null);
    setSelectedDestination("");
    setLiveTrackingEnabled(false);
    setCurrentLiveLocation(null);
    setLiveRouteProgress(0);
    setNavigationRunning(false);
    setArrivalComplete(false);
    trackerRef.current?.reset();
    setMotionDebug(initialMotionDebug());
    setSelectedFloor(LIVE_FLOOR_ID);
    setMapMode("map");
    setStatus("Ready for Reception QR scan");
  };

  const currentFloorName = useMemo(
    () => floors.find((floor) => String(floor.floor_id) === String(selectedFloor))?.name || `Floor ${selectedFloor}`,
    [floors, selectedFloor]
  );

  const liveFloor = floors.find((floor) => String(floor.floor_id) === LIVE_FLOOR_ID);
  const hasRoute = Boolean(routeResult);
  const destinationLabel = routeResult?.destination?.name || LIVE_DESTINATIONS.find((item) => item.room_id === selectedDestination)?.name;
  const filteredLiveDestinations = LIVE_DESTINATIONS.filter((destination) =>
    destination.name.toLowerCase().includes(destinationQuery.trim().toLowerCase())
  );
  const currentLocationLabel = currentLiveLocation?.label || currentLiveLocation?.name || (scanPayload ? "Reception" : "Not set");
  const remainingMeters = routeResult ? Math.max(0, Math.ceil(routeResult.distance_meters * (1 - liveRouteProgress / 100))) : 0;
  const currentInstruction = useMemo(() => {
    if (!routeResult?.steps?.length) {
      return scanPayload ? "Select a destination" : "Scan Reception QR";
    }

    if (arrivalComplete || liveRouteProgress >= 100) {
      return "You have arrived";
    }

    const activeIndex = Math.min(
      Math.max(0, routeResult.steps.length - 2),
      Math.floor((liveRouteProgress / 100) * Math.max(1, routeResult.steps.length - 1))
    );

    return routeResult.steps[activeIndex];
  }, [arrivalComplete, liveRouteProgress, routeResult, scanPayload]);

  const updateProgressFromDistance = useCallback((distanceMeters) => {
    if (!routeResult || arrivalComplete) {
      return;
    }

    const next = Math.min(100, (distanceMeters / Math.max(1, routeResult.distance_meters)) * 100);
    setLiveRouteProgress(next);

    if (next >= 100) {
      trackerRef.current?.pause();
      setNavigationRunning(false);
      setArrivalComplete(true);
      setStatus(`You have arrived at ${routeResult.destination.name}`);
    }
  }, [arrivalComplete, routeResult]);

  const configureTracker = useCallback(() => {
    trackerRef.current?.pause();
    trackerRef.current = createLiveMotionTracker({
      onUpdate: (snapshot) => {
        setMotionDebug(snapshot);
        updateProgressFromDistance(snapshot.distanceMeters);

        if (snapshot.isMoving) {
          const remaining = Math.max(0, Math.ceil((routeResult?.distance_meters || 0) - snapshot.distanceMeters));
          setStatus(`Live movement detected: ${remaining}m remaining`);
        } else if (snapshot.status === "Standing still") {
          setStatus("Standing still: navigation waiting for movement");
        }
      },
      onStop: (snapshot) => {
        setMotionDebug(snapshot);
      }
    });
  }, [routeResult?.distance_meters, updateProgressFromDistance]);

  const startLiveNavigation = async () => {
    if (!routeResult) {
      setError("Select a destination first.");
      return;
    }

    configureTracker();
    setMapMode("live");
    try {
      const started = await trackerRef.current.start();
      setNavigationRunning(started);
      setArrivalComplete(false);
      setLiveTrackingEnabled(true);
      setStatus(started ? "Real sensor navigation running" : "Motion sensor permission is required");
    } catch (err) {
      setNavigationRunning(false);
      setMotionDebug((current) => ({ ...current, status: "Motion sensor start failed" }));
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
    setNavigationRunning(false);
    setArrivalComplete(false);
    setLiveRouteProgress(0);
    setCurrentLiveLocation(routeResult?.current_location || null);
    setMotionDebug(initialMotionDebug("Navigation reset"));
    setStatus(routeResult ? `Route reset: Reception to ${routeResult.destination.name}` : "Ready for Reception QR scan");
  };

  const calibrateHeading = () => {
    trackerRef.current?.calibrate();
  };

  const handleCameraMovement = useCallback((motionScore) => {
    if (!routeResult || arrivalComplete) {
      return;
    }

    setMotionDebug((current) => {
      const nextDistance = current.distanceMeters + 0.45;
      updateProgressFromDistance(nextDistance);
      return {
        ...current,
        distanceMeters: nextDistance,
        isMoving: true,
        cameraMotionScore: motionScore,
        status: "Camera movement detected"
      };
    });
  }, [arrivalComplete, routeResult, updateProgressFromDistance]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Hospital Indoor Navigation</p>
          <h1>OPD Floor Live Wayfinding</h1>
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
                <h2>Ground Floor - OPD & Patient Services</h2>
              </div>
              <span className="status-pill">Reception live start</span>
            </div>
            <NavigationMap
              floorMap={floorMap || liveFloor}
              selectedFloor={LIVE_FLOOR_ID}
              route={[]}
              currentLocation={{ floor: LIVE_FLOOR_ID, x: 330, y: 270, label: "Reception" }}
            />
          </section>
        </>
      ) : (
        <>
          <section className="route-summary live-route-summary">
            <div>
              <span>Current Location</span>
              <strong>You are here: {currentLocationLabel}</strong>
            </div>
            <div>
              <span>Destination</span>
              <strong>{destinationLabel || "Select a destination"}</strong>
            </div>
            {hasRoute && (
              <div>
                <span>Live Remaining</span>
                <strong>{remainingMeters}m remaining</strong>
              </div>
            )}
            {hasRoute && (
              <div>
                <span>Current Instruction</span>
                <strong>{currentInstruction}</strong>
              </div>
            )}
          </section>

          <section className="destination-picker">
            <div>
              <p className="eyebrow">Patient Destinations</p>
              <h2>Choose a department from Reception</h2>
              <input
                className="destination-search"
                type="search"
                placeholder="Search OPD, Pharmacy, Lab..."
                value={destinationQuery}
                onChange={(event) => setDestinationQuery(event.target.value)}
              />
            </div>
            <div className="destination-buttons">
              {filteredLiveDestinations.map((destination) => (
                <button
                  key={destination.room_id}
                  type="button"
                  className={selectedDestination === destination.room_id ? "destination-button selected" : "destination-button"}
                  onClick={() => startRoute(destination.room_id)}
                >
                  {destination.name}
                </button>
              ))}
            </div>
          </section>

          <section className="demo-impact-strip">
            <div>
              <span>Demo Scenario</span>
              <strong>Reception to {destinationLabel || "selected department"}</strong>
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
                currentLocation={currentLiveLocation || routeResult.current_location}
                currentInstruction={currentInstruction}
                progress={Math.round(liveRouteProgress)}
                remainingMeters={remainingMeters}
                walkingTimeMinutes={routeResult.walking_time_minutes}
                isNavigationRunning={navigationRunning}
                hasArrived={arrivalComplete}
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
                      {hasRoute && (
                        <button type="button" className="tool-active" onClick={startLiveNavigation}>
                          Start Live Navigation
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
                      <span>{String(selectedFloor) === LIVE_FLOOR_ID ? "Ground OPD" : `F${selectedFloor}`}</span>
                    </div>
                  </div>
                  <NavigationMap
                    floorMap={floorMap || liveFloor}
                    selectedFloor={selectedFloor}
                    route={routeResult?.route || []}
                    currentLocation={liveTrackingEnabled ? (currentLiveLocation || routeResult?.current_location || scanPayload) : (routeResult?.current_location || scanPayload)}
                    destination={routeResult?.destination}
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
                  steps={routeResult?.steps || ["Scan Reception QR", "Select a destination", "Follow the blue path"]}
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
