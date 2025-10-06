"use client";

import React, { useRef, useEffect, useState } from "react";

// Define types for MediaPipe objects
declare global {
  interface Window {
    Holistic?: any;
    Camera?: any;
  }
}

const HolisticTracker = ({
  holisticData,
  setHolisticData,
}: {
  holisticData: number[] | null;
  setHolisticData: Function;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  // Load MediaPipe scripts
  useEffect(() => {
    // Check if scripts are already loaded
    if (window.Holistic && window.Camera) {
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
      loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js"),
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
  // 23 pose (upper body) + 21 left hand + 21 right hand = 65 landmarks × 3 = 195 values
  const flattenLandmarks = (
    poseLandmarks: any[],
    leftHandLandmarks: any[] | null,
    rightHandLandmarks: any[] | null
  ): number[] => {
    const flattened: number[] = [];

    // Pose landmarks (0-22, upper body only)
    const upperBodyPose = poseLandmarks.slice(0, 23);
    for (const point of upperBodyPose) {
      flattened.push(point.x, point.y, point.z || 0);
    }

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

  // Initialize holistic tracking after scripts are loaded
  useEffect(() => {
    if (!scriptsLoaded || !videoRef.current || !canvasRef.current) return;

    const canvasCtx = canvasRef.current.getContext("2d");
    if (!canvasCtx) {
      console.error("Failed to get 2D context.");
      setIsLoading(false);
      return;
    }

    try {
      // Access MediaPipe Holistic through window object
      const holistic = new window.Holistic({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
      });

      // Set options for holistic tracking
      holistic.setOptions({
        modelComplexity: 0, // 0 = Lite, 1 = Full, 2 = Heavy
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        enableSegmentation: false,
        refineFaceLandmarks: false,
      });

      // Handle results from holistic tracking
      holistic.onResults((results: any) => {
        const canvasWidth = 640;
        const canvasHeight = 480;

        canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        if (results.image) {
          canvasCtx.drawImage(results.image, 0, 0, canvasWidth, canvasHeight);
        }

        // Check if we have pose and at least one hand detected
        if (
          results.poseLandmarks &&
          (results.leftHandLandmarks || results.rightHandLandmarks)
        ) {
          // Flatten the landmarks
          const flattenedLandmarks = flattenLandmarks(
            results.poseLandmarks,
            results.leftHandLandmarks,
            results.rightHandLandmarks
          );

          // Update state (195 values)
          setHolisticData(flattenedLandmarks);

          // Draw pose connections (upper body only)
          if (results.poseLandmarks) {
            canvasCtx.strokeStyle = "#00FF00";
            canvasCtx.lineWidth = 2;

            // Upper body pose connections
            const POSE_CONNECTIONS = [
              [11, 12], // Shoulders
              [11, 13], [13, 15], // Left arm
              [12, 14], [14, 16], // Right arm
              [11, 23], [12, 24], // Torso
            ];

            for (const [start, end] of POSE_CONNECTIONS) {
              if (results.poseLandmarks[start] && results.poseLandmarks[end]) {
                canvasCtx.beginPath();
                canvasCtx.moveTo(
                  results.poseLandmarks[start].x * canvasWidth,
                  results.poseLandmarks[start].y * canvasHeight
                );
                canvasCtx.lineTo(
                  results.poseLandmarks[end].x * canvasWidth,
                  results.poseLandmarks[end].y * canvasHeight
                );
                canvasCtx.stroke();
              }
            }

            // Draw pose landmarks (upper body)
            for (let i = 0; i < 23; i++) {
              const point = results.poseLandmarks[i];
              if (point) {
                canvasCtx.beginPath();
                canvasCtx.arc(
                  point.x * canvasWidth,
                  point.y * canvasHeight,
                  3,
                  0,
                  2 * Math.PI
                );
                canvasCtx.fillStyle = "#00FF00";
                canvasCtx.fill();
              }
            }
          }

          // Draw left hand
          if (results.leftHandLandmarks) {
            canvasCtx.strokeStyle = "#FF0000";
            canvasCtx.lineWidth = 1;

            const HAND_CONNECTIONS = [
              [0, 1], [1, 2], [2, 3], [3, 4],
              [0, 5], [5, 6], [6, 7], [7, 8],
              [5, 9], [9, 10], [10, 11], [11, 12],
              [9, 13], [13, 14], [14, 15], [15, 16],
              [13, 17], [17, 18], [18, 19], [19, 20],
              [0, 17],
            ];

            for (const [start, end] of HAND_CONNECTIONS) {
              canvasCtx.beginPath();
              canvasCtx.moveTo(
                results.leftHandLandmarks[start].x * canvasWidth,
                results.leftHandLandmarks[start].y * canvasHeight
              );
              canvasCtx.lineTo(
                results.leftHandLandmarks[end].x * canvasWidth,
                results.leftHandLandmarks[end].y * canvasHeight
              );
              canvasCtx.stroke();
            }

            for (const point of results.leftHandLandmarks) {
              canvasCtx.beginPath();
              canvasCtx.arc(
                point.x * canvasWidth,
                point.y * canvasHeight,
                2,
                0,
                2 * Math.PI
              );
              canvasCtx.fillStyle = "#FF0000";
              canvasCtx.fill();
            }
          }

          // Draw right hand
          if (results.rightHandLandmarks) {
            canvasCtx.strokeStyle = "#0000FF";
            canvasCtx.lineWidth = 1;

            const HAND_CONNECTIONS = [
              [0, 1], [1, 2], [2, 3], [3, 4],
              [0, 5], [5, 6], [6, 7], [7, 8],
              [5, 9], [9, 10], [10, 11], [11, 12],
              [9, 13], [13, 14], [14, 15], [15, 16],
              [13, 17], [17, 18], [18, 19], [19, 20],
              [0, 17],
            ];

            for (const [start, end] of HAND_CONNECTIONS) {
              canvasCtx.beginPath();
              canvasCtx.moveTo(
                results.rightHandLandmarks[start].x * canvasWidth,
                results.rightHandLandmarks[start].y * canvasHeight
              );
              canvasCtx.lineTo(
                results.rightHandLandmarks[end].x * canvasWidth,
                results.rightHandLandmarks[end].y * canvasHeight
              );
              canvasCtx.stroke();
            }

            for (const point of results.rightHandLandmarks) {
              canvasCtx.beginPath();
              canvasCtx.arc(
                point.x * canvasWidth,
                point.y * canvasHeight,
                2,
                0,
                2 * Math.PI
              );
              canvasCtx.fillStyle = "#0000FF";
              canvasCtx.fill();
            }
          }
        } else {
          // Reset holistic data if no valid landmarks detected
          setHolisticData(null);
        }
      });

      // Initialize camera
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          await holistic.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });

      camera.start();
      setIsLoading(false);

      return () => {
        camera.stop();
        holistic.close();
      };
    } catch (error) {
      console.error("Error initializing MediaPipe Holistic:", error);
      setIsLoading(false);
    }
  }, [scriptsLoaded]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 rounded z-10">
            <div className="text-center">
              <div className="mb-2">Loading holistic tracking...</div>
              <div className="text-xs text-gray-500">
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
          width={400}
          height={400}
          className="border border-gray-300 rounded"
        />
      </div>
    </div>
  );
};

export default HolisticTracker;
