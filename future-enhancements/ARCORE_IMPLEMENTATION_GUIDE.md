# ARCore Implementation Guide

This document explains how to implement real AR indoor navigation using Unity and ARCore.

## Goal

Create a mobile app where the patient sees cyan 3D arrows placed on the real hospital floor through the phone camera.

## Technology

- Unity
- AR Foundation
- ARCore XR Plugin
- Android device with ARCore support
- QR scanner plugin or native Android QR scanner bridge
- Existing backend route API

## Implementation Steps

### 1. Unity Project Setup

1. Create a Unity 3D project.
2. Install AR Foundation.
3. Install ARCore XR Plugin.
4. Enable Android build target.
5. Configure package name and minimum Android version.
6. Enable camera permission.

### 2. ARCore Setup

Add to scene:

- AR Session
- AR Session Origin or XR Origin
- AR Camera
- AR Plane Manager
- AR Raycast Manager
- AR Anchor Manager

Enable:

- Horizontal plane detection
- Camera tracking
- Light estimation if needed

### 3. QR Scanner Integration

Use QR scanner to read payload:

```json
{
  "floor": 1,
  "location_id": "F1_RECEPTION"
}
```

QR result provides the initial known hospital checkpoint.

### 4. Route Waypoint Loading

Call backend:

```http
POST /api/navigation/route
```

Request:

```json
{
  "current_location_id": "F1_RECEPTION",
  "destination_room_id": "F3_R305"
}
```

Response contains:

- current location
- destination room
- steps
- route waypoints

### 5. Coordinate Conversion

Backend route waypoints are map coordinates. Unity needs AR world coordinates.

Example approach:

- QR checkpoint becomes AR origin.
- Convert map x/y deltas into Unity x/z deltas.
- Use detected floor plane y coordinate for arrow placement.
- Scale map units to meters.

Example:

```text
unityX = (waypoint.x - qrCheckpoint.x) * mapScale
unityZ = (waypoint.y - qrCheckpoint.y) * mapScale
unityY = detectedFloorPlaneY + 0.02
```

### 6. 3D Arrow Prefab

Create arrow prefab:

- Cyan material
- Emission enabled
- Slight transparent glow
- Directional arrow mesh
- Optional animated pulse
- Label billboard for instruction text

Place arrows along route segments every 1 to 2 meters.

### 7. Floor Anchor Placement

After ARCore detects a horizontal floor plane:

1. Raycast to floor.
2. Create anchor at floor position.
3. Parent route arrow objects to anchor.
4. Maintain arrow stability as camera moves.

### 8. Turn Instruction UI

Create mobile UI overlay:

- Current step
- Distance
- Direction icon
- Floor
- ETA
- Next checkpoint

Examples:

- Continue straight
- Turn right near Pharmacy
- Take lift to Floor 3
- Room R305 is on your left

### 9. Lift Transition UI

When route changes floor:

1. Clear current floor AR arrows.
2. Show lift transition screen.
3. Display `Going to Floor 3`.
4. Wait for QR or BLE confirmation on destination floor.
5. Re-anchor route arrows using destination floor lift lobby as origin.

### 10. Arrival Screen

When user reaches final waypoint:

- Show `You have arrived`
- Show doctor name
- Show room number
- Highlight destination marker
- Stop navigation session

## Pseudo-Code

### QR Scan and Route Request

```csharp
void OnQrScanned(string qrText)
{
    QrPayload payload = JsonUtility.FromJson<QrPayload>(qrText);

    RouteRequest request = new RouteRequest {
        current_location_id = payload.location_id,
        destination_room_id = assignedDoctorRoomId
    };

    StartCoroutine(PostRouteRequest(request));
}
```

### Receive Route and Create AR Anchors

```csharp
IEnumerator PostRouteRequest(RouteRequest request)
{
    string json = JsonUtility.ToJson(request);
    UnityWebRequest www = CreatePostRequest("/api/navigation/route", json);
    yield return www.SendWebRequest();

    RouteResponse route = JsonUtility.FromJson<RouteResponse>(www.downloadHandler.text);
    currentRoute = route;

    DetectFloorAndPlaceRoute(route.route);
}
```

### Convert Waypoints to AR Coordinates

```csharp
Vector3 ConvertMapPointToWorld(RoutePoint point, RoutePoint origin)
{
    float unityX = (point.x - origin.x) * mapScale;
    float unityZ = (point.y - origin.y) * mapScale;
    float unityY = detectedFloorY + 0.02f;

    return new Vector3(unityX, unityY, unityZ);
}
```

### Place Arrow Prefabs

```csharp
void PlaceArrows(List<RoutePoint> routePoints)
{
    for (int i = 0; i < routePoints.Count - 1; i++)
    {
        Vector3 start = ConvertMapPointToWorld(routePoints[i], routeOrigin);
        Vector3 end = ConvertMapPointToWorld(routePoints[i + 1], routeOrigin);
        Vector3 direction = (end - start).normalized;

        for (float d = 0; d < Vector3.Distance(start, end); d += 1.5f)
        {
            Vector3 position = start + direction * d;
            GameObject arrow = Instantiate(arrowPrefab, position, Quaternion.LookRotation(direction));
            arrow.transform.SetParent(routeAnchor.transform);
        }
    }
}
```

### Update Instruction by Waypoint Proximity

```csharp
void Update()
{
    if (!navigationActive) return;

    Vector3 userPosition = arCamera.transform.position;
    float distanceToNext = Vector3.Distance(userPosition, currentWaypointWorldPosition);

    instructionUI.SetDistance(distanceToNext);

    if (distanceToNext < waypointReachThreshold)
    {
        AdvanceToNextWaypoint();
    }
}
```

### BLE-Assisted Route Update

```csharp
void OnBlePositionUpdated(BlePosition position)
{
    if (IsOffRoute(position))
    {
        RequestRouteRecalculation(position.location_id, destinationRoomId);
    }
}
```

## Development Milestones

1. Unity ARCore setup with plane detection
2. QR scan reads hospital checkpoint
3. Backend route API integration
4. Static arrow placement on detected floor
5. Route step UI
6. Moving user progress
7. Lift transition
8. Arrival screen
9. BLE integration
10. Route recalculation

## Practical Notes

- ARCore drift can occur over long walking distances.
- Use QR checkpoints or BLE zones to periodically correct location.
- Lighting and reflective floors can affect plane detection.
- Multi-floor AR requires resetting anchors after lift transition.
- BLE improves automatic updates but needs calibration.
