const STORAGE_KEY = "apollo_aria_navigation_events";

export const trackNavigationEvent = (eventName, payload = {}) => {
  const event = {
    eventName,
    payload,
    timestamp: new Date().toISOString()
  };

  try {
    const existing = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing.slice(-99), event]));
  } catch (error) {
    // Analytics is local-only for the POC; failures should never affect navigation.
  }

  return event;
};

export const getNavigationEvents = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
  } catch (error) {
    return [];
  }
};
