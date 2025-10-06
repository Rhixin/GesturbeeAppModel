"use client";

import { useState, useRef } from "react";

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPrediction(null);
      setError(null);

      // Create video preview
      const videoUrl = URL.createObjectURL(file);
      setVideoPreview(videoUrl);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a video file first");
      return;
    }

    setUploading(true);
    setError(null);
    setPrediction(null);

    try {
      const formData = new FormData();
      formData.append("video", selectedFile);

      const response = await fetch("https://3xx912k6-8080.asse.devtunnels.ms/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setPrediction(data);
        console.log("✅ Prediction result:", data);
      } else {
        setError(data.error || "Upload failed");
        console.error("❌ Upload error:", data);
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
      console.error("❌ Network error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPrediction(null);
    setError(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Video Upload Recognition
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Upload a sign language video to get predictions
        </p>

        {/* File Upload Area */}
        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Select Video File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent p-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            Supported formats: MP4, AVI, MOV, WEBM, MKV (Max 50MB)
          </p>
        </div>

        {/* Video Preview */}
        {videoPreview && (
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Video Preview
            </label>
            <video
              src={videoPreview}
              controls
              className="w-full rounded-lg border border-gray-300 max-h-96"
            />
          </div>
        )}

        {/* Upload Button */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold text-white transition-all duration-300 ${
              !selectedFile || uploading
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-105"
            }`}
          >
            {uploading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </span>
            ) : (
              "Upload & Predict"
            )}
          </button>

          {selectedFile && (
            <button
              onClick={handleClear}
              disabled={uploading}
              className="py-3 px-6 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all duration-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Prediction Results */}
        {prediction && (
          <div className="space-y-4">
            {/* Top Prediction */}
            <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-300">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">
                Top Prediction
              </h2>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-green-700">
                  {prediction.top_prediction}
                </span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {(prediction.confidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600">Confidence</div>
                </div>
              </div>
            </div>

            {/* All Predictions */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                All Predictions (Top 5)
              </h3>
              <div className="space-y-2">
                {prediction.predictions.map((pred: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-800">
                        {pred.prediction}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pred.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                        {(pred.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Processing Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl">
              <div>
                <div className="text-xs text-gray-600">Frames Processed</div>
                <div className="text-lg font-bold text-blue-700">
                  {prediction.frames_processed}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600">Processing Time</div>
                <div className="text-lg font-bold text-blue-700">
                  {prediction.processing_time_ms.toFixed(0)}ms
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
