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

export default function Home() {
  const [handData, setHandData] = useState<number[] | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [socketStatus, setSocketStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");

  const socketRef = useRef<any>(null);

  useEffect(() => {
    const socket = io("http://127.0.0.1:10000/");

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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (handData && socketRef.current?.connected) {
      socketRef.current.emit("hand_data", handData);
    }

    console.log("Result: ", prediction);
  }, [handData]);

  useEffect(() => {
    if (prediction) {
      // Send prediction to React Native WebView (if available)
      if (window.ReactNativeWebView?.postMessage) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "prediction",
            data: prediction,
          })
        );

        console.log("📤 Sent prediction to WebView:", prediction);
      }
    }
  }, [prediction]);

  return (
    <div className="flex justify-center items-center h-[100vh] w-full">
      <HandTracker handData={handData} setHandData={setHandData} />
    </div>
  );
}
