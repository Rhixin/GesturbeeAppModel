"use client";

import React, { useRef, useEffect, useState } from "react";

// Define types for MediaPipe objects
declare global {
  interface Window {
    Hands?: any;
    Camera?: any;
  }
}

const HandTracker = ({
  handData,
  setHandData,
}: {
  handData: number[] | null;
  setHandData: Function;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  // Load MediaPipe scripts
  useEffect(() => {
    // Check if scripts are already loaded
    if (window.Hands && window.Camera) {
      setScriptsLoaded(true);
      return;
    }

    // Create script elements for MediaPipe
    const loadScript = (url: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    // Load the required scripts
    Promise.all([
      loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"),
      loadScript(
        "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
      ),
    ])
      .then(() => {
        setScriptsLoaded(true);
      })
      .catch((error) => {
        console.error("Error loading MediaPipe scripts:", error);
        setIsLoading(false);
      });
  }, []);

  // Convert landmarks to flattened array of 21x3=63 values
  const flattenLandmarks = (landmarks: any[]): number[] => {
    // Create a flattened array of all coordinates
    const flattened: number[] = [];

    // Each landmark has x, y, z coordinates
    for (const point of landmarks) {
      flattened.push(point.x); // x coordinate
      flattened.push(point.y); // y coordinate
      flattened.push(point.z || 0); // z coordinate (use 0 if undefined)
    }

    return flattened;
  };

  // Initialize hand tracking after scripts are loaded
  useEffect(() => {
    if (!scriptsLoaded || !videoRef.current || !canvasRef.current) return;

    const canvasCtx = canvasRef.current.getContext("2d");
    if (!canvasCtx) {
      console.error("Failed to get 2D context.");
      setIsLoading(false);
      return;
    }

    // Hand connections for drawing lines between landmarks
    const HAND_CONNECTIONS = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4], // thumb
      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8], // index finger
      [5, 9],
      [9, 10],
      [10, 11],
      [11, 12], // middle finger
      [9, 13],
      [13, 14],
      [14, 15],
      [15, 16], // ring finger
      [13, 17],
      [17, 18],
      [18, 19],
      [19, 20], // pinky
      [0, 17],
      [0, 5],
      [0, 9],
      [0, 13], // palm connections
    ];

    try {
      // Access MediaPipe through window object after scripts are loaded
      const hands = new window.Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      // Set options for the hands tracking
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      // Handle results from hand tracking
      hands.onResults((results: any) => {
        const canvasWidth = canvasRef.current!.width;
        const canvasHeight = canvasRef.current!.height;

        canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight); // Clear previous drawings
        if (results.image) {
          canvasCtx.drawImage(results.image, 0, 0, canvasWidth, canvasHeight); // Draw the image
        }

        if (
          results.multiHandLandmarks &&
          results.multiHandLandmarks.length > 0
        ) {
          // Process the first detected hand
          const landmarks = results.multiHandLandmarks[0];

          // Flatten the landmarks to a 63-length array (21 points × 3 coordinates)
          const flattenedLandmarks = flattenLandmarks(landmarks);

          // Update state with the flattened landmarks
          setHandData(flattenedLandmarks);

          // Draw connections
          canvasCtx.lineWidth = 2;
          canvasCtx.strokeStyle = "#666666"; // Gray lines

          for (const connection of HAND_CONNECTIONS) {
            const [index1, index2] = connection;
            canvasCtx.beginPath();
            canvasCtx.moveTo(
              landmarks[index1].x * canvasWidth,
              landmarks[index1].y * canvasHeight
            );
            canvasCtx.lineTo(
              landmarks[index2].x * canvasWidth,
              landmarks[index2].y * canvasHeight
            );
            canvasCtx.stroke();
          }

          // Draw landmarks (circles)
          for (let i = 0; i < landmarks.length; i++) {
            const point = landmarks[i];

            canvasCtx.beginPath();
            canvasCtx.arc(
              point.x * canvasWidth,
              point.y * canvasHeight,
              4, // Circle size
              0,
              2 * Math.PI
            );
            canvasCtx.fillStyle = "#FF5555"; // All points same color
            canvasCtx.fill();

            // Add landmark indices
            canvasCtx.fillStyle = "white";
            canvasCtx.font = "10px Arial";
            canvasCtx.fillText(
              i.toString(),
              point.x * canvasWidth + 8,
              point.y * canvasHeight + 8
            );
          }
        } else {
          // Reset hand data if no hand is detected
          setHandData(null);
        }
      });

      // Initialize camera
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });

      camera.start();
      setIsLoading(false);

      return () => {
        camera.stop();
        hands.close();
      };
    } catch (error) {
      console.error("Error initializing MediaPipe:", error);
      setIsLoading(false);
    }
  }, [scriptsLoaded]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="relative w-full h-full flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 rounded z-10">
            <div className="text-center text-white">
              <div className="mb-2">Loading hand tracking...</div>
              <div className="text-xs text-gray-300">
                {!scriptsLoaded
                  ? "Loading MediaPipe libraries..."
                  : "Initializing camera..."}
              </div>
            </div>
          </div>
        )}
        <video
          ref={videoRef}
          style={{ display: "none" }}
          width={640}
          height={480}
          autoPlay
          playsInline
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="rounded"
          style={{
            width: "100%",
            height: "100%",
            maxWidth: "640px",
            maxHeight: "480px",
            objectFit: "contain",
            display: "block"
          }}
        />
      </div>

      {/* Display model input data */}
      {/* <div className="mt-4 p-4 bg-gray-50 rounded w-96 overflow-x-auto">
        <h3 className="font-bold mb-2">
          Model Input Values (21 landmarks × 3 coordinates):
        </h3>
        {handData ? (
          <div>
            <div className="text-sm mb-2">
              Array length: {handData.length} values
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {Array.from({ length: 21 }).map((_, landmarkIndex) => (
                <div key={landmarkIndex} className="text-xs border p-1">
                  <div className="font-medium">Point {landmarkIndex}:</div>
                  <div>x: {handData[landmarkIndex * 3].toFixed(4)}</div>
                  <div>y: {handData[landmarkIndex * 3 + 1].toFixed(4)}</div>
                  <div>z: {handData[landmarkIndex * 3 + 2].toFixed(4)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-gray-500">No hand detected</div>
        )}

        <div className="mt-4 text-xs text-gray-600">
          <p>Input shape for model: 63 features (21 points × 3 coordinates)</p>
          <p>Format: [x0, y0, z0, x1, y1, z1, ..., x20, y20, z20]</p>
        </div>
      </div> */}
    </div>
  );
};

export default HandTracker;
