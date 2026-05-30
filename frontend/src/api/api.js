import axios from "axios";

const browserApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return "http://localhost:5001/api";
  }

  return "/api";
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || browserApiBaseUrl()
});

export const getFloors = async () => {
  const response = await api.get("/maps/floors");
  return response.data;
};

export const getFloor = async (floorId) => {
  const response = await api.get(`/maps/floors/${floorId}`);
  return response.data;
};

export const getDoctors = async () => {
  const response = await api.get("/doctors");
  return response.data;
};

export const getDoctor = async (doctorId) => {
  const response = await api.get(`/doctors/${doctorId}`);
  return response.data;
};

export const getRoute = async ({ current_location_id, destination_room_id }) => {
  const response = await api.post("/navigation/route", {
    current_location_id,
    destination_room_id
  });
  return response.data;
};

export const detectVisionFrame = async ({ image, expectedLabels, currentRouteStep, finalDestination, mockLabel }) => {
  const response = await api.post("/vision/detect", {
    image,
    expectedLabels,
    currentRouteStep,
    finalDestination,
    mockLabel
  });
  return response.data;
};

export default api;
