# Hospital Indoor Navigation — POC Documentation

**Document Type:** Management Presentation  
**Version:** 1.0  
**Status:** Phase 1 — Active POC  
**Prepared for:** Hospital Leadership & IT Management  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Phase 1 — QR Smart Indoor Navigation (Current POC)](#2-phase-1--qr-smart-indoor-navigation-current-poc)
3. [Phase 1 — Technology Stack](#3-phase-1--technology-stack)
4. [Phase 1 — Benefits](#4-phase-1--benefits)
5. [Phase 1 — Limitations](#5-phase-1--limitations)
6. [Phase 1 — Cost Estimate](#6-phase-1--cost-estimate)
7. [Phase 2 — BLE Beacon Indoor Navigation](#7-phase-2--ble-beacon-indoor-navigation)
8. [Phase 2 — BLE Technology Stack](#8-phase-2--ble-technology-stack)
9. [Phase 2 — BLE Benefits](#9-phase-2--ble-benefits)
10. [Phase 2 — BLE Limitations](#10-phase-2--ble-limitations)
11. [Phase 2 — BLE Budget Estimate](#11-phase-2--ble-budget-estimate)
12. [QR vs BLE — Comparison](#12-qr-vs-ble--comparison)
13. [Recommended Rollout Plan](#13-recommended-rollout-plan)
14. [Final Recommendation](#14-final-recommendation)
15. [Visual Architecture Diagrams](#15-visual-architecture-diagrams)

---

## 1. Executive Summary

Hospitals are large, complex environments. Patients and visitors often struggle to find the right ward, OPD room, or department — leading to frustration, delays, and a poor experience.

This document outlines a **two-phase Indoor Navigation solution** designed to solve this problem in a cost-effective, scalable manner.

### What We Are Building

| Phase | Approach | Status |
|-------|----------|--------|
| Phase 1 | QR-based Smart Navigation | ✅ Active POC |
| Phase 2 | BLE Beacon Auto-Tracking | 🔵 Future Enhancement |

### Key Highlights

- **Phase 1 (Current POC)** uses QR codes placed at key hospital checkpoints. Patients scan a QR code, and the system instantly shows them turn-by-turn directions to their destination — no expensive hardware required.

- **Phase 2 (Future)** upgrades to Bluetooth Low Energy (BLE) beacons for fully automatic indoor tracking, similar to how GPS works outdoors.

- **Goal:** Improve the patient navigation experience, reduce staff interruptions for directions, and lay the foundation for a smart hospital infrastructure.

- **Immediate Priority:** Validate the QR-based approach with management and staff before investing in hardware.

---

## 2. Phase 1 — QR Smart Indoor Navigation (Current POC)

### Overview

Phase 1 is a **web-based navigation system** that guides patients from the hospital entrance to their destination using QR codes placed at key checkpoints (reception, lift lobbies, corridor junctions).

No app download is needed. Patients simply scan a QR code using their phone's camera.

### How It Works — Step by Step

```
Step 1 → Patient arrives at hospital
Step 2 → Scans QR code at reception / entrance
Step 3 → Enters destination (e.g., "OPD Room 204")
Step 4 → System generates the shortest route
Step 5 → Live AR-style guide appears on screen
Step 6 → Patient follows animated arrows through corridors
Step 7 → At each checkpoint, patient scans next QR to re-confirm position
Step 8 → Patient arrives at destination ✅
```

### Key Features

- **QR Checkpoints** — Placed at reception, lift lobbies, floor junctions, and key corridors
- **Konva Floor Maps** — Interactive, zoomable hospital floor maps rendered digitally
- **Live AR-Style Guide** — Animated directional arrows guide the user in real time
- **Lift / Floor Transitions** — Navigation handles multi-floor journeys (e.g., "Take Lift to Floor 3")
- **Turn-by-Turn Directions** — Clear instructions at every junction (e.g., "Turn left → walk 30m → enter Room 204")

### User Experience Flow

```
[ Patient scans QR at Reception ]
          ↓
[ System detects location checkpoint ]
          ↓
[ Route is calculated on floor map ]
          ↓
[ Live AR-style arrows appear on screen ]
          ↓
[ Patient follows corridor-by-corridor guide ]
          ↓
[ Lift transition handled automatically ]
          ↓
[ Patient arrives at destination ] ✅
```

---

## 3. Phase 1 — Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React + Vite | Fast, lightweight web app |
| **Floor Map Rendering** | react-konva | Interactive hospital floor maps |
| **QR Code Scanning** | html5-qrcode | In-browser QR scanning (no app needed) |
| **Backend Server** | Node.js + Express.js | Route calculation and API handling |
| **Map Data** | JSON-based floor maps | Lightweight, editable map definitions |
| **Route Engine** | Custom pathfinding logic | Shortest path between checkpoints |
| **Navigation UI** | AR-style animated arrows | Corridor simulation and direction display |

> **Design Principle:** This stack was chosen to be lean, fast to deploy, and easy to maintain — ideal for a POC that needs to demonstrate value quickly without heavy infrastructure.

---

## 4. Phase 1 — Benefits

### Why QR Smart Navigation is the Right Starting Point

- **Lowest Possible Cost** — No hardware purchases. QR codes cost pennies to print.
- **Fast Deployment** — Can be live within weeks, not months.
- **No Hardware Installation** — No drilling, no wiring, no facilities team dependency.
- **Works on Any Smartphone** — Patients use their own devices; no special equipment needed.
- **Runs in a Web Browser** — No app installation required for patients.
- **Easy Management Demo** — Simple, visual, and instantly understandable for stakeholders.
- **Good Patient Guidance** — Meaningful improvement over printed maps or asking staff.
- **Clear Upgrade Path** — The same backend infrastructure powers Phase 2 (BLE) with minimal rework.

---

## 5. Phase 1 — Limitations

Understanding the limitations helps set the right expectations for this POC phase.

- **Manual Checkpoint Scanning** — Patients must actively scan QR codes at each checkpoint; the system does not auto-detect their location.
- **Not Fully Automatic** — Unlike GPS, there is no continuous real-time tracking between scans.
- **Position Updates Only at Scan Points** — If a patient takes a wrong turn between checkpoints, the system cannot self-correct until the next scan.
- **Limited Analytics** — Basic usage tracking only; no detailed patient flow data.
- **Depends on Patient Action** — Navigation quality depends on patients remembering to scan at each checkpoint.

> These limitations are fully expected at POC stage and are addressed in Phase 2 (BLE).

---

## 6. Phase 1 — Cost Estimate

### Budget Breakdown (INR)

| Item | Estimated Cost (INR) |
|------|---------------------|
| QR Code Printing (laminated, weatherproof) | ₹2,000 – ₹5,000 |
| QR Code Standees / Wall Mounting | ₹3,000 – ₹8,000 |
| Development (POC build) | ₹40,000 – ₹80,000 |
| Cloud Hosting (first 6 months) | ₹5,000 – ₹12,000 |
| Hospital Floor Map Digitisation (sample) | ₹8,000 – ₹15,000 |
| Testing & QA | ₹5,000 – ₹10,000 |
| **Approximate Total** | **₹63,000 – ₹1,30,000** |

> **Note:** This is an approximate estimate for a single-floor or two-floor POC covering one wing or OPD block. Full hospital rollout costs will be scoped separately after POC validation.

### Verdict

> ✅ **This is the best low-cost POC option available.** For under ₹1.5 lakh, the hospital gets a working, demonstrable patient navigation system.

---

## 7. Phase 2 — BLE Beacon Indoor Navigation

### What is BLE?

**BLE (Bluetooth Low Energy)** beacons are small, battery-powered wireless devices installed on walls and ceilings throughout the hospital. Each beacon continuously broadcasts a unique signal.

When a patient walks through the hospital with their phone, the phone automatically detects nearby beacons and calculates the patient's location — no scanning required.

### How It Works

```
[ BLE Beacons installed throughout hospital ]
          ↓
[ Patient's phone detects nearby beacon signals ]
          ↓
[ Location Engine triangulates patient position ]
          ↓
[ Route Engine updates in real time ]
          ↓
[ Navigation updates automatically on screen ]
          ↓
[ Patient sees live blue-dot on hospital map ]
          ↓
[ Arrives at destination with full guidance ] ✅
```

### QR vs BLE — The Simple Difference

| | QR Navigation | BLE Navigation |
|---|---|---|
| **How location is detected** | Patient scans QR at checkpoints | Phone detects beacons automatically |
| **Tracking style** | Manual, step-by-step | Continuous, automatic |
| **Feel** | Guided checkpoint navigation | Indoor GPS |

> **Think of it this way:** QR navigation is like following signposts. BLE navigation is like Google Maps — your position updates live as you move.

---

## 8. Phase 2 — BLE Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **BLE Beacons** | iBeacon / Eddystone hardware | Physical location broadcast devices |
| **Mobile App** | React Native (iOS + Android) | Native app for accurate beacon scanning |
| **Location Engine** | Beacon triangulation algorithm | Calculates real-time patient position |
| **Floor Map Rendering** | react-konva / MapLibre | Interactive multi-floor maps |
| **Backend** | Node.js + PostgreSQL | Location data, routes, analytics storage |
| **Analytics Dashboard** | Custom web dashboard | Patient flow, heatmaps, usage statistics |
| **Future AR Layer** | ARCore (Android) / ARKit (iOS) | Augmented reality corridor overlay |

---

## 9. Phase 2 — BLE Benefits

BLE unlocks a significantly richer experience for patients and operational intelligence for the hospital.

### Patient Experience
- **Automatic Location Updates** — No scanning needed; navigation updates as the patient walks
- **Live Blue-Dot Tracking** — Patient sees their live position on the hospital map
- **Better Accuracy** — Position updates every few seconds, not just at checkpoints
- **Seamless Multi-Floor Navigation** — Detects floor changes automatically via elevator beacons

### Hospital Operations
- **Patient Flow Analytics** — Understand how patients move through the hospital
- **Congestion Heatmaps** — Identify bottlenecks in corridors or waiting areas
- **Staff Optimisation** — Deploy staff where patient volume is highest
- **Asset Tracking (Future)** — Track wheelchairs, equipment, and medical carts
- **Emergency Routing** — Real-time rerouting during emergencies or restricted areas

---

## 10. Phase 2 — BLE Limitations

| Limitation | Details |
|------------|---------|
| **Hardware Cost** | Each beacon costs ₹800–₹2,500; large hospitals need 100–500 units |
| **Installation Effort** | Beacons must be physically mounted and configured throughout the hospital |
| **Calibration Required** | Signal mapping (radio frequency calibration) needed per floor |
| **Native App Preferred** | Web browsers have limited Bluetooth access; a mobile app is recommended |
| **Signal Interference** | Metal structures, thick walls, and medical equipment can affect accuracy |
| **Ongoing Maintenance** | Battery replacement and signal recalibration needed periodically |
| **Higher Project Timeline** | Full deployment takes 2–4 months vs. weeks for QR |

---

## 11. Phase 2 — BLE Budget Estimate

### Small Hospital / Single Building

| Item | Estimated Cost (INR) |
|------|---------------------|
| BLE Beacons (30–50 units @ ₹1,500 avg.) | ₹45,000 – ₹75,000 |
| Hardware Installation & Mounting | ₹15,000 – ₹30,000 |
| Signal Calibration & Radio Mapping | ₹20,000 – ₹40,000 |
| Mobile App Development (iOS + Android) | ₹1,50,000 – ₹3,00,000 |
| Backend + Analytics Integration | ₹80,000 – ₹1,50,000 |
| **Total Estimate** | **₹3,10,000 – ₹5,95,000** |

### Medium Hospital / Multi-Wing

| Item | Estimated Cost (INR) |
|------|---------------------|
| BLE Beacons (100–250 units) | ₹1,50,000 – ₹3,75,000 |
| Full Installation + Calibration | ₹80,000 – ₹1,50,000 |
| App + Backend + Analytics | ₹3,00,000 – ₹5,00,000 |
| **Total Estimate** | **₹5,30,000 – ₹10,25,000** |

### Enterprise / Large Hospital

| Item | Estimated Cost (INR) |
|------|---------------------|
| 250–500 Beacons (or UWB/RTLS system) | ₹5,00,000 – ₹12,00,000 |
| Large-Scale Installation | ₹2,00,000 – ₹5,00,000 |
| Advanced Analytics + Integration | ₹5,00,000 – ₹15,00,000 |
| **Total Estimate** | **₹12,00,000 – ₹32,00,000+** |

---

## 12. QR vs BLE — Comparison

| Criteria | Phase 1 — QR Navigation | Phase 2 — BLE Navigation |
|----------|------------------------|--------------------------|
| **Cost** | ✅ Very Low (< ₹1.5L POC) | 🔵 Medium–High (₹3L–₹32L+) |
| **Deployment Speed** | ✅ 2–4 weeks | ⚠️ 2–4 months |
| **Hardware Required** | ✅ None (only printed QR) | ⚠️ Beacons required |
| **Tracking Type** | Checkpoint-based (manual scan) | Continuous auto-tracking |
| **User Action Needed** | Scan at each checkpoint | None — fully automatic |
| **Patient Experience** | Good | Excellent |
| **Analytics** | Basic | Advanced (heatmaps, flow) |
| **Works in Web Browser** | ✅ Yes | ⚠️ Limited (app preferred) |
| **Multi-Floor Support** | ✅ Yes (manual) | ✅ Yes (automatic) |
| **Maintenance** | ✅ Very Low | ⚠️ Moderate (batteries, calibration) |
| **Scalability** | Medium | High |
| **Ideal For** | POC, early adoption, budget-conscious | Full deployment, premium experience |

---

## 13. Recommended Rollout Plan

### Four-Stage Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1          STAGE 2          STAGE 3          STAGE 4     │
│  Weeks 1–4        Month 2–3        Month 4–6        Month 7+    │
│                                                                 │
│  QR POC           Real QR          BLE Pilot        Full        │
│  (Internal)       Deployment       (One Wing)       Hospital    │
└─────────────────────────────────────────────────────────────────┘
```

### Stage Details

**Stage 1 — QR POC (Weeks 1–4)**
- Deploy QR navigation system in OPD block or one wing
- Internal demo for management and key staff
- Collect feedback from early users
- Validate core navigation logic

**Stage 2 — Real QR Deployment (Month 2–3)**
- Expand QR system to full hospital (all floors, all departments)
- Print and install laminated QR codes across all checkpoints
- Launch to patients and measure adoption
- Gather navigation accuracy and satisfaction data

**Stage 3 — BLE Pilot (Month 4–6)**
- Install BLE beacons in one selected wing
- Run QR and BLE systems in parallel for comparison
- Measure user preference and accuracy improvements
- Calibrate beacon placement and signal mapping

**Stage 4 — Full Analytics & AR Navigation (Month 7+)**
- Full BLE rollout across entire hospital
- Activate advanced analytics dashboard
- Enable patient flow monitoring and heatmaps
- Explore AR overlay features for premium navigation experience

---

## 14. Final Recommendation

### Our Recommendation

> **Start with QR Smart Navigation POC immediately. Add BLE only after management approval and demonstrated adoption success.**

### Why This Approach Makes Sense

The QR-based Phase 1 system is not just a shortcut — it is the strategically correct first step. Here is why:

**1. Prove the concept first, invest later.**  
Before spending ₹5–30 lakhs on hardware and infrastructure, validate that patients will actually use the navigation system. QR does this for under ₹1.5 lakhs.

**2. Fast time to value.**  
QR can be live in weeks. BLE takes months. Getting something real in front of management and patients quickly builds confidence and momentum.

**3. The foundation carries forward.**  
The backend route engine, floor maps, and navigation logic built in Phase 1 are reused in Phase 2. Nothing is wasted.

**4. Low risk.**  
If adoption is lower than expected, the hospital has spent very little. If adoption is strong, the case for BLE investment becomes self-evident.

**5. Management alignment.**  
A working demo is worth more than any proposal document. Phase 1 gives management something tangible to see, test, and approve before committing to Phase 2 budgets.

---

### Decision Summary

| Decision Point | Recommendation |
|---------------|---------------|
| Start Phase 1 now? | ✅ Yes — immediately |
| Full QR hospital rollout? | ✅ Yes — after POC validation |
| Start Phase 2 (BLE)? | 🔵 After Phase 1 adoption is confirmed |
| Budget for Phase 1 | ₹63,000 – ₹1,30,000 |
| Budget for Phase 2 | ₹3,10,000 – ₹10,25,000 (scope-dependent) |

---

## 15. Visual Architecture Diagrams

### Phase 1 — QR Navigation Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    PHASE 1 — QR NAVIGATION                       │
└──────────────────────────────────────────────────────────────────┘

  [ Patient Scans QR ]
          │
          ▼
  [ Checkpoint Detected ]  ←──  JSON Floor Map Data
          │
          ▼
  [ Route Engine Calculates Path ]
          │
          ▼
  [ Konva Floor Map Renders Route ]
          │
          ▼
  [ Live AR-Style Guide Displayed ]
          │
          ▼
  [ Patient Follows Animated Arrows ]
          │
          ▼
  [ Next QR Scan → Position Confirmed ]
          │
          ▼
  [ Patient Arrives at Destination ] ✅
```

---

### Phase 2 — BLE Navigation Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    PHASE 2 — BLE NAVIGATION                      │
└──────────────────────────────────────────────────────────────────┘

  [ BLE Beacons Installed in Hospital ]
          │
          ▼
  [ Patient's Phone Detects Beacon Signals ]  (Automatic)
          │
          ▼
  [ Location Engine Triangulates Position ]
          │
          ├──────────────────────────────────┐
          ▼                                  ▼
  [ Route Engine Updates in Real Time ]   [ Analytics Engine ]
          │                                  │
          ▼                                  ▼
  [ Live AR Navigation on Screen ]    [ Patient Flow Data ]
          │                                  │
          ▼                                  ▼
  [ Patient Arrives at Destination ]  [ Heatmaps & Reports ] ✅
```

---

### Combined System View

```
┌──────────────────────────────────────────────────────────────────┐
│                     FULL SYSTEM OVERVIEW                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   INPUT LAYER          PROCESSING LAYER        OUTPUT LAYER      │
│   ─────────────        ────────────────        ────────────      │
│                                                                  │
│   QR Scan ─────┐                               Turn-by-Turn      │
│                ├──► Location Detection ──────► Navigation        │
│   BLE Signal ──┘         │                         │             │
│                          ▼                         ▼             │
│                     Route Engine ──────────► Floor Map View      │
│                          │                         │             │
│                          ▼                         ▼             │
│                   Analytics Engine ────────► Management          │
│                                                Dashboard         │
└──────────────────────────────────────────────────────────────────┘
```

---

*Document prepared for Hospital Leadership & IT Management*  
*For technical queries or demo requests, contact the development team.*  
*Version 1.0 — May 2026*
