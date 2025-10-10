"use client";

import React, { useRef, useEffect, useState } from "react";

// Define types for MediaPipe objects
declare global {
  interface Window {
    Hands?: any;
    Camera?: any;
  }
}

const TwoHandsTracker = ({
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

  // Convert landmarks to flattened array
  // 21 left hand + 21 right hand = 42 landmarks × 3 = 126 values
  const flattenLandmarks = (
    leftHandLandmarks: any[] | null,
    rightHandLandmarks: any[] | null
  ): number[] => {
    const flattened: number[] = [];

    // Left hand landmarks (or zeros if not detected)
    if (leftHandLandmarks && leftHandLandmarks.length === 21) {
      for (const point of leftHandLandmarks) {
        flattened.push(point.x, point.y, point.z || 0);
      }
    } else {
      // Pad with zeros (21 landmarks × 3 = 63 values)
      for (let i = 0; i < 63; i++) {
        flattened.push(0);
      }
    }

    // Right hand landmarks (or zeros if not detected)
    if (rightHandLandmarks && rightHandLandmarks.length === 21) {
      for (const point of rightHandLandmarks) {
        flattened.push(point.x, point.y, point.z || 0);
      }
    } else {
      // Pad with zeros (21 landmarks × 3 = 63 values)
      for (let i = 0; i < 63; i++) {
        flattened.push(0);
      }
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

      // Set options for the hands tracking - TRACK 2 HANDS
      hands.setOptions({
        maxNumHands: 2, // Track both hands
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      // Handle results from hand tracking
      hands.onResults((results: any) => {
        const canvasWidth = canvasRef.current!.width;
        const canvasHeight = canvasRef.current!.height;

        canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        if (results.image) {
          canvasCtx.drawImage(results.image, 0, 0, canvasWidth, canvasHeight);
        }

        // Identify left and right hands
        let leftHandLandmarks = null;
        let rightHandLandmarks = null;

        if (results.multiHandLandmarks && results.multiHandedness) {
          for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const landmarks = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i];

            // MediaPipe uses "Left" and "Right" from the person's perspective
            // which is mirrored in the camera view
            const label = handedness.label; // "Left" or "Right"

            if (label === "Left") {
              leftHandLandmarks = landmarks;
            } else if (label === "Right") {
              rightHandLandmarks = landmarks;
            }
          }
        }

        // Flatten the landmarks to a 126-length array
        const flattenedLandmarks = flattenLandmarks(
          leftHandLandmarks,
          rightHandLandmarks
        );

        // Update state with the flattened landmarks (126 values)
        setHandData(flattenedLandmarks);

        // Draw left hand (red)
        if (leftHandLandmarks) {
          canvasCtx.lineWidth = 2;
          canvasCtx.strokeStyle = "#FF0000"; // Red for left hand

          for (const connection of HAND_CONNECTIONS) {
            const [index1, index2] = connection;
            canvasCtx.beginPath();
            canvasCtx.moveTo(
              leftHandLandmarks[index1].x * canvasWidth,
              leftHandLandmarks[index1].y * canvasHeight
            );
            canvasCtx.lineTo(
              leftHandLandmarks[index2].x * canvasWidth,
              leftHandLandmarks[index2].y * canvasHeight
            );
            canvasCtx.stroke();
          }

          // Draw landmarks
          for (let i = 0; i < leftHandLandmarks.length; i++) {
            const point = leftHandLandmarks[i];

            canvasCtx.beginPath();
            canvasCtx.arc(
              point.x * canvasWidth,
              point.y * canvasHeight,
              4,
              0,
              2 * Math.PI
            );
            canvasCtx.fillStyle = "#FF5555";
            canvasCtx.fill();
          }
        }

        // Draw right hand (blue)
        if (rightHandLandmarks) {
          canvasCtx.lineWidth = 2;
          canvasCtx.strokeStyle = "#0000FF"; // Blue for right hand

          for (const connection of HAND_CONNECTIONS) {
            const [index1, index2] = connection;
            canvasCtx.beginPath();
            canvasCtx.moveTo(
              rightHandLandmarks[index1].x * canvasWidth,
              rightHandLandmarks[index1].y * canvasHeight
            );
            canvasCtx.lineTo(
              rightHandLandmarks[index2].x * canvasWidth,
              rightHandLandmarks[index2].y * canvasHeight
            );
            canvasCtx.stroke();
          }

          // Draw landmarks
          for (let i = 0; i < rightHandLandmarks.length; i++) {
            const point = rightHandLandmarks[i];

            canvasCtx.beginPath();
            canvasCtx.arc(
              point.x * canvasWidth,
              point.y * canvasHeight,
              4,
              0,
              2 * Math.PI
            );
            canvasCtx.fillStyle = "#5555FF";
            canvasCtx.fill();
          }
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
            display: "block",
            transform: "scaleX(-1)",
          }}
        />
      </div>
    </div>
  );
};

export default TwoHandsTracker;
