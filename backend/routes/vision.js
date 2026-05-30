import express from "express";
import { detectVisionFrame } from "../services/visionService.js";

const router = express.Router();

router.post("/detect", (req, res) => {
  const result = detectVisionFrame({
    image: req.body.image || req.body.frame,
    expectedLabels: req.body.expectedLabels || [],
    currentRouteStep: req.body.currentRouteStep || "",
    finalDestination: req.body.finalDestination || "",
    mockLabel: req.body.mockLabel
  });

  res.json({
    detections: result.detections,
    matchedRouteStep: result.matchedRouteStep,
    warning: result.warning
  });
});

export default router;
