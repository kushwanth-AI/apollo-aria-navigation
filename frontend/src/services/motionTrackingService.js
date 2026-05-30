const STEP_LENGTH_METERS = 0.72;
const STEP_ACCELERATION_THRESHOLD = 0.82;
const STEP_COOLDOWN_MS = 340;
const STILLNESS_TIMEOUT_MS = 1400;
const BASELINE_SMOOTHING = 0.9;

const isMobileDevice = () => {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android|iPhone|iPad|iPod|IEMobile|Mobile/i.test(navigator.userAgent || "");
};

const normalizeHeading = (heading) => {
  if (!Number.isFinite(heading)) {
    return 0;
  }

  return ((heading % 360) + 360) % 360;
};

const getHeadingFromOrientation = (event) => {
  if (Number.isFinite(event.webkitCompassHeading)) {
    return normalizeHeading(event.webkitCompassHeading);
  }

  if (Number.isFinite(event.alpha)) {
    return normalizeHeading(360 - event.alpha);
  }

  return null;
};

const accelerationMagnitude = (acceleration = {}) => {
  const x = acceleration.x || 0;
  const y = acceleration.y || 0;
  const z = acceleration.z || 0;
  return Math.sqrt(x * x + y * y + z * z);
};

export class MotionTrackingService {
  constructor({ onUpdate, onStop } = {}) {
    this.onUpdate = onUpdate;
    this.onStop = onStop;
    this.isRunning = false;
    this.isMobile = isMobileDevice();
    this.baselineMagnitude = null;
    this.lastStepAt = 0;
    this.lastMovementAt = 0;
    this.steps = 0;
    this.distanceMeters = 0;
    this.heading = 0;
    this.calibratedHeading = 0;
    this.motionEvents = 0;
    this.orientationEvents = 0;
    this.gyroscopeEvents = 0;
    this.accelerometerEvents = 0;
    this.lastAccelerationDelta = 0;
    this.movementVector = { x: 0, y: 0, z: 0 };
    this.sensorActive = false;
    this.permissionState = "idle";
    this.motionSupported = typeof window !== "undefined" && "DeviceMotionEvent" in window;
    this.orientationSupported = typeof window !== "undefined" && "DeviceOrientationEvent" in window;
    this.genericAccelerometerSupported = typeof window !== "undefined" && "Accelerometer" in window;
    this.gyroscopeSupported = typeof window !== "undefined" && "Gyroscope" in window;
    this.motionHandler = this.handleMotion.bind(this);
    this.orientationHandler = this.handleOrientation.bind(this);
    this.stillnessTimer = null;
    this.accelerometer = null;
    this.gyroscope = null;
  }

  snapshot(extra = {}) {
    const isMoving = this.isRunning && Date.now() - this.lastMovementAt < STILLNESS_TIMEOUT_MS;

    return {
      steps: this.steps,
      distanceMeters: this.distanceMeters,
      heading: this.heading,
      calibratedHeading: this.calibratedHeading,
      motionEvents: this.motionEvents,
      orientationEvents: this.orientationEvents,
      accelerometerEvents: this.accelerometerEvents,
      gyroscopeEvents: this.gyroscopeEvents,
      accelerationDelta: this.lastAccelerationDelta,
      movementVector: this.movementVector,
      movementState: isMoving ? "walking" : "standing",
      isMoving,
      sensorActive: this.sensorActive,
      permissionState: this.permissionState,
      isMobile: this.isMobile,
      motionSupported: this.motionSupported,
      orientationSupported: this.orientationSupported,
      genericAccelerometerSupported: this.genericAccelerometerSupported,
      gyroscopeSupported: this.gyroscopeSupported,
      ...extra
    };
  }

  async requestPermission() {
    if (typeof window === "undefined") {
      this.permissionState = "unavailable";
      return false;
    }

    if (!this.isMobile) {
      this.permissionState = "desktop-demo";
      this.onUpdate?.(this.snapshot({ status: "Desktop demo tracking ready" }));
      return true;
    }

    const MotionEventCtor = window.DeviceMotionEvent;
    const OrientationEventCtor = window.DeviceOrientationEvent;
    let motionAllowed = this.motionSupported || this.genericAccelerometerSupported;
    let orientationAllowed = this.orientationSupported;

    try {
      if (typeof MotionEventCtor?.requestPermission === "function") {
        const motionPermission = await MotionEventCtor.requestPermission();
        motionAllowed = motionPermission === "granted";
      }

      if (typeof OrientationEventCtor?.requestPermission === "function") {
        const orientationPermission = await OrientationEventCtor.requestPermission();
        orientationAllowed = orientationPermission === "granted";
      }

      if (!motionAllowed && !orientationAllowed) {
        this.permissionState = "sensor-denied";
        return false;
      }

      if (!motionAllowed) {
        this.permissionState = "orientation-only";
        return true;
      }

      if (!orientationAllowed) {
        this.permissionState = "motion-only";
        return true;
      }

      this.permissionState = "granted";
      return true;
    } catch (error) {
      this.permissionState = "permission-error";
      return false;
    }
  }

  async start() {
    const allowed = await this.requestPermission();

    if (!allowed) {
      this.sensorActive = false;
      this.onUpdate?.(this.snapshot({ status: "Sensor permission denied" }));
      return false;
    }

    this.isRunning = true;
    this.sensorActive = true;
    this.baselineMagnitude = null;
    this.lastMovementAt = Date.now();

    if (!this.isMobile) {
      this.onUpdate?.(this.snapshot({ status: "Desktop demo tracking active" }));
      return true;
    }

    window.addEventListener("devicemotion", this.motionHandler, { passive: true });
    window.addEventListener("deviceorientation", this.orientationHandler, { passive: true });
    window.addEventListener("deviceorientationabsolute", this.orientationHandler, { passive: true });
    this.startGenericSensors();
    this.startStillnessWatch();
    this.onUpdate?.(this.snapshot({ status: "Live mobile motion tracking active" }));
    return true;
  }

  pause() {
    this.isRunning = false;
    this.sensorActive = false;
    window.removeEventListener("devicemotion", this.motionHandler);
    window.removeEventListener("deviceorientation", this.orientationHandler);
    window.removeEventListener("deviceorientationabsolute", this.orientationHandler);
    window.clearInterval(this.stillnessTimer);
    this.stopGenericSensors();
    this.onStop?.(this.snapshot({ status: "Live sensor tracking paused" }));
  }

  reset() {
    this.pause();
    this.baselineMagnitude = null;
    this.lastStepAt = 0;
    this.lastMovementAt = 0;
    this.steps = 0;
    this.distanceMeters = 0;
    this.motionEvents = 0;
    this.orientationEvents = 0;
    this.gyroscopeEvents = 0;
    this.accelerometerEvents = 0;
    this.lastAccelerationDelta = 0;
    this.movementVector = { x: 0, y: 0, z: 0 };
    this.onUpdate?.(this.snapshot({ status: "Live sensor tracking reset" }));
  }

  calibrate() {
    this.calibratedHeading = this.heading;
    this.onUpdate?.(this.snapshot({ status: "Heading baseline recalibrated" }));
  }

  handleOrientation(event) {
    const heading = getHeadingFromOrientation(event);

    if (heading === null) {
      return;
    }

    this.orientationEvents += 1;
    this.heading = heading;
    this.onUpdate?.(this.snapshot({ status: "Compass heading updated" }));
  }

  handleMotion(event) {
    if (!this.isRunning) {
      return;
    }

    const acceleration = event.accelerationIncludingGravity || event.acceleration;
    if (!acceleration) {
      return;
    }

    this.motionEvents += 1;
    this.processAcceleration(acceleration, "DeviceMotionEvent");
  }

  processAcceleration(acceleration, source) {
    const magnitude = accelerationMagnitude(acceleration);
    this.baselineMagnitude = this.baselineMagnitude === null
      ? magnitude
      : this.baselineMagnitude * BASELINE_SMOOTHING + magnitude * (1 - BASELINE_SMOOTHING);

    const delta = Math.abs(magnitude - this.baselineMagnitude);
    this.lastAccelerationDelta = delta;
    this.movementVector = {
      x: acceleration.x || 0,
      y: acceleration.y || 0,
      z: acceleration.z || 0
    };

    const now = Date.now();
    if (delta > STEP_ACCELERATION_THRESHOLD && now - this.lastStepAt > STEP_COOLDOWN_MS) {
      this.lastStepAt = now;
      this.lastMovementAt = now;
      this.steps += 1;
      this.distanceMeters += STEP_LENGTH_METERS;
      this.onUpdate?.(this.snapshot({
        status: "Step detected",
        accelerationDelta: delta,
        sensorSource: source
      }));
      return;
    }

    if ((this.motionEvents + this.accelerometerEvents) % 12 === 0) {
      this.onUpdate?.(this.snapshot({
        status: "Motion detected, waiting for walking step",
        sensorSource: source
      }));
    }
  }

  startGenericSensors() {
    this.stopGenericSensors();

    try {
      if (this.genericAccelerometerSupported) {
        this.accelerometer = new window.Accelerometer({ frequency: 30 });
        this.accelerometer.addEventListener("reading", () => {
          this.accelerometerEvents += 1;
          this.processAcceleration({
            x: this.accelerometer.x,
            y: this.accelerometer.y,
            z: this.accelerometer.z
          }, "Accelerometer");
        });
        this.accelerometer.start();
      }

      if (this.gyroscopeSupported) {
        this.gyroscope = new window.Gyroscope({ frequency: 30 });
        this.gyroscope.addEventListener("reading", () => {
          this.gyroscopeEvents += 1;
        });
        this.gyroscope.start();
      }
    } catch (error) {
      this.accelerometer = null;
      this.gyroscope = null;
    }
  }

  stopGenericSensors() {
    this.accelerometer?.stop?.();
    this.gyroscope?.stop?.();
    this.accelerometer = null;
    this.gyroscope = null;
  }

  startStillnessWatch() {
    window.clearInterval(this.stillnessTimer);
    this.stillnessTimer = window.setInterval(() => {
      if (!this.isRunning) {
        return;
      }

      if (Date.now() - this.lastMovementAt >= STILLNESS_TIMEOUT_MS) {
        this.onUpdate?.(this.snapshot({ status: "Standing still" }));
      }
    }, 500);
  }
}

export const createMotionTrackingService = (options) => new MotionTrackingService(options);
export const createLiveMotionTracker = createMotionTrackingService;
