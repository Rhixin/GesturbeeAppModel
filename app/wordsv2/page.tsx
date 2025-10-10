"use client";

import TwoHandsTracker from "@/components/TwoHandsTracker";
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

export default function WordsV2Page() {
  const [handData, setHandData] = useState<number[] | null>(null);
  const [prediction, setPrediction] = useState<any>(null);

  const socketRef = useRef<any>(null);

  useEffect(() => {
    // const socket = io("https://aslmodelbackend.onrender.com/");
    const socket = io("https://3xx912k6-8080.asse.devtunnels.ms/");

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ [WordsV2] Socket connected (hand-only model)");
    });

    socket.on("disconnect", () => {
      console.log("⚠️ [WordsV2] Socket disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("❌ [WordsV2] Connection error:", error);
    });

    socket.on("hand_only_lstm_prediction_result", (result) => {
      console.log("🗣️ [WordsV2] Hand-only prediction:", result);
      setPrediction(result);
    });

    socket.on("hand_only_lstm_prediction_error", (error) => {
      console.error("❌ [WordsV2] Prediction error:", error);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (handData && socketRef.current?.connected) {
      // Emit hand-only data (126 values: 2 hands × 21 landmarks × 3 coordinates)
      socketRef.current.emit("hand_only_lstm_data", handData);
    }
  }, [handData]);

  useEffect(() => {
    if (prediction) {
      console.log("📊 [WordsV2] Prediction Details:", {
        topPrediction: prediction.top_prediction,
        confidence: prediction.confidence,
        bufferSize: prediction.buffer_size,
        processingTime: prediction.processing_time,
        isWebView: !!window.ReactNativeWebView,
        timestamp: new Date().toISOString()
      });

      // Send to React Native WebView
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "prediction",
            mode: "wordsv2",
            data: {
              prediction: prediction,
            },
          })
        );
        console.log("📤 [WordsV2] Sent to React Native WebView:", prediction.top_prediction);
      } else {
        // Fallback for browser testing
        window.parent.postMessage(
          {
            type: "prediction",
            mode: "wordsv2",
            data: {
              prediction: prediction,
            },
          },
          "*"
        );
        console.log("📤 [WordsV2] Sent to Browser (not WebView):", prediction.top_prediction);
      }
    }
  }, [prediction]);

  return (
    <div className="flex justify-center items-center h-[100vh] w-full bg-black">
      <div className="w-full h-full max-w-full max-h-full flex items-center justify-center">
        <TwoHandsTracker
          handData={handData}
          setHandData={setHandData}
        />
      </div>
    </div>
  );
}
