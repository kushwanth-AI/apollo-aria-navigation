import { useEffect, useMemo, useRef, useState } from "react";
import NavigationMap from "./NavigationMap";

const directionForInstruction = (instruction = "") => {
  const lower = instruction.toLowerCase();

  if (lower.includes("arrived")) return "arrived";
  if (lower.includes("turn right")) return "right";
  if (lower.includes("lift")) return "lift";
  return "straight";
};

const labelForDirection = {
  straight: "GO STRAIGHT",
  right: "TURN RIGHT",
  lift: "LIFT",
  arrived: "ARRIVED"
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
  const direction = useMemo(() => directionForInstruction(currentInstruction), [currentInstruction]);
  const directionLabel = labelForDirection[direction];

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

  return (
    <section className={`mobile-ar-view ar-dir-${direction} ${hasArrived ? "ar-arrived" : ""}`}>
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
            <span>Cafe Area</span>
            <span className="sim-destination-door">{destination.room_number}</span>
          </div>
          <div className="sim-floor" />
        </div>
      )}

      <div className="ar-camera-tint" />
      <div className="live-ar-indicator"><span /> LIVE CAMERA</div>

      <header className="ar-video-topbar">
        <button type="button" onClick={onShowMap}>Map</button>
        <div className="ar-room-pill">
          <span>Destination</span>
          <strong>{destination.name}</strong>
        </div>
        <button type="button" onClick={onClearNavigation}>Clear</button>
      </header>

      <div className="ar-small-stats">
        <span>{String(selectedFloor) === "ground-live" ? "Ground" : `F${selectedFloor}`}</span>
        <span>{remainingMeters}m</span>
        <span>{walkingTimeMinutes} min</span>
        <span>{progress}%</span>
        <span>{motionDebug?.steps || 0} steps</span>
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
        <span>{hasArrived ? "Arrival" : isNavigationRunning ? "Live instruction" : "Ready"}</span>
        <strong>{directionLabel}</strong>
        <p>{remainingMeters}m remaining - {currentInstruction}</p>
        <small>{motionDebug?.status || "Face phone toward corridor, calibrate, then start walking."}</small>
      </div>

      <div className="ar-debug-overlay">
        <span>Steps: {motionDebug?.steps || 0}</span>
        <span>Heading: {Math.round(motionDebug?.heading || 0)} deg</span>
        <span>Moved: {(motionDebug?.distanceMeters || 0).toFixed(1)}m</span>
        <span>Motion events: {motionDebug?.motionEvents || 0}</span>
        <span>Orient events: {motionDebug?.orientationEvents || 0}</span>
        <span>Accel: {(motionDebug?.accelerationDelta || 0).toFixed(2)}</span>
        <span>Camera motion: {cameraMotionScore.toFixed(1)}</span>
        <span>X/Y: {Math.round(currentLocation?.x || 0)}, {Math.round(currentLocation?.y || 0)}</span>
        <span>{motionDebug?.isMoving ? "Walking" : "Stopped"}</span>
      </div>

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
        <button type="button" onClick={onStart}>{isNavigationRunning ? "Running" : "Start"}</button>
        <button type="button" onClick={onCalibrate}>Calibrate</button>
        <button type="button" onClick={onPause}>Pause</button>
        <button type="button" onClick={onReset}>Reset</button>
      </div>
    </section>
  );
}

export default LiveNavigationGuide;
