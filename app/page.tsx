"use client";
import HandTracker from "@/components/HandTracker";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function Home() {
  const [handData, setHandData] = useState<number[] | null>(null);
  const [prediction, setPrediction] = useState<any>(null);

  return (
    <div className="p-10">
      <HandTracker handData={handData} setHandData={setHandData} />
    </div>
  );
}
