import {
  getFloorById,
  getQrLocationById,
  getQrLocationsByFloor,
  getRoomById
} from "./dataService.js";

const getLiftLobby = (floor) => {
  const lift = getQrLocationsByFloor(floor).find((location) => location.type === "lift");
  if (!lift) {
    throw Object.assign(new Error(`Lift lobby not found on floor ${floor}`), { status: 404 });
  }
  return lift;
};

const corridorPointForRoom = (room) => ({
  floor: room.floor,
  x: room.door.x,
  y: 300
});

const toRoutePoint = (point) => ({
  floor: point.floor,
  x: point.x,
  y: point.y
});

const LIVE_FLOOR_ID = "ground-live";

const liveNodes = {
  reception: { floor: LIVE_FLOOR_ID, x: 330, y: 270 },
  corridor_mid: { floor: LIVE_FLOOR_ID, x: 450, y: 270 },
  lift: { floor: LIVE_FLOOR_ID, x: 450, y: 230 },
  stairs: { floor: LIVE_FLOOR_ID, x: 450, y: 310 },
  north_entrance: { floor: LIVE_FLOOR_ID, x: 450, y: 70 },
  south_entrance: { floor: LIVE_FLOOR_ID, x: 450, y: 540 },
  pharmacy: { floor: LIVE_FLOOR_ID, x: 330, y: 410 },
  exit: { floor: LIVE_FLOOR_ID, x: 315, y: 520 },
  discussion_room_1: { floor: LIVE_FLOOR_ID, x: 600, y: 130 },
  discussion_room_2: { floor: LIVE_FLOOR_ID, x: 600, y: 235 },
  discussion_room_3: { floor: LIVE_FLOOR_ID, x: 600, y: 350 },
  discussion_room_4: { floor: LIVE_FLOOR_ID, x: 600, y: 445 },
  discussion_room_5: { floor: LIVE_FLOOR_ID, x: 600, y: 535 },
  cafe_area: { floor: LIVE_FLOOR_ID, x: 600, y: 490 }
};

const liveRouteSequences = {
  reception: ["reception"],
  pharmacy: ["reception", "pharmacy"],
  lift: ["reception", "corridor_mid", "lift"],
  stairs: ["reception", "corridor_mid", "stairs"],
  north_entrance: ["reception", "corridor_mid", "north_entrance"],
  south_entrance: ["reception", "corridor_mid", "south_entrance"],
  exit: ["reception", "pharmacy", "exit"],
  discussion_room_1: ["reception", "corridor_mid", "discussion_room_1"],
  discussion_room_2: ["reception", "corridor_mid", "discussion_room_2"],
  discussion_room_3: ["reception", "corridor_mid", "discussion_room_3"],
  discussion_room_4: ["reception", "corridor_mid", "discussion_room_4"],
  discussion_room_5: ["reception", "corridor_mid", "discussion_room_5"],
  cafe_area: ["reception", "corridor_mid", "discussion_room_4", "cafe_area"]
};

const titleForNode = (nodeId) =>
  nodeId
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const routeDistanceMeters = (route) =>
  Math.round(route.slice(1).reduce((total, point, index) => {
    const previous = route[index];
    const pixels = Math.hypot(point.x - previous.x, point.y - previous.y);
    return total + pixels * 0.18;
  }, 0));

const buildLiveReceptionSteps = (destination) => {
  if (destination.room_id === "discussion_room_1") {
    return [
      "Start from Reception",
      "Move to main corridor",
      "Turn right",
      "Proceed to Discussion Room 1",
      "You have arrived"
    ];
  }

  if (destination.room_id === "discussion_room_2") {
    return [
      "Start from Reception",
      "Move to main corridor",
      "Turn right",
      "Continue straight",
      "Proceed to Discussion Room 2",
      "You have arrived"
    ];
  }

  if (destination.room_id === "discussion_room_3") {
    return [
      "Start from Reception",
      "Move to main corridor",
      "Turn right",
      "Continue straight",
      "Proceed to Discussion Room 3",
      "You have arrived"
    ];
  }

  if (destination.room_id === "discussion_room_4") {
    return [
      "Start from Reception",
      "Move to main corridor",
      "Move down corridor",
      "Turn right",
      "Proceed to Discussion Room 4",
      "You have arrived"
    ];
  }

  if (destination.room_id === "discussion_room_5") {
    return [
      "Start from Reception",
      "Move to main corridor",
      "Move down corridor",
      "Turn right",
      "Pass Cafe Area",
      "Proceed to Discussion Room 5",
      "You have arrived"
    ];
  }

  if (destination.room_id === "pharmacy") {
    return ["Start from Reception", "Move down to Pharmacy", "You have arrived"];
  }

  if (destination.room_id === "lift") {
    return ["Start from Reception", "Move to main corridor", "Proceed to Lift", "You have arrived"];
  }

  if (destination.room_id === "stairs") {
    return ["Start from Reception", "Move to main corridor", "Proceed to Stairs", "You have arrived"];
  }

  return ["Start from Reception", `Proceed to ${destination.name}`, "You have arrived"];
};

const buildLiveRoute = ({ currentLocation, destination, currentFloorMeta }) => {
  const currentNode = currentLocation.node_id || "reception";
  const destinationNode = destination.room_id;
  const nodeSequence =
    currentNode === "reception"
      ? liveRouteSequences[destinationNode]
      : [currentNode, "corridor_mid", destinationNode];

  if (!nodeSequence || !nodeSequence.every((nodeId) => liveNodes[nodeId])) {
    throw Object.assign(new Error("Live ground floor route is not available for this destination"), { status: 404 });
  }

  const route = nodeSequence.map((nodeId) => ({
    ...liveNodes[nodeId],
    node_id: nodeId,
    label: titleForNode(nodeId)
  }));
  const distance_meters = routeDistanceMeters(route);

  return {
    current_location: currentLocation,
    destination,
    current_floor: currentFloorMeta,
    destination_floor: currentFloorMeta,
    steps: currentNode === "reception" ? buildLiveReceptionSteps(destination) : [
      `Start from ${currentLocation.name}`,
      "Move to main corridor",
      `Proceed to ${destination.name}`,
      "You have arrived"
    ],
    route,
    distance_meters,
    walking_time_minutes: Math.max(1, Math.ceil(distance_meters / 70)),
    route_graph_nodes: Object.keys(liveNodes)
  };
};

export const buildRoute = ({ current_location_id, destination_room_id }) => {
  const currentLocation = getQrLocationById(current_location_id);
  const destination = getRoomById(destination_room_id);

  if (!currentLocation) {
    throw Object.assign(new Error("Current QR location not found"), { status: 404 });
  }

  if (!destination) {
    throw Object.assign(new Error("Destination room not found"), { status: 404 });
  }

  const currentFloor = currentLocation.floor;
  const destinationFloor = destination.floor;
  const currentFloorMeta = getFloorById(currentFloor);
  const destinationFloorMeta = getFloorById(destinationFloor);

  if (String(currentFloor) === LIVE_FLOOR_ID || String(destinationFloor) === LIVE_FLOOR_ID) {
    return buildLiveRoute({ currentLocation, destination, currentFloorMeta });
  }

  const currentFloorNumber = Number(currentFloor);
  const destinationFloorNumber = Number(destinationFloor);
  const destinationCorridor = corridorPointForRoom(destination);

  let steps = [];
  let route = [];

  if (currentFloorNumber === destinationFloorNumber) {
    steps = [
      `Start at ${currentLocation.name}`,
      "Enter the main corridor",
      `Proceed to Room ${destination.room_number}`
    ];
    route = [
      toRoutePoint(currentLocation),
      { floor: currentFloorNumber, x: currentLocation.x, y: 300 },
      destinationCorridor,
      { floor: destination.floor, x: destination.door.x, y: destination.door.y }
    ];
  } else {
    const currentLift = getLiftLobby(currentFloorNumber);
    const destinationLift = getLiftLobby(destinationFloorNumber);

    steps = [
      `Start at ${currentLocation.name}`,
      "Go to Lift Lobby",
      `Take lift to Floor ${destinationFloorNumber}`,
      "Exit lift and turn right",
      `Proceed to Room ${destination.room_number}`
    ];

    route = [
      toRoutePoint(currentLocation),
      toRoutePoint(currentLift),
      toRoutePoint(destinationLift),
      destinationCorridor,
      { floor: destination.floor, x: destination.door.x, y: destination.door.y }
    ];
  }

  return {
    current_location: currentLocation,
    destination,
    current_floor: currentFloorMeta,
    destination_floor: destinationFloorMeta,
    steps,
    route
  };
};
