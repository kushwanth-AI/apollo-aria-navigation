import express from "express";
import { getDoctorById, getDoctors } from "../services/dataService.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.json(getDoctors());
});

router.get("/:doctorId", (req, res) => {
  const doctor = getDoctorById(req.params.doctorId);
  if (!doctor) {
    return res.status(404).json({ message: "Doctor not found" });
  }
  res.json(doctor);
});

export default router;
