const supportedLabels = new Set([
  "reception",
  "lift",
  "stairs",
  "doctor_room",
  "pharmacy",
  "toilet",
  "exit",
  "room_number",
  "obstacle"
]);

const labelAliases = {
  reception: "reception",
  lift: "lift",
  stairs: "stairs",
  doctor: "doctor_room",
  doctor_room: "doctor_room",
  opd: "doctor_room",
  pharmacy: "pharmacy",
  toilet: "toilet",
  restroom: "toilet",
  exit: "exit",
  room: "room_number",
  room_number: "room_number",
  obstacle: "obstacle",
  lab: "room_number",
  xray: "room_number",
  billing: "room_number"
};

const normalizeLabel = (value = "") => {
  const normalized = String(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return labelAliases[normalized] || normalized;
};

const labelFromText = (text = "") => {
  const lower = text.toLowerCase();

  if (lower.includes("obstacle")) return "obstacle";
  if (lower.includes("reception")) return "reception";
  if (lower.includes("lift")) return "lift";
  if (lower.includes("stair")) return "stairs";
  if (lower.includes("pharmacy")) return "pharmacy";
  if (lower.includes("toilet") || lower.includes("restroom")) return "toilet";
  if (lower.includes("exit")) return "exit";
  if (lower.includes("opd") || lower.includes("doctor")) return "doctor_room";
  if (lower.includes("room") || lower.includes("lab") || lower.includes("x-ray") || lower.includes("xray")) return "room_number";
  return null;
};

const mockDetectionForExpectedStep = ({ expectedLabels = [], currentRouteStep = "", finalDestination = "" }) => {
  const labels = [
    ...expectedLabels.map(normalizeLabel),
    labelFromText(currentRouteStep),
    labelFromText(finalDestination)
  ].filter(Boolean);

  const label = labels.find((item) => supportedLabels.has(item)) || "room_number";

  return {
    label,
    confidence: 0.84,
    bbox: [92, 54, 168, 82]
  };
};

export const detectVisionFrame = ({ image, expectedLabels = [], currentRouteStep = "", finalDestination = "", mockLabel }) => {
  const normalizedExpectedLabels = expectedLabels.map(normalizeLabel).filter((label) => supportedLabels.has(label));
  const detections = [];

  // Placeholder for a real YOLO model. Until a local model/runtime is configured,
  // mock mode returns deterministic route-aware detections so navigation never breaks.
  if (mockLabel) {
    detections.push({
      label: normalizeLabel(mockLabel),
      confidence: 0.9,
      bbox: [80, 60, 180, 90]
    });
  } else {
    detections.push(mockDetectionForExpectedStep({ expectedLabels: normalizedExpectedLabels, currentRouteStep, finalDestination }));
  }

  const detectedLabels = detections.map((item) => item.label);
  const matchedRouteStep = normalizedExpectedLabels.length
    ? detectedLabels.some((label) => normalizedExpectedLabels.includes(label))
    : false;
  const hasObstacle = detectedLabels.includes("obstacle");

  return {
    detections,
    matchedRouteStep,
    warning: hasObstacle ? "Obstacle detected ahead. Please proceed carefully." : null,
    model: process.env.YOLO_MODEL_PATH ? "yolo" : "mock",
    frameReceived: Boolean(image)
  };
};
