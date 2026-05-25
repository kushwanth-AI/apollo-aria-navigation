import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScanner } from "html5-qrcode";
import QRCode from "qrcode";

const RECEPTION_QR = {
  floor: "ground-live",
  location_id: "QR_RECEPTION_GROUND",
  currentLocation: "reception",
  currentFloor: "ground-live"
};

const SUPPORTED_QR_VALUES = [
  "QR_RECEPTION_GROUND",
  "QR_NORTH_ENTRANCE",
  "QR_SOUTH_ENTRANCE",
  "QR_LIFT_GROUND",
  "QR_STAIRS_GROUND"
];

function QRScanPage({ onScan, onNavigate }) {
  const scannerRef = useRef(null);
  const fileScannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [scanError, setScanError] = useState("");
  const [scanStatus, setScanStatus] = useState("Ready to scan Reception QR");
  const [qrImage, setQrImage] = useState("");

  const normalizeQrPayload = (decodedText) => {
    const raw = decodedText.trim();
    const payload = raw.startsWith("{") ? JSON.parse(raw) : { floor: "ground-live", location_id: raw };

    if (!payload.location_id || !SUPPORTED_QR_VALUES.includes(payload.location_id)) {
      throw new Error("Unsupported live QR");
    }

    return {
      ...payload,
      floor: payload.floor || "ground-live",
      currentFloor: payload.currentFloor || payload.floor || "ground-live"
    };
  };

  const handleDecodedText = async (decodedText) => {
    try {
      const payload = normalizeQrPayload(decodedText);
      setScanError("");
      setScanStatus(`QR detected: ${payload.location_id}`);
      await scannerRef.current?.clear();
      onScan(payload);
    } catch (err) {
      setScanError("Invalid QR. Use QR_RECEPTION_GROUND or another supported ground-floor live QR.");
      setScanStatus("Scanner active. Try another QR code.");
    }
  };

  const handleQrUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      if (!fileScannerRef.current) {
        fileScannerRef.current = new Html5Qrcode("qr-upload-reader", false);
      }

      const decodedText = await fileScannerRef.current.scanFile(file, true);
      setScanStatus("QR image decoded");
      await handleDecodedText(decodedText);
    } catch (err) {
      setScanError("Unable to read QR from uploaded image. Try a clearer QR image.");
      setScanStatus("Upload failed. Choose another QR image.");
    } finally {
      event.target.value = "";
    }
  };

  const stopScanner = async () => {
    await scannerRef.current?.clear().catch(() => {});
    scannerRef.current = null;
    setCameraEnabled(false);
    setScanStatus("Scanner stopped");
  };

  const simulateReception = () => {
    setScanError("");
    setScanStatus("Simulated Reception QR");
    onScan(RECEPTION_QR);
  };

  useEffect(() => {
    QRCode.toDataURL(JSON.stringify(RECEPTION_QR), {
      width: 320,
      margin: 2,
      color: {
        dark: "#020617",
        light: "#ffffff"
      }
    }).then(setQrImage);
  }, []);

  useEffect(() => {
    if (!cameraEnabled) {
      return undefined;
    }

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        rememberLastUsedCamera: true,
        videoConstraints: {
          facingMode: { ideal: "environment" }
        }
      },
      false
    );

    scanner.render(
      handleDecodedText,
      () => {
        setScanStatus("Point back camera at hospital QR code");
      }
    );

    scannerRef.current = scanner;
    setScanError("");
    setScanStatus("Scanner active. Allow camera permission if prompted.");

    return () => {
      scannerRef.current?.clear().catch(() => {});
      fileScannerRef.current?.clear?.().catch(() => {});
    };
  }, [cameraEnabled]);

  return (
    <section className="scan-page">
      <div className="scan-card">
        <div>
          <p className="eyebrow">Ground Floor Live Test</p>
          <h2>Scan the Reception QR code</h2>
          <p className="muted">
            The app uses the mobile back camera when available. If permission fails, use the manual buttons below.
          </p>
        </div>

        <div className="scanner-box">
          {cameraEnabled ? (
            <div id="qr-reader" />
          ) : (
            <div className="scanner-placeholder">
              <div className="scanner-frame" />
              <strong>Back Camera QR Scanner</strong>
              <span>Start scanner, allow camera access, then scan QR_RECEPTION_GROUND.</span>
            </div>
          )}
        </div>

        <div className="scan-status">{scanStatus}</div>
        {scanError && <div className="inline-error">{scanError}</div>}

        <div className="scan-actions">
          {!cameraEnabled ? (
            <button className="primary-btn" type="button" onClick={() => setCameraEnabled(true)}>
              Start QR Scanner
            </button>
          ) : (
            <button className="secondary-btn" type="button" onClick={stopScanner}>
              Stop Scanner
            </button>
          )}
          <button className="primary-btn" type="button" onClick={simulateReception}>
            Simulate Reception QR
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="qr-upload-input"
            onChange={handleQrUpload}
          />
          <button className="secondary-btn" type="button" onClick={() => fileInputRef.current?.click()}>
            Upload QR Image
          </button>
        </div>
        <div id="qr-upload-reader" className="qr-upload-reader" />

        <div className="manual-test-grid">
          {[1, 2, 3, 4, 5].map((roomNumber) => (
            <button
              key={roomNumber}
              type="button"
              onClick={() => onNavigate(`discussion_room_${roomNumber}`)}
            >
              Navigate to Discussion Room {roomNumber}
            </button>
          ))}
        </div>
      </div>

      <aside className="demo-payload">
        <p className="eyebrow">Reception QR Code</p>
        <div className="qr-display-card">
          {qrImage && <img src={qrImage} alt="Reception QR code for Ground Floor Live Map" />}
          <strong>QR_RECEPTION_GROUND</strong>
          <span>Current location becomes Reception on Ground Floor - Live Test Map.</span>
          {qrImage && (
            <a href={qrImage} download="ground-floor-reception-qr.png">
              Download QR Code
            </a>
          )}
        </div>
        <p className="eyebrow qr-payload-title">Supported QR Values</p>
        <div className="qr-help">
          {SUPPORTED_QR_VALUES.map((value) => (
            <span key={value}>{value}</span>
          ))}
        </div>
        <pre>{JSON.stringify(RECEPTION_QR, null, 2)}</pre>
      </aside>
    </section>
  );
}

export default QRScanPage;
