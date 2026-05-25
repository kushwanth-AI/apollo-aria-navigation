import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "..", "data");

const readJson = (fileName) => {
  const filePath = path.join(dataDir, fileName);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

const data = {
  floors: readJson("floors.json"),
  rooms: readJson("rooms.json"),
  qrLocations: readJson("qr_locations.json"),
  doctors: readJson("doctors.json")
};

export const getFloors = () => data.floors;
export const getFloorById = (floorId) => data.floors.find((floor) => String(floor.floor_id) === String(floorId));
export const getRooms = () => data.rooms;
export const getRoomById = (roomId) => data.rooms.find((room) => room.room_id === roomId);
export const getRoomsByFloor = (floor) => data.rooms.filter((room) => String(room.floor) === String(floor));
export const getQrLocationById = (locationId) => data.qrLocations.find((location) => location.location_id === locationId);
export const getQrLocationsByFloor = (floor) => data.qrLocations.filter((location) => String(location.floor) === String(floor));
export const getDoctors = () => data.doctors;
export const getDoctorById = (doctorId) => data.doctors.find((doctor) => doctor.doctor_id === doctorId);
