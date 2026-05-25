import express from "express";
import { getRoomById } from "../services/dataService.js";

const router = express.Router();

router.get("/:roomId", (req, res) => {
  const room = getRoomById(req.params.roomId);
  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }
  res.json(room);
});

export default router;
