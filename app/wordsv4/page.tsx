"use client";

import HolisticTracker from "@/components/HolisticTracker";
import { io } from "socket.io-client";
import { useEffect, useRef, useState } from "react";

export default function WordsV4Page() {
  const [holisticData, setHolisticData] = useState<number[] | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [bufferingStatus, setBufferingStatus] = useState<any>(null);

  const socketRef = useRef<any>(null);

  useEffect(() => {
    const socket = io("https://3xx912k6-8080.asse.devtunnels.ms/");
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ [WordsV4] Socket connected (Normalized Feature-Based Model)");
    });

    socket.on("normalized_lstm_prediction_result", (result) => {
      console.log("🗣️ [WordsV4] Prediction:", result);
      setPrediction(result);
      setBufferingStatus(null);
    });

    socket.on("normalized_lstm_buffering", (status) => {
      console.log(`📊 [WordsV4] Buffering: ${status.buffer_size}/${status.target_frames} frames`);
      setBufferingStatus(status);
    });

    socket.on("normalized_lstm_prediction_error", (error) => {
      console.error("❌ [WordsV4] Prediction error:", error);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (holisticData && socketRef.current?.connected) {
      socketRef.current.emit("normalized_holistic_data", holisticData);
    }
  }, [holisticData]);

  return (
    <div className="flex justify-center items-center h-[100vh] w-full bg-black relative">
      <HolisticTracker holisticData={holisticData} setHolisticData={setHolisticData} />

      <div className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-semibold">
        Normalized Feature-Based Model (v4)
      </div>

      {bufferingStatus && !prediction && (
        <div className="absolute top-4 left-4 right-4 bg-yellow-600 bg-opacity-90 text-white p-3 rounded-lg">
          <div className="text-sm text-center">
            Buffering: {bufferingStatus.buffer_size}/{bufferingStatus.target_frames} frames
          </div>
        </div>
      )}

      {prediction && (
        <div className="absolute top-4 left-4 right-4 bg-green-600 bg-opacity-90 text-white p-4 rounded-lg">
          <div className="text-3xl font-bold text-center">{prediction.top_prediction}</div>
          <div className="text-sm text-center text-gray-100 mt-2">
            {(prediction.confidence * 100).toFixed(1)}% confidence
          </div>

          {/* Show top 5 predictions */}
          {prediction.predictions && prediction.predictions.length > 1 && (
            <div className="mt-3 pt-3 border-t border-white/30">
              <div className="text-xs text-center text-gray-200 mb-2">Top 5 Predictions:</div>
              <div className="space-y-1">
                {prediction.predictions.slice(0, 5).map((pred: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span>{idx + 1}. {pred.prediction}</span>
                    <span className="text-gray-200">{(pred.confidence * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
