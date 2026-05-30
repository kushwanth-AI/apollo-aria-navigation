import express from "express";
import cors from "cors";
import mapsRouter from "./routes/maps.js";
import roomsRouter from "./routes/rooms.js";
import doctorsRouter from "./routes/doctors.js";
import navigationRouter from "./routes/navigation.js";
import visionRouter from "./routes/vision.js";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: "8mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "hospital-indoor-navigation-backend" });
});

app.use("/api/maps", mapsRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/doctors", doctorsRouter);
app.use("/api/navigation", navigationRouter);
app.use("/api/vision", visionRouter);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Hospital navigation backend running on http://localhost:${PORT}`);
});
