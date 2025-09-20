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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (handData && socketRef.current?.connected) {
      socketRef.current.emit("hand_data", handData);
    }

    //console.log("Result: ", prediction);
  }, [handData]);

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
    <div className="flex justify-center items-center h-[100vh] w-full">
      <HandTracker handData={handData} setHandData={setHandData} />
    </div>
  );
}
