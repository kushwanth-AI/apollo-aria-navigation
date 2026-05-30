# Message To Aziz

Hi Aziz,

We have containerised the Hospital Indoor Navigation POC.

Included files:

```txt
docker-compose.yml
docker-compose.deploy.yml
DEPLOYMENT.md
frontend/Dockerfile
frontend/nginx.conf
backend/Dockerfile
```

Deployment ports:

```txt
Frontend: 8080
Backend API: 5001
Health check: http://<server-ip>:5001/api/health
Application: http://<server-ip>:8080/?hospital_id=709&specialty=Dentist
```

Mobile live movement:

```txt
For phone testing, publish the frontend behind an HTTPS domain.
The app uses /api through the frontend Nginx proxy, so frontend and backend can stay on the same HTTPS origin.
After opening the HTTPS URL on mobile, allow camera and motion permissions, then tap Start Live Navigation.
The live marker/remaining distance will move from phone motion and camera movement during the POC demo.
Plain HTTP server-IP access may load the app, but mobile browsers can block camera and motion sensors there.
```

Build and run:

```bash
docker compose build
docker compose up -d
docker compose ps
```

Create image tar files:

```bash
docker save hospital-indoor-navigation-frontend:latest -o hospital-indoor-navigation-frontend.tar
docker save hospital-indoor-navigation-backend:latest -o hospital-indoor-navigation-backend.tar
```

Deploy from tar files:

```bash
docker load -i hospital-indoor-navigation-frontend.tar
docker load -i hospital-indoor-navigation-backend.tar
docker compose -f docker-compose.deploy.yml up -d
```

Note: On my machine Docker CLI is installed, but Docker Desktop engine was not running, so the `.tar` image files could not be generated locally yet. Once Docker Desktop or Docker Engine is running, the above `docker compose build` and `docker save` commands will create the required tar files.
