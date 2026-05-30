# Hospital Indoor Navigation POC - Deployment Guide

## Services

- Frontend: React/Vite served by Nginx on container port `80`
- Backend: Express API on container port `5001`
- Public app URL after compose deployment: `http://<server-ip>:8080`
- Backend health URL: `http://<server-ip>:5001/api/health`
- Mobile live camera/motion demo URL: use an HTTPS domain in front of the frontend container.

## Build And Run With Docker Compose

From the project root:

```bash
docker compose build
docker compose up -d
docker compose ps
```

Open:

```txt
http://<server-ip>:8080/?hospital_id=709&specialty=Dentist
```

## Create TAR Images For Deployment Handoff

Build images:

```bash
docker compose build
```

Save images as tar files:

```bash
docker save hospital-indoor-navigation-frontend:latest -o hospital-indoor-navigation-frontend.tar
docker save hospital-indoor-navigation-backend:latest -o hospital-indoor-navigation-backend.tar
```

Send these files to the deployment team:

```txt
hospital-indoor-navigation-frontend.tar
hospital-indoor-navigation-backend.tar
docker-compose.deploy.yml
```

## Deploy From TAR Images

On the deployment server:

```bash
docker load -i hospital-indoor-navigation-frontend.tar
docker load -i hospital-indoor-navigation-backend.tar
docker compose -f docker-compose.deploy.yml up -d
docker compose -f docker-compose.deploy.yml ps
```

## Verification

Check backend:

```bash
curl http://localhost:5001/api/health
```

Expected response:

```json
{"status":"ok","service":"hospital-indoor-navigation-backend"}
```

Check frontend:

```txt
http://localhost:8080/?hospital_id=709&specialty=Dentist
```

Check frontend container health:

```bash
curl http://localhost:8080/health
```

Test flow:

1. Open the app.
2. Simulate or scan `QR_RECEPTION_GROUND`.
3. Select `General OPD 2`, `Sample Collection Lab`, or `Pharmacy`.
4. Confirm the Ground Floor map loads and the route overlay animates.
5. On mobile, open the HTTPS app URL, allow camera and motion sensor permissions, tap `Start Live Navigation`, then walk with the phone. The blue patient marker and remaining distance update from phone motion/camera movement.

## Mobile Live Movement Requirements

For a real phone after deployment, live movement works only when browser permissions are available:

- Serve the app through HTTPS. Mobile browsers usually block camera and device motion sensors on plain HTTP server IP URLs.
- Keep frontend and backend on the same HTTPS origin. The frontend calls `/api`, and Nginx proxies that to the backend container.
- Allow camera permission for QR scanning and the live camera guide.
- Allow motion/orientation permission when the browser prompts after `Start Live Navigation`.
- This POC estimates movement from phone step/motion events and camera movement. Production indoor positioning still needs QR checkpoints, BLE beacons, Wi-Fi RTT, or a native mobile app.

## Ports

```txt
8080 -> frontend Nginx
5001 -> backend API
```

## Notes For Future Apollo Maps

The current Ground Floor map asset is:

```txt
frontend/public/maps/ground-floor-map.svg
```

Future hospital-specific Apollo maps can replace this file or add a new image path. Update `GROUND_MAP_IMAGE` and checkpoint coordinates in:

```txt
frontend/src/components/NavigationMap.jsx
```

No backend API change is required for map image replacement.
