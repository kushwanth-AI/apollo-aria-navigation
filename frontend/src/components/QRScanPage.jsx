import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScanner } from "html5-qrcode";
import QRCode from "qrcode";

const RECEPTION_QR = {
  floor: "ground-live",
  location_id: "QR_AHLL_IT",
  currentLocation: "ahll_it_department",
  currentFloor: "ground-live"
};

const SUPPORTED_QR_VALUES = [
  "QR_RECEPTION_GROUND",
  "QR_RECEPTION_BLOCK",
  "QR_AHLL_IT",
  "QR_FOOD_COURT",
  "QR_CAFE_AREA"
];

function QRScanPage({ onScan, onNavigate }) {
  const scannerRef = useRef(null);
  const fileScannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [scanError, setScanError] = useState("");
  const [scanStatus, setScanStatus] = useState("Ready to scan AHLL IT QR");
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
      setScanError("Invalid QR. Use QR_RECEPTION_GROUND or another supported Apollo ground-floor QR.");
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
    setScanStatus("Simulated AHLL IT QR");
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
        <div className="scan-card-header">
          <div>
            <p className="eyebrow">Step 1</p>
            <h2>Scan your current location</h2>
            <p className="muted">
              Point the camera at the hospital QR code. After the scan, choose where you want to go.
            </p>
          </div>
          <span className="scan-step-pill">QR required</span>
        </div>

        <div className="scanner-panel">
          <div className="scanner-box">
            {cameraEnabled ? (
              <div id="qr-reader" />
            ) : (
              <div className="scanner-placeholder">
                <div className="scanner-frame" />
                <strong>Back Camera QR Scanner</strong>
                <span>Start scanner, allow camera access, then scan the AHLL IT QR.</span>
              </div>
            )}
          </div>

          <div className="scan-control-panel">
            <div>
              <p className="eyebrow">Scanner Status</p>
              <div className="scan-status">{scanStatus}</div>
              {scanError && <div className="inline-error scan-error-inline">{scanError}</div>}
            </div>

            <div className="scan-actions">
              {!cameraEnabled ? (
                <button className="primary-btn" type="button" onClick={() => setCameraEnabled(true)}>
                  Start Scanner
                </button>
              ) : (
                <button className="secondary-btn" type="button" onClick={stopScanner}>
                  Stop Scanner
                </button>
              )}
              <button className="secondary-btn" type="button" onClick={() => fileInputRef.current?.click()}>
                Upload QR Image
              </button>
              <button className="secondary-btn" type="button" onClick={simulateReception}>
                Simulate AHLL IT QR
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="qr-upload-input"
                onChange={handleQrUpload}
              />
            </div>
          </div>
        </div>
        <div id="qr-upload-reader" className="qr-upload-reader" />

        <details className="demo-shortcuts">
          <summary>Demo destination shortcuts</summary>
          <div className="manual-test-grid">
            {[
              ["ahll_it_department", "AHLL IT Department"],
              ["qa_team", "QA Team"],
              ["apollo_rd_team", "Apollo R&D Team"],
              ["discussion_room_1", "Discussion Room 1"],
              ["discussion_room_4", "Discussion Room 4"],
              ["cafe_area", "Cafe Area"],
              ["food_court", "Food Court"],
              ["exit", "Main Exit"]
            ].map(([roomId, label]) => (
              <button
                key={roomId}
                type="button"
                onClick={() => onNavigate(roomId)}
              >
                {label}
              </button>
            ))}
          </div>
        </details>
      </div>

      <aside className="demo-payload">
        <p className="eyebrow">Download Test QR</p>
        <div className="qr-display-card">
          {qrImage && <img src={qrImage} alt="AHLL IT QR code for Apollo ground floor navigation" />}
          <div>
            <strong>AHLL IT Department</strong>
            <span>Use this QR to start the ground-floor patient navigation demo.</span>
          </div>
          {qrImage && (
            <a href={qrImage} download="apollo-ground-floor-ahll-it-qr.png">
              Download QR Code
            </a>
          )}
        </div>
        <p className="eyebrow qr-payload-title">Supported QR checkpoints</p>
        <div className="qr-help">
          {SUPPORTED_QR_VALUES.map((value) => (
            <span key={value}>{value}</span>
          ))}
        </div>
      </aside>
    </section>
  );
}

export default QRScanPage;
