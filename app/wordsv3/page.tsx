"use client";

import HolisticTracker from "@/components/HolisticTracker";
import { io } from "socket.io-client";
import { useEffect, useRef, useState } from "react";

// Extend window type globally (for TypeScript support)
declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

export default function WordsV3Page() {
  const [holisticData, setHolisticData] = useState<number[] | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [bufferingStatus, setBufferingStatus] = useState<any>(null);

  const socketRef = useRef<any>(null);

  useEffect(() => {
    // const socket = io("https://aslmodelbackend.onrender.com/");
    const socket = io("https://3xx912k6-8080.asse.devtunnels.ms/");

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ [WordsV3] Socket connected (Feature-Based Model)");
    });

    socket.on("disconnect", () => {
      console.log("⚠️ [WordsV3] Socket disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("❌ [WordsV3] Connection error:", error);
    });

    socket.on("lstm_prediction_result", (result) => {
      console.log("🗣️ [WordsV3] Prediction:", result);
      setPrediction(result);
      setBufferingStatus(null); // Clear buffering when prediction arrives
    });

    socket.on("lstm_prediction_error", (error) => {
      console.error("❌ [WordsV3] Prediction error:", error);
    });

    socket.on("lstm_buffering", (status) => {
      console.log(`📊 [WordsV3] Buffering: ${status.buffer_size}/${status.target_frames} frames (${status.frames_needed} more needed)`);
      setBufferingStatus(status);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (holisticData && socketRef.current?.connected) {
      socketRef.current.emit("holistic_data", holisticData);
    }
  }, [holisticData]);

  useEffect(() => {
    if (prediction) {
      console.log("📊 [WordsV3] Prediction Details:", {
        topPrediction: prediction.top_prediction,
        confidence: prediction.confidence,
        isWebView: !!window.ReactNativeWebView,
        timestamp: new Date().toISOString()
      });

      // Send to React Native WebView
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "prediction",
            mode: "wordsv3",
            data: {
              prediction: prediction,
            },
          })
        );
        console.log("📤 [WordsV3] Sent to React Native WebView:", prediction.top_prediction);
      } else {
        // Fallback for browser testing
        window.parent.postMessage(
          {
            type: "prediction",
            mode: "wordsv3",
            data: {
              prediction: prediction,
            },
          },
          "*"
        );
        console.log("📤 [WordsV3] Sent to Browser (not WebView):", prediction.top_prediction);
      }
    }
  }, [prediction]);

  return (
    <div className="flex justify-center items-center h-[100vh] w-full bg-black relative">
      <div className="w-full h-full max-w-full max-h-full flex items-center justify-center">
        <HolisticTracker
          holisticData={holisticData}
          setHolisticData={setHolisticData}
        />
      </div>

      {/* Model info badge */}
      <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm">
        Feature-Based Model (v3)
      </div>

      {/* Buffering status */}
      {bufferingStatus && !prediction && (
        <div className="absolute top-4 left-4 right-4 bg-yellow-600 bg-opacity-90 text-white p-3 rounded-lg">
          <div className="text-sm text-center">
            Buffering: {bufferingStatus.buffer_size}/{bufferingStatus.target_frames} frames
          </div>
          <div className="text-xs text-center mt-1">
            Need {bufferingStatus.frames_needed} more frames...
          </div>
        </div>
      )}

      {/* On-screen prediction display */}
      {prediction && (
        <div className="absolute top-4 left-4 right-4 bg-green-600 bg-opacity-90 text-white p-4 rounded-lg">
          <div className="text-3xl font-bold text-center">
            {prediction.top_prediction}
          </div>
          <div className="text-sm text-center text-gray-100 mt-2">
            {(prediction.confidence * 100).toFixed(1)}% confidence
          </div>
          <div className="text-xs text-center text-gray-200 mt-1">
            Camera-Invariant Model ✓
          </div>
        </div>
      )}
    </div>
  );
}
