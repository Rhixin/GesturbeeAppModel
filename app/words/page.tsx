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

export default function WordsPage() {
  const [holisticData, setHolisticData] = useState<number[] | null>(null);
  const [prediction, setPrediction] = useState<any>(null);

  const socketRef = useRef<any>(null);

  useEffect(() => {
    // const socket = io("https://aslmodelbackend.onrender.com/");
    const socket = io("https://3xx912k6-8080.asse.devtunnels.ms/");

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ [Words] Socket connected");
    });

    socket.on("disconnect", () => {
      console.log("⚠️ [Words] Socket disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("❌ [Words] Connection error:", error);
    });

    socket.on("lstm_prediction_result", (result) => {
      console.log("🗣️ [Words] Prediction:", result);
      setPrediction(result);
    });

    socket.on("lstm_prediction_error", (error) => {
      console.error("❌ [Words] Prediction error:", error);
    });

    socket.on("lstm_buffering", (status) => {
      console.log(`📊 [Words] Buffering: ${status.buffer_size}/${status.target_frames} frames (${status.frames_needed} more needed)`);
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
      // Send to React Native WebView
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "prediction",
            mode: "words",
            data: {
              prediction: prediction,
            },
          })
        );
        console.log("📤 [Words] Sent to React Native:", prediction);
      } else {
        // Fallback for browser testing
        window.parent.postMessage(
          {
            type: "prediction",
            mode: "words",
            data: {
              prediction: prediction,
            },
          },
          "*"
        );
      }
    }
  }, [prediction]);

  return (
    <div className="flex justify-center items-center h-[100vh] w-full">
      <HolisticTracker
        holisticData={holisticData}
        setHolisticData={setHolisticData}
      />
    </div>
  );
}
