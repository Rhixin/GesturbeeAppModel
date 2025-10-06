"use client";

import HandTracker from "@/components/HandTracker";
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

export default function Home() {
  const [trackerMode, setTrackerMode] = useState<"hand" | "holistic">("holistic");
  const [handData, setHandData] = useState<number[] | null>(null);
  const [holisticData, setHolisticData] = useState<number[] | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [socketStatus, setSocketStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");

  const socketRef = useRef<any>(null);

  useEffect(() => {
    // const socket = io("https://aslmodelbackend.onrender.com/");
    const socket = io("https://3xx912k6-8080.asse.devtunnels.ms/");

    socketRef.current = socket;
    setSocketStatus("connecting");

    socket.on("connect", () => {
      console.log("✅ Socket connected");
      setSocketStatus("connected");
    });

    socket.on("disconnect", () => {
      console.log("⚠️ Socket disconnected");
      setSocketStatus("disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error);
      setSocketStatus("error");
    });

    socket.on("prediction_result", (result) => {
      setPrediction(result);
    });

    socket.on("prediction_error", (error) => {
      console.error("❌ Prediction error:", error);
    });

    socket.on("lstm_prediction_result", (result) => {
      setPrediction(result);
    });

    socket.on("lstm_prediction_error", (error) => {
      console.error("❌ LSTM Prediction error:", error);
    });

    socket.on("lstm_buffering", (status) => {
      // Log buffering progress
      console.log(`📊 Buffering: ${status.buffer_size}/${status.target_frames} frames`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (handData && socketRef.current?.connected && trackerMode === "hand") {
      socketRef.current.emit("hand_data", handData);
    }
  }, [handData, trackerMode]);

  useEffect(() => {
    if (holisticData && socketRef.current?.connected && trackerMode === "holistic") {
      socketRef.current.emit("holistic_data", holisticData);
    }
  }, [holisticData, trackerMode]);

  // useEffect(() => {
  //   if (prediction) {
  //     // Send message to parent window (the page embedding your iframe)
  //     window.parent.postMessage(
  //       {
  //         type: "prediction",
  //         data: prediction,
  //       },
  //       "*" // or replace "*" with your parent origin for security
  //     );
  //     console.log("📤 Sent prediction to parent window:", prediction);
  //   }
  // }, [prediction]);

  useEffect(() => {
    if (prediction) {
      // Instead of window.parent.postMessage
      if (window.ReactNativeWebView) {
        // For React Native WebView
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "prediction",
            data: {
              prediction: prediction,
            },
          })
        );
        console.log("📤 Sent prediction to React Native WebView:", prediction);
      } else {
        // Fallback for browser testing
        window.parent.postMessage(
          {
            type: "prediction",
            data: {
              prediction: prediction,
            },
          },
          "*"
        );
        console.log(
          "📤 Sent prediction to parent window (browser mode):",
          prediction
        );
      }
    }
  }, [prediction]);

  return (
    <div className="flex flex-col justify-center items-center h-[100vh] w-full p-4">
      {/* Mode Toggle with Clear Labels */}
      <div className="mb-4 flex flex-col gap-2">
        <div className="text-center text-sm font-semibold text-gray-700 mb-2">
          Select Recognition Mode
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setTrackerMode("hand")}
            className={`flex flex-col items-center px-6 py-3 rounded-lg border-2 transition-all ${
              trackerMode === "hand"
                ? "bg-blue-500 text-white border-blue-600 shadow-md"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-300"
            }`}
          >
            <span className="font-bold text-lg">✋ Alphabets</span>
            <span className="text-xs mt-1">A-Z Letters</span>
            <span className="text-xs opacity-70">Hand Only (26 classes)</span>
          </button>
          <button
            onClick={() => setTrackerMode("holistic")}
            className={`flex flex-col items-center px-6 py-3 rounded-lg border-2 transition-all ${
              trackerMode === "holistic"
                ? "bg-green-500 text-white border-green-600 shadow-md"
                : "bg-white text-gray-700 border-gray-300 hover:border-green-300"
            }`}
          >
            <span className="font-bold text-lg">🗣️ Words & Phrases</span>
            <span className="text-xs mt-1">Days, Months, Greetings, etc.</span>
            <span className="text-xs opacity-70">Full Body (105 classes)</span>
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="mb-2 text-sm">
        <span
          className={`px-2 py-1 rounded ${
            socketStatus === "connected"
              ? "bg-green-100 text-green-700"
              : socketStatus === "connecting"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {socketStatus === "connected" && "✓ Connected"}
          {socketStatus === "connecting" && "⏳ Connecting..."}
          {socketStatus === "disconnected" && "✗ Disconnected"}
          {socketStatus === "error" && "✗ Connection Error"}
        </span>
      </div>

      {/* Tracker Display */}
      {trackerMode === "hand" ? (
        <HandTracker handData={handData} setHandData={setHandData} />
      ) : (
        <HolisticTracker
          holisticData={holisticData}
          setHolisticData={setHolisticData}
        />
      )}

      {/* Prediction Display */}
      {prediction && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg max-w-md">
          <h3 className="font-bold mb-2">Prediction Result:</h3>
          <div className="text-lg font-semibold text-blue-700">
            {prediction.top_prediction || prediction.prediction}
          </div>
          <div className="text-sm text-gray-600">
            Confidence: {((prediction.confidence || 0) * 100).toFixed(2)}%
          </div>
          {prediction.processing_time && (
            <div className="text-xs text-gray-500 mt-1">
              Processing: {prediction.processing_time}ms
            </div>
          )}
        </div>
      )}
    </div>
  );
}
