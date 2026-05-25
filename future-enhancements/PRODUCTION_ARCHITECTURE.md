# Production Architecture

This document describes the target production architecture for hospital indoor navigation.

## High-Level Architecture

```text
Patient Mobile AR App
  -> QR Scanner
  -> BLE Scanner
  -> ARCore / ARKit
  -> 3D Arrow Renderer
  -> Route Guidance UI

Backend APIs
  -> Authentication
  -> Route Engine
  -> Map Management
  -> Doctor-Room Mapping
  -> Appointment Integration
  -> BLE Beacon Registry
  -> Live Tracking

Database
  -> PostgreSQL
  -> Optional Redis cache

Admin Dashboard
  -> Floor map editor
  -> Beacon management
  -> Doctor room assignment
  -> Analytics
```

## Mobile AR App

Recommended technology:

- Unity
- ARCore for Android
- ARKit for iOS later
- Native or Unity QR scanner
- Native BLE scanner plugin

Responsibilities:

- Scan QR checkpoint
- Request route from backend
- Detect AR floor plane
- Convert route waypoints to AR coordinates
- Render 3D cyan arrows
- Show turn-by-turn instructions
- Show lift transition UI
- Show arrival screen
- Scan BLE beacons in background
- Send live position updates
- Recalculate route if patient deviates

## Backend

Recommended technology:

- Node.js or FastAPI
- PostgreSQL
- Redis optional
- WebSocket for live updates

Core modules:

- Route engine
- Hospital map service
- Doctor-room mapping service
- Appointment integration service
- QR checkpoint service
- BLE beacon registry
- Indoor positioning service
- Live tracking service
- Analytics service

Note: The current POC uses Node.js. Production can continue with Node.js for consistency. FastAPI is an alternative if the team prefers Python for positioning algorithms, analytics, or ML services.

## Data Model

### hospital_floor_maps

Stores floor-level metadata.

Fields:

- floor_id
- hospital_id
- name
- level_number
- map_width
- map_height
- map_scale
- created_at
- updated_at

### rooms

Stores hospital rooms.

Fields:

- room_id
- floor_id
- room_number
- room_name
- room_type
- x
- y
- door_x
- door_y
- department_id

### route_waypoints

Stores navigable path points.

Fields:

- waypoint_id
- floor_id
- x
- y
- z
- waypoint_type
- connected_waypoint_ids
- label

### qr_checkpoints

Stores QR checkpoint locations.

Fields:

- checkpoint_id
- floor_id
- location_id
- label
- x
- y
- z
- qr_payload

### ble_beacons

Stores BLE beacon metadata.

Fields:

- beacon_id
- uuid
- major
- minor
- floor_id
- zone_id
- x
- y
- z
- label
- battery_status
- last_seen_at

### doctors

Stores doctor profiles.

Fields:

- doctor_id
- name
- specialty
- department_id
- default_room_id
- active_status

### appointments

Stores patient appointment mappings.

Fields:

- appointment_id
- patient_id
- doctor_id
- room_id
- appointment_time
- status

## End-to-End Flow

1. Patient opens mobile app.
2. Patient scans QR at reception.
3. Backend identifies current checkpoint.
4. Backend gets assigned doctor room from appointment.
5. Route engine calculates path from current checkpoint to doctor room.
6. Backend returns route waypoints and instruction steps.
7. App converts route waypoints into AR world coordinates.
8. ARCore detects floor plane.
9. App anchors 3D arrows on the detected floor.
10. BLE scanner continuously estimates current location.
11. App updates progress and instruction steps.
12. If patient deviates, app requests route recalculation.
13. On arrival, app shows doctor room confirmation.

## Route Recalculation Flow

```text
BLE position update
  -> Compare current zone with expected route segment
  -> If deviation detected
  -> Send current estimated location to backend
  -> Backend recalculates route
  -> Mobile app clears old AR anchors
  -> Mobile app renders new arrows
```

## Admin Dashboard

The existing React stack can evolve into an admin dashboard.

Admin features:

- Upload and edit floor maps
- Draw corridors and waypoints
- Assign rooms to doctors
- Register QR checkpoints
- Register BLE beacons
- Monitor beacon battery status
- View patient navigation analytics
- Identify high-confusion areas and bottlenecks

## Production Deployment

Suggested deployment:

- Backend API on cloud or hospital private server
- PostgreSQL managed database or on-premise database
- Redis optional for live state
- WebSocket service for live tracking
- Admin dashboard hosted internally
- Mobile AR app distributed through MDM, Play Store, or private APK

## Security and Privacy

Production system should include:

- Authentication for admin users
- Appointment lookup authorization
- No unnecessary storage of patient movement history
- Configurable retention policy
- HTTPS everywhere
- Audit logs for admin changes
- Hospital IT compliance review
