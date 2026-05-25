# Future Enhancement Roadmap

This document defines the next production-grade phases for the hospital indoor navigation POC.

The current system is a web proof of concept:

- React + Vite frontend
- React Konva floor map rendering
- HTML5 QR scanning
- Node.js + Express backend
- JSON sample maps
- QR-based starting location detection
- Simulated AR Live Guide

The current POC is suitable for manager demos, workflow validation, and UI/route logic discussions. Real camera-anchored AR and automatic indoor tracking require a native mobile app and physical location infrastructure.

## Phase 2: Real AR Indoor Navigation

Phase 2 moves from simulated AR in the browser to real camera-based AR navigation on Android.

### Recommended Platform

- Unity for mobile AR app development
- ARCore for Android camera tracking and floor plane detection
- ARKit later for iOS support
- Existing Node.js backend can continue serving maps, rooms, doctors, QR checkpoints, and routes

### How Phase 2 Works

1. Patient opens the mobile AR app.
2. Patient scans a QR code at reception.
3. QR code provides initial checkpoint, for example `F1_RECEPTION`.
4. Mobile app calls backend route API.
5. Backend returns route waypoints.
6. Unity converts route waypoints into AR world coordinates.
7. ARCore detects floor planes and tracks camera movement.
8. 3D cyan arrows are anchored to the detected floor plane.
9. Patient sees arrows on the real hospital floor through the camera.
10. Turn, lift, and arrival instructions update as the user approaches waypoints.

### Key Capabilities

- Real camera view
- Floor-anchored 3D arrows
- Live visual guidance
- Turn-by-turn instructions
- Lift transition UI
- Arrival confirmation at doctor room

### What Is Possible Now

The current backend route response can already be reused as the route source. The current QR checkpoint model is also production-aligned because QR gives a reliable initial position.

### What Needs Mobile AR Hardware

- Real floor detection
- AR camera tracking
- World anchors
- Real-time movement tracking
- 3D arrow rendering on the physical floor

These require Android devices with ARCore support.

## Phase 3: BLE Indoor Positioning

Phase 3 adds automatic indoor positioning using BLE beacons.

### BLE Beacon Deployment

Install BLE beacons near:

- Reception
- Lift lobby
- Staircase entrances
- Major corridor junctions
- Departments
- Labs
- Pharmacy
- Doctor room clusters
- Waiting areas

### How BLE Positioning Works

1. Mobile app scans nearby BLE signals.
2. Each beacon broadcasts a unique identifier.
3. App reads signal strength, usually RSSI.
4. Positioning engine estimates current patient location using proximity or trilateration.
5. Backend or mobile app maps beacon proximity to hospital zones.
6. Patient location updates automatically.
7. If patient deviates from route, app requests route recalculation.

### Combined QR + BLE + AR Tracking

Production-grade tracking should combine multiple signals:

- QR: reliable initial checkpoint
- BLE: automatic location updates across floors and corridors
- ARCore: visual movement and camera-relative tracking
- Backend route engine: recalculation and path guidance

### Recommended Phase 3 Flow

1. Patient scans QR at reception.
2. App receives initial route.
3. ARCore shows floor-anchored arrows.
4. BLE updates patient location in the background.
5. App compares live BLE position with expected route segment.
6. If patient deviates, route is recalculated.
7. AR arrows update to guide the patient back to the correct path.

## Suggested Delivery Plan

### Phase 2 Delivery

- Build Unity Android prototype
- Integrate QR scanner
- Call existing backend route API
- Convert waypoints into AR coordinates
- Place 3D arrow prefabs on detected floor
- Add lift and arrival UI

### Phase 3 Delivery

- Select BLE beacon hardware
- Install pilot beacons on 1 or 2 floors
- Build BLE scanning module
- Create beacon registry in backend
- Calibrate RSSI zones
- Add deviation detection and route recalculation
- Expand to all 10 floors after pilot validation

## Executive Summary

The current POC proves the workflow. Phase 2 makes navigation visually real with ARCore. Phase 3 makes location tracking automatic with BLE. Together, they create a production-ready indoor navigation platform for hospitals.
