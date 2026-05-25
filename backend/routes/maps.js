import express from "express";
import { getFloorById, getFloors, getQrLocationsByFloor, getRoomsByFloor } from "../services/dataService.js";

const router = express.Router();

router.get("/floors", (req, res) => {
  res.json(getFloors());
});

router.get("/floors/:floorId", (req, res) => {
  const floor = getFloorById(req.params.floorId);
  if (!floor) {
    return res.status(404).json({ message: "Floor not found" });
  }

  res.json({
    ...floor,
    rooms: getRoomsByFloor(floor.floor_id),
    qr_locations: getQrLocationsByFloor(floor.floor_id)
  });
});

export default router;
