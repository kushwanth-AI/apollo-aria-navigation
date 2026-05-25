# BLE Beacon Plan

This document outlines a practical BLE beacon deployment plan for a 10-floor hospital.

## Why BLE Beacons

GPS does not work reliably indoors. BLE beacons provide low-cost indoor positioning by broadcasting signals that mobile devices can detect.

BLE is useful for:

- Automatic patient location updates
- Detecting corridor zones
- Confirming floor-level movement
- Identifying proximity to lift lobby, departments, and doctor room clusters
- Route deviation detection

## Beacon Placement Strategy

Place beacons near:

- Main reception
- Lift lobby on each floor
- Staircase entrance on each floor
- Main corridor junctions
- Department entrances
- Labs
- Pharmacy
- Waiting areas
- Doctor room clusters
- Long corridor midpoints

## Recommended Density

For the current sample hospital:

- 10 floors
- 8 to 12 beacons per floor
- Total estimate: 80 to 120 beacons

Suggested per-floor layout:

- 1 near lift lobby
- 1 near stairs
- 2 to 4 along main corridors
- 1 near department entry
- 1 near waiting area
- 1 near lab or pharmacy if present
- 1 to 2 near doctor room clusters

## Cost Estimate in INR

| Item | Estimate |
|---|---:|
| Beacon count | 80 to 120 |
| Beacon unit cost | Rs. 800 to Rs. 3,000 each |
| Hardware cost | Rs. 64,000 to Rs. 3,60,000 |
| Installation and calibration | Rs. 1,00,000 to Rs. 3,00,000 |
| Initial maintenance buffer | Rs. 25,000 to Rs. 75,000 |
| Total estimated Phase 3 cost | Rs. 2,00,000 to Rs. 7,00,000 |

Actual cost depends on beacon model, battery life, installation vendor, calibration complexity, and hospital layout.

## Accuracy Expectations

BLE accuracy depends on wall material, crowd density, interference, beacon density, and calibration.

Expected accuracy:

- Zone detection: good
- Room cluster detection: good with careful placement
- Exact room-level detection: possible but not guaranteed
- Typical accuracy: 2m to 5m
- Best-case calibrated accuracy: 1m to 3m

BLE should be combined with QR and ARCore, not used alone.

## Calibration

Calibration steps:

1. Install beacons at planned locations.
2. Record beacon ID and physical coordinates.
3. Walk each corridor with test mobile app.
4. Capture RSSI values at known points.
5. Tune signal thresholds.
6. Define proximity zones.
7. Validate route progress detection.
8. Repeat after layout changes or major interference changes.

## Maintenance

Beacon maintenance includes:

- Battery checks
- Signal health monitoring
- Replacement of weak or missing beacons
- Recalibration after physical movement
- Firmware updates if supported
- Periodic audit of beacon placement

## Battery Replacement

Typical BLE beacon battery life:

- 12 months to 36 months depending on broadcast interval and battery size

Recommended maintenance plan:

- Monthly dashboard health check
- Quarterly physical inspection
- Battery replacement every 12 to 24 months
- Immediate replacement for low-battery critical beacons near lift and reception

## Pilot Recommendation

Start with a pilot deployment:

- Reception floor
- One destination floor
- 15 to 25 beacons

Validate:

- Signal stability
- Floor transition detection
- Route deviation detection
- Patient movement update quality
- Operational maintenance effort

After pilot success, expand to all 10 floors.
