# Tech Stack Comparison

This document compares the current POC stack with the recommended production-grade stack.

## Current POC Stack

| Area | Current Technology | Purpose |
|---|---|---|
| Frontend | React + Vite | Web application and demo UI |
| Floor Map | React Konva | 2D hospital map rendering |
| QR Scanning | html5-qrcode | Browser-based QR scan |
| Backend | Node.js + Express | REST APIs for maps, doctors, rooms, and navigation |
| Data | JSON files | Sample floors, rooms, QR locations, and doctors |
| AR Guide | CSS/React simulated AR | Manager demo of AR-style guidance |
| Positioning | QR checkpoint only | Initial location detection |

## Current POC Strengths

- Runs locally without database
- Easy to demo
- Validates patient journey
- Demonstrates route logic
- Shows QR-based starting location
- Includes simulated AR-style navigation

## Current POC Limitations

- Browser cannot provide true ARCore floor anchoring
- No real camera-based 3D arrows
- No automatic indoor positioning
- No BLE tracking
- JSON data is not suitable for production operations
- No appointment system integration
- No analytics or live monitoring

## Production Stack

| Area | Production Technology | Purpose |
|---|---|---|
| Mobile AR App | Unity | Cross-platform 3D mobile app development |
| Android AR | ARCore | Camera tracking, plane detection, floor anchoring |
| iOS AR | ARKit | iOS camera tracking and AR anchoring |
| QR Scanning | Native mobile QR scanner or Unity plugin | Initial checkpoint detection |
| BLE Tracking | BLE scanner in mobile app | Automatic indoor location updates |
| Backend | Node.js or FastAPI | Production APIs and route engine |
| Database | PostgreSQL | Persistent hospital maps, rooms, doctors, appointments, beacon registry |
| Cache | Redis optional | Fast route/session state and live tracking |
| Live Updates | WebSocket | Real-time patient location, dashboard, and route recalculation |
| Indoor Positioning | Beacon positioning engine | RSSI filtering, proximity zones, location estimation |
| Admin Dashboard | React | Map management, beacon management, analytics |
| Analytics | PostgreSQL + dashboard reports | Route usage, bottlenecks, patient journey metrics |

## POC vs Production Summary

| Capability | Current POC | Production System |
|---|---|---|
| QR start location | Yes | Yes |
| 2D floor map | Yes | Yes, managed in database |
| Simulated AR UI | Yes | Replaced by real AR |
| Real camera AR | No | Yes, Unity + ARCore |
| Floor-anchored arrows | Simulated | Yes |
| Automatic position updates | No | Yes, BLE + ARCore |
| Route recalculation | Basic | Dynamic |
| Multi-floor route | Basic | Production-grade |
| Data storage | JSON | PostgreSQL |
| Live tracking | No | WebSocket |
| Admin tools | No | Yes |
| Appointment integration | Demo default doctor | Hospital appointment system |

## Recommended Direction

Use the existing React POC as the management and workflow demo. Build the production patient-facing navigation app as a Unity mobile application. Keep React for admin dashboards, analytics, map management, and operational tools.
