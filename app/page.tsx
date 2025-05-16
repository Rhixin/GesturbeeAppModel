"use client";
import HandTracker from "@/components/HandTracker";
import { io } from "socket.io-client";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [handData, setHandData] = useState<number[] | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [socketStatus, setSocketStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const socket = io("https://aslmodelbackend.onrender.com/");

    socketRef.current = socket;

    setSocketStatus("connecting");

    // Socket event handlers
    socket.on("connect", () => {
      console.log("Socket connected");
      setSocketStatus("connected");
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setSocketStatus("disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setSocketStatus("error");
    });

    socket.on("prediction_result", (result) => {
      setPrediction(result);
    });

    socket.on("prediction_error", (error) => {
      console.error("Prediction error:", error);
    });

    // Clean up on component unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (handData && socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("hand_data", handData);
    }

    console.log(prediction);
  }, [handData]);

  return (
    <div className="flex justify-center items-center h-[100vh] w-full">
      <HandTracker handData={handData} setHandData={setHandData} />
    </div>
  );
}
