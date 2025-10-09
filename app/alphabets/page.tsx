"use client";

import HandTracker from "@/components/HandTracker";
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

export default function AlphabetsPage() {
  const [handData, setHandData] = useState<number[] | null>(null);
  const [prediction, setPrediction] = useState<any>(null);

  const socketRef = useRef<any>(null);

  useEffect(() => {
    // const socket = io("https://aslmodelbackend.onrender.com/");
    const socket = io("https://3xx912k6-8080.asse.devtunnels.ms/");

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ [Alphabets] Socket connected");
    });

    socket.on("disconnect", () => {
      console.log("⚠️ [Alphabets] Socket disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("❌ [Alphabets] Connection error:", error);
    });

    socket.on("prediction_result", (result) => {
      console.log("🔤 [Alphabets] Prediction:", result);
      setPrediction(result);
    });

    socket.on("prediction_error", (error) => {
      console.error("❌ [Alphabets] Prediction error:", error);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (handData && socketRef.current?.connected) {
      socketRef.current.emit("hand_data", handData);
    }
  }, [handData]);

  useEffect(() => {
    if (prediction) {
      // Send to React Native WebView
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "prediction",
            mode: "alphabets",
            data: {
              prediction: prediction,
            },
          })
        );
        console.log("📤 [Alphabets] Sent to React Native:", prediction);
      } else {
        // Fallback for browser testing
        window.parent.postMessage(
          {
            type: "prediction",
            mode: "alphabets",
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
    <div className="flex justify-center items-center h-[100vh] w-full bg-black">
      <div className="w-full h-full max-w-full max-h-full flex items-center justify-center">
        <HandTracker handData={handData} setHandData={setHandData} />
      </div>
    </div>
  );
}
