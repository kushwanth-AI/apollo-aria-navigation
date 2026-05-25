const STEP_LENGTH_METERS = 0.72;
const STEP_ACCELERATION_THRESHOLD = 0.95;
const STEP_COOLDOWN_MS = 320;
const STILLNESS_TIMEOUT_MS = 1400;

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

export class LiveMotionTracker {
  constructor({ onUpdate, onStop } = {}) {
    this.onUpdate = onUpdate;
    this.onStop = onStop;
    this.isRunning = false;
    this.baselineMagnitude = null;
    this.lastStepAt = 0;
    this.lastMovementAt = 0;
    this.steps = 0;
    this.distanceMeters = 0;
    this.heading = 0;
    this.calibratedHeading = 0;
    this.motionEvents = 0;
    this.orientationEvents = 0;
    this.lastAccelerationDelta = 0;
    this.motionSupported = typeof window !== "undefined" && "DeviceMotionEvent" in window;
    this.orientationSupported = typeof window !== "undefined" && "DeviceOrientationEvent" in window;
    this.motionHandler = this.handleMotion.bind(this);
    this.orientationHandler = this.handleOrientation.bind(this);
    this.stillnessTimer = null;
  }

  snapshot(extra = {}) {
    return {
      steps: this.steps,
      distanceMeters: this.distanceMeters,
      heading: this.heading,
      calibratedHeading: this.calibratedHeading,
      motionEvents: this.motionEvents,
      orientationEvents: this.orientationEvents,
      accelerationDelta: this.lastAccelerationDelta,
      isMoving: this.isRunning && Date.now() - this.lastMovementAt < STILLNESS_TIMEOUT_MS,
      motionSupported: this.motionSupported,
      orientationSupported: this.orientationSupported,
      ...extra
    };
  }

  async requestPermission() {
    if (typeof window === "undefined") {
      return false;
    }

    const MotionEventCtor = window.DeviceMotionEvent;
    const OrientationEventCtor = window.DeviceOrientationEvent;

    if (typeof MotionEventCtor?.requestPermission === "function") {
      const motionPermission = await MotionEventCtor.requestPermission();
      if (motionPermission !== "granted") {
        return false;
      }
    }

    if (typeof OrientationEventCtor?.requestPermission === "function") {
      const orientationPermission = await OrientationEventCtor.requestPermission();
      if (orientationPermission !== "granted") {
        return false;
      }
    }

    return true;
  }

  async start() {
    const allowed = await this.requestPermission();

    if (!allowed) {
      this.onUpdate?.(this.snapshot({ status: "Sensor permission denied" }));
      return false;
    }

    this.isRunning = true;
    this.baselineMagnitude = null;
    this.lastMovementAt = Date.now();
    window.addEventListener("devicemotion", this.motionHandler);
    window.addEventListener("deviceorientation", this.orientationHandler);
    window.addEventListener("deviceorientationabsolute", this.orientationHandler);
    this.startStillnessWatch();
    this.onUpdate?.(this.snapshot({ status: "Live sensor tracking active" }));
    return true;
  }

  pause() {
    this.isRunning = false;
    window.removeEventListener("devicemotion", this.motionHandler);
    window.removeEventListener("deviceorientation", this.orientationHandler);
    window.removeEventListener("deviceorientationabsolute", this.orientationHandler);
    window.clearInterval(this.stillnessTimer);
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
    this.lastAccelerationDelta = 0;
    this.onUpdate?.(this.snapshot({ status: "Live sensor tracking reset" }));
  }

  calibrate() {
    this.calibratedHeading = this.heading;
    this.onUpdate?.(this.snapshot({ status: "Heading calibrated to corridor" }));
  }

  handleOrientation(event) {
    const heading = getHeadingFromOrientation(event);

    if (heading === null) {
      return;
    }

    this.orientationEvents += 1;
    this.heading = heading;
    this.onUpdate?.(this.snapshot({ status: "Heading updated" }));
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
    const x = acceleration.x || 0;
    const y = acceleration.y || 0;
    const z = acceleration.z || 0;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    this.baselineMagnitude = this.baselineMagnitude === null
      ? magnitude
      : this.baselineMagnitude * 0.92 + magnitude * 0.08;

    const delta = Math.abs(magnitude - this.baselineMagnitude);
    this.lastAccelerationDelta = delta;
    const now = Date.now();

    if (delta > STEP_ACCELERATION_THRESHOLD && now - this.lastStepAt > STEP_COOLDOWN_MS) {
      this.lastStepAt = now;
      this.lastMovementAt = now;
      this.steps += 1;
      this.distanceMeters += STEP_LENGTH_METERS;
      this.onUpdate?.(this.snapshot({ status: "Step detected", accelerationDelta: delta }));
      return;
    }

    if (this.motionEvents % 12 === 0) {
      this.onUpdate?.(this.snapshot({ status: "Motion detected, waiting for walking step" }));
    }
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

export const createLiveMotionTracker = (options) => new LiveMotionTracker(options);
