import { useEffect, useMemo, useRef, useState } from "react";
import NavigationMap from "./NavigationMap";
import { detectVisionFrame } from "../api/api";

const directionForInstruction = (instruction = "") => {
  const lower = instruction.toLowerCase();

  if (lower.includes("arrived")) return "arrived";
  if (lower.includes("turn right")) return "right";
  if (lower.includes("turn left")) return "left";
  if (lower.includes("lift")) return "lift";
  return "straight";
};

const labelForDirection = {
  straight: "GO STRAIGHT",
  right: "TURN RIGHT",
  left: "TURN LEFT",
  lift: "LIFT",
  arrived: "ARRIVED"
};

const expectedVisionLabels = (instruction = "", destination = {}) => {
  const lowerInstruction = instruction.toLowerCase();
  const lowerDestination = `${destination?.name || ""} ${destination?.room_number || ""}`.toLowerCase();
  const labels = [];

  if (lowerInstruction.includes("reception")) labels.push("reception");
  if (lowerInstruction.includes("lift")) labels.push("lift");
  if (lowerInstruction.includes("stair")) labels.push("stairs");
  if (lowerInstruction.includes("pharmacy") || lowerDestination.includes("pharmacy")) labels.push("pharmacy");
  if (lowerInstruction.includes("toilet") || lowerInstruction.includes("restroom")) labels.push("toilet");
  if (lowerInstruction.includes("exit") || lowerDestination.includes("exit")) labels.push("exit");
  if (lowerInstruction.includes("opd") || lowerDestination.includes("opd") || lowerDestination.includes("doctor")) labels.push("doctor_room");
  if (lowerInstruction.includes("room") || lowerDestination.match(/[a-z]*\d+/i)) labels.push("room_number");

  return [...new Set(labels.length ? labels : ["room_number"])];
};

function LiveNavigationGuide({
  floorMap,
  selectedFloor,
  destination,
  route,
  currentLocation,
  currentInstruction,
  progress,
  remainingMeters,
  walkingTimeMinutes,
  isNavigationRunning,
  hasArrived,
  navigationState,
  motionDebug,
  onStart,
  onPause,
  onReset,
  onCalibrate,
  onCameraMovement,
  onShowMap,
  onClearNavigation
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const previousFrameRef = useRef(null);
  const lastCameraMoveAtRef = useRef(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraMotionScore, setCameraMotionScore] = useState(0);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [visionStatus, setVisionStatus] = useState("Camera AI standby");
  const [visionDetections, setVisionDetections] = useState([]);
  const [visionWarning, setVisionWarning] = useState(null);
  const [visionConfirmed, setVisionConfirmed] = useState(false);
  const direction = useMemo(() => directionForInstruction(currentInstruction), [currentInstruction]);
  const routeAlert = navigationState?.wrongDirection || navigationState?.offRoute;
  const directionLabel = navigationState?.wrongDirection
    ? "TURN BACK"
    : navigationState?.offRoute
      ? "RETURN TO ROUTE"
      : labelForDirection[direction];
  const navigationStatus = navigationState?.wrongDirection
    ? "Wrong direction"
    : navigationState?.offRoute
      ? "Off route"
      : hasArrived
        ? "Arrived"
        : isNavigationRunning
          ? "Tracking"
          : "Tap Start";
  const turnSymbol = navigationState?.wrongDirection
    ? "U"
    : navigationState?.offRoute
      ? "!"
      : direction === "right"
        ? "->"
        : direction === "left"
          ? "<-"
          : direction === "lift"
            ? "^"
            : hasArrived
              ? "OK"
              : "^";
  const expectedLabels = useMemo(
    () => expectedVisionLabels(currentInstruction, destination),
    [currentInstruction, destination]
  );
  const currentLocationLabel = currentLocation?.label || currentLocation?.name || "AHLL IT Department";

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);
      } catch (error) {
        setCameraReady(false);
      }
    };

    startCamera();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!isNavigationRunning || hasArrived) {
      return undefined;
    }

    let frameId;
    const sampleWidth = 64;
    const sampleHeight = 48;

    const readFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState < 2) {
        frameId = window.requestAnimationFrame(readFrame);
        return;
      }

      canvas.width = sampleWidth;
      canvas.height = sampleHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(video, 0, 0, sampleWidth, sampleHeight);
      const frame = context.getImageData(0, 0, sampleWidth, sampleHeight).data;

      if (previousFrameRef.current) {
        let diff = 0;
        const previous = previousFrameRef.current;

        for (let index = 0; index < frame.length; index += 16) {
          diff += Math.abs(frame[index] - previous[index]);
          diff += Math.abs(frame[index + 1] - previous[index + 1]);
          diff += Math.abs(frame[index + 2] - previous[index + 2]);
        }

        const score = diff / (frame.length / 16);
        const now = Date.now();
        setCameraMotionScore(score);

        if (score > 26 && now - lastCameraMoveAtRef.current > 650) {
          lastCameraMoveAtRef.current = now;
          onCameraMovement?.(score);
        }
      }

      previousFrameRef.current = new Uint8ClampedArray(frame);
      frameId = window.requestAnimationFrame(readFrame);
    };

    frameId = window.requestAnimationFrame(readFrame);

    return () => {
      window.cancelAnimationFrame(frameId);
      previousFrameRef.current = null;
    };
  }, [hasArrived, isNavigationRunning, onCameraMovement]);

  useEffect(() => {
    if (!isNavigationRunning || hasArrived) {
      setVisionStatus(hasArrived ? "Destination confirmed by route" : "Camera AI standby");
      return undefined;
    }

    let cancelled = false;
    let intervalId;

    const captureAndDetect = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState < 2) {
        return;
      }

      canvas.width = 320;
      canvas.height = 180;
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const result = await detectVisionFrame({
          image: canvas.toDataURL("image/jpeg", 0.58),
          expectedLabels,
          currentRouteStep: currentInstruction,
          finalDestination: `${destination?.room_number || ""} ${destination?.name || ""}`
        });

        if (cancelled) {
          return;
        }

        setVisionDetections(result.detections || []);
        setVisionWarning(result.warning || null);
        setVisionConfirmed(Boolean(result.matchedRouteStep));

        if (result.warning) {
          setVisionStatus(result.warning);
        } else if (result.matchedRouteStep && hasArrived) {
          setVisionStatus("You have reached your destination");
        } else if (result.matchedRouteStep) {
          setVisionStatus("Checkpoint confirmed");
        } else {
          setVisionStatus("Scanning signboards and room numbers");
        }
      } catch (error) {
        if (!cancelled) {
          setVisionStatus("Mock vision mode unavailable");
          setVisionWarning(null);
          setVisionConfirmed(false);
        }
      }
    };

    captureAndDetect();
    intervalId = window.setInterval(captureAndDetect, 3500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [currentInstruction, destination, expectedLabels, hasArrived, isNavigationRunning]);

  return (
    <section className={`mobile-ar-view ar-dir-${direction} ${routeAlert ? "ar-route-alert" : ""} ${navigationState?.wrongDirection ? "ar-wrong-direction" : ""} ${navigationState?.offRoute ? "ar-off-route" : ""} ${hasArrived ? "ar-arrived" : ""}`}>
      <video ref={videoRef} className="ar-camera-video" autoPlay muted playsInline />
      <canvas ref={canvasRef} className="camera-motion-canvas" />
      {!cameraReady && (
        <div className="simulated-camera-bg">
          <div className="sim-ceiling" />
          <div className="sim-wall sim-left">
            <span>Reception</span>
            <span>Main Corridor</span>
          </div>
          <div className="sim-wall sim-right">
            <span>Waiting Area</span>
            <span className="sim-destination-door">{destination.room_number}</span>
          </div>
          <div className="sim-floor" />
        </div>
      )}

      <div className="ar-camera-tint" />
      <header className="ar-route-topbar">
        <button type="button" onClick={onShowMap}>Map</button>
        <div className="ar-route-topbar-main">
          <span>Destination</span>
          <strong>{destination.name}</strong>
        </div>
        <div className="ar-route-remaining">
          <span>Remaining</span>
          <strong>{remainingMeters}m</strong>
        </div>
        <div className="ar-route-eta">
          <span>ETA</span>
          <strong>{walkingTimeMinutes} min</strong>
        </div>
        <div className={`ar-route-status ${routeAlert ? "is-alert" : ""}`}>
          <span>Status</span>
          <strong>{navigationStatus}</strong>
        </div>
        <button type="button" onClick={() => setShowTechnicalDetails((visible) => !visible)}>Details</button>
      </header>

      <section className="ar-navigation-hud">
        <div className="ar-hud-instruction">
          <div className="ar-turn-icon">{turnSymbol}</div>
          <div>
            <span>{destination.name} - {remainingMeters}m remaining</span>
            <strong>{currentInstruction}</strong>
          </div>
        </div>
        <div className="ar-hud-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      </section>

      <div className="live-ar-indicator"><span /> Live camera</div>

      <div className="ar-small-stats">
        <span>{String(selectedFloor) === "ground-live" ? "Ground" : `F${selectedFloor}`}</span>
        <span>{remainingMeters}m</span>
        <span>{currentLocationLabel}</span>
        <span>{motionDebug?.isMoving ? "Walking" : "Standing"}</span>
      </div>

      <div className="ar-floor-lane">
        <div className="ar-ground-glow" />
        <div className="ar-user-dot" style={{ "--walk": progress }} />
        <div className="ar-goal-marker">
          <span />
          <strong>{hasArrived ? destination.room_number : `${destination.room_number} AHEAD`}</strong>
        </div>
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <div key={index} className={`ground-arrow arrow-${index}`}>
            <i />
            <strong>{directionLabel}</strong>
          </div>
        ))}
      </div>

      <div className="ar-instruction-mini">
        <strong>{directionLabel}</strong>
        <span>{hasArrived ? "Arrived" : `${remainingMeters}m`}</span>
      </div>

      {routeAlert && (
        <div className="ar-route-warning">
          <strong>{navigationStatus}</strong>
          <span>{navigationState?.wrongDirection ? "Turn back to resume navigation" : "Return to highlighted path"}</span>
        </div>
      )}

      {showTechnicalDetails && (
        <>
          <div className={`vision-assist-panel ${visionWarning ? "vision-warning" : visionConfirmed ? "vision-confirmed" : ""}`}>
            <span>Camera AI assist</span>
            <strong>{hasArrived && visionConfirmed ? "You have reached your destination" : visionStatus}</strong>
            <p>
              Expected: {expectedLabels.join(", ")}
              {visionDetections.length > 0 && ` | Detected: ${visionDetections.map((item) => `${item.label} ${Math.round(item.confidence * 100)}%`).join(", ")}`}
            </p>
          </div>
          <div className="ar-debug-overlay">
            <span>Sensor: {motionDebug?.sensorActive ? "Active" : "Inactive"}</span>
            <span>Permission: {motionDebug?.permissionState || "idle"}</span>
            <span>State: {motionDebug?.movementState || (motionDebug?.isMoving ? "walking" : "standing")}</span>
            <span>Steps: {motionDebug?.steps || 0}</span>
            <span>Heading: {Math.round(motionDebug?.heading || 0)} deg</span>
            <span>Expected: {Math.round(navigationState?.expectedHeadingDegrees || 0)} deg</span>
            <span>Moved: {(motionDebug?.distanceMeters || 0).toFixed(1)}m</span>
            <span>Route: {(navigationState?.routeProgressMeters || 0).toFixed(1)}m</span>
            <span>Confidence: {Math.round((navigationState?.routeConfidence || 1) * 100)}%</span>
            <span>Motion events: {motionDebug?.motionEvents || 0}</span>
            <span>Accel events: {motionDebug?.accelerometerEvents || 0}</span>
            <span>Gyro events: {motionDebug?.gyroscopeEvents || 0}</span>
            <span>Orient events: {motionDebug?.orientationEvents || 0}</span>
            <span>Accel: {(motionDebug?.accelerationDelta || 0).toFixed(2)}</span>
            <span>Camera motion: {cameraMotionScore.toFixed(1)}</span>
            <span>Mobile: {motionDebug?.locationStatus || "Mobile location idle"}</span>
            <span>Vision: {visionConfirmed ? "Matched" : "Scanning"}</span>
            <span>X/Y: {Math.round(currentLocation?.x || 0)}, {Math.round(currentLocation?.y || 0)}</span>
            <span>{motionDebug?.isMoving ? "Walking" : "Stopped"}</span>
          </div>
        </>
      )}

      {hasArrived && (
        <div className="ar-arrival-overlay">
          <div>OK</div>
          <strong>You have arrived</strong>
          <p>{destination.name}</p>
          <span>{destination.room_number}</span>
          <button type="button" onClick={onClearNavigation}>End Navigation</button>
        </div>
      )}

      <div className="ar-mini-map-overlay">
        <NavigationMap
          floorMap={floorMap}
          selectedFloor={selectedFloor}
          route={route}
          currentLocation={currentLocation}
          destination={destination}
          navigationState={navigationState}
          compact
        />
      </div>

      <div className="ar-bottom-minimap">
        <div className="ar-mini-route">
          <span className="ar-mini-track" />
          <span className="ar-mini-fill" style={{ width: `${progress}%` }} />
          <span className="ar-mini-current" style={{ left: `${10 + progress * 0.78}%` }} />
          <span className="ar-mini-end">{destination.room_number}</span>
        </div>
      </div>

      <div className="ar-floating-controls">
        <button type="button" className={isNavigationRunning ? "is-live" : ""} onClick={onStart}>
          {isNavigationRunning ? "Live" : "Start"}
        </button>
        <button type="button" onClick={onPause}>Pause</button>
        <button type="button" onClick={onCalibrate}>Recenter</button>
        <button type="button" onClick={onReset}>Reset</button>
      </div>
    </section>
  );
}

export default LiveNavigationGuide;
