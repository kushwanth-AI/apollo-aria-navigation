import express from "express";
import { buildRoute } from "../services/routeService.js";

const router = express.Router();

router.post("/route", (req, res, next) => {
  try {
    const { current_location_id, destination_room_id } = req.body;

    if (!current_location_id || !destination_room_id) {
      return res.status(400).json({
        message: "current_location_id and destination_room_id are required"
      });
    }

    res.json(buildRoute({ current_location_id, destination_room_id }));
  } catch (error) {
    next(error);
  }
});

export default router;
