# Hospital Indoor Navigation POC

Complete working proof of concept for hospital indoor navigation from a scanned QR location to an assigned doctor room.

The demo flow is:

1. Patient scans the reception QR.
2. The app detects `Floor 1 Reception`.
3. The default destination is Dr. Neethi Menon, Dentist, Floor 3, Room R305.
4. The backend calculates a multi-floor route through the lift lobby.
5. The frontend displays the route on a `react-konva` hospital floor map with step-by-step directions.

## Tech Stack

- React + Vite frontend
- `react-konva` and `konva` for floor map rendering
- `html5-qrcode` for QR scanning
- Node.js + Express.js backend
- JSON files for sample data

## Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

Available APIs:

```text
GET  /api/maps/floors
GET  /api/maps/floors/:floorId
GET  /api/rooms/:roomId
GET  /api/doctors
GET  /api/doctors/:doctorId
POST /api/navigation/route
```

Sample route request:

```json
{
  "current_location_id": "F1_RECEPTION",
  "destination_room_id": "F3_R305"
}
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

Use **Demo Scan Reception QR** to simulate this QR payload:

```json
{
  "floor": 1,
  "location_id": "F1_RECEPTION"
}
```

## Sample Data

The backend loads all data from JSON files in `backend/data`:

- `floors.json`: 10 hospital floors with outlines and corridor paths
- `rooms.json`: 100 sample rooms total
- `qr_locations.json`: reception, lift lobby, stairs, and corridor QR points
- `doctors.json`: 20 sample doctors

No database, PostgreSQL, FastAPI, Python, or external map provider is required.
