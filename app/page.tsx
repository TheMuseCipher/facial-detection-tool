"use client";

import { useState, useEffect, useCallback } from "react";
import { VideoPlayer } from "@/components/face-detection/video-player";
import { FaceRegistration } from "@/components/face-detection/face-registration";
import { RegisteredFacesList } from "@/components/face-detection/registered-faces-list";
import {
  loadModels,
  areModelsLoaded,
  saveRegisteredFaces,
  loadRegisteredFaces,
  type RegisteredFace,
} from "@/lib/face-api";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export default function FaceDetectionPage() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [registeredFaces, setRegisteredFaces] = useState<RegisteredFace[]>([]);
  const [stats, setStats] = useState({
    totalFaces: 0,
    recognized: 0,
    unknown: 0,
  });
  
  // Debug state for UI screenshots
  const [debugMode, setDebugMode] = useState(false);

  // Load models and registered faces on mount
  useEffect(() => {
    const init = async () => {
      // Load registered faces from localStorage
      const faces = loadRegisteredFaces();
      setRegisteredFaces(faces);

      // Load face-api models
      if (!areModelsLoaded()) {
        try {
          await loadModels();
          setModelsLoaded(true);
        } catch (error) {
          console.error("Failed to load models:", error);
          setModelError(
            "Failed to load face detection models. Please ensure model files are in /public/models/"
          );
        }
      } else {
        setModelsLoaded(true);
      }
    };

    init();
  }, []);

  const handleFaceRegistered = useCallback((face: RegisteredFace) => {
    setRegisteredFaces((prev) => {
      const updated = [...prev, face];
      saveRegisteredFaces(updated);
      return updated;
    });
  }, []);

  const handleRemoveFace = useCallback((id: string) => {
    setRegisteredFaces((prev) => {
      const updated = prev.filter((face) => face.id !== id);
      saveRegisteredFaces(updated);
      return updated;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to remove all registered faces? This cannot be undone."
      )
    ) {
      setRegisteredFaces([]);
      saveRegisteredFaces([]);
    }
  }, []);

  const handleToggleFace = useCallback((id: string) => {
    setRegisteredFaces((prev) => {
      const updated = prev.map((face) =>
        face.id === id ? { ...face, enabled: !face.enabled } : face
      );
      saveRegisteredFaces(updated);
      return updated;
    });
  }, []);

  const handleStatsUpdate = useCallback(
    (newStats: { totalFaces: number; recognized: number; unknown: number }) => {
      setStats(newStats);
    },
    []
  );

  // Debug handlers for UI screenshots
  const setModelReady = useCallback(() => {
    setModelsLoaded(true);
    setModelError(null);
  }, []);

  const setModelLoading = useCallback(() => {
    setModelsLoaded(false);
    setModelError(null);
  }, []);

  const setModelErrorState = useCallback(() => {
    setModelsLoaded(false);
    setModelError("Failed to load face detection models. Please ensure model files are in /public/models/");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {modelError && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-600">
                  Model Loading Error
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {modelError}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Download the required models from{" "}
                  <a
                    href="https://github.com/justadudewhohacks/face-api.js/tree/master/weights"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    face-api.js weights
                  </a>{" "}
                  and place them in the <code>/public/models/</code> folder.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Player - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <VideoPlayer
              registeredFaces={registeredFaces}
              modelsLoaded={modelsLoaded}
              modelError={modelError}
              onStatsUpdate={handleStatsUpdate}
              stats={stats}
            />
          </div>

          {/* Right Panel - Registration and Faces List */}
          <div className="space-y-6">
            <FaceRegistration
              onFaceRegistered={handleFaceRegistered}
              disabled={!modelsLoaded}
            />
            <RegisteredFacesList
              faces={registeredFaces}
              onRemoveFace={handleRemoveFace}
              onClearAll={handleClearAll}
              onToggleFace={handleToggleFace}
            />
          </div>
        </div>

        {/* Debug Panel for UI Screenshots */}
        {debugMode && (
          <div className="fixed bottom-4 right-4 bg-card border rounded-lg shadow-lg p-4 space-y-3 z-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Debug Controls</span>
              <button
                onClick={() => setDebugMode(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={setModelReady}
                className="w-full px-3 py-2 text-sm bg-green-500/10 text-green-600 rounded hover:bg-green-500/20 transition-colors"
              >
                Set Model Ready
              </button>
              <button
                onClick={setModelLoading}
                className="w-full px-3 py-2 text-sm bg-muted text-muted-foreground rounded hover:bg-muted/80 transition-colors"
              >
                Set Model Loading
              </button>
              <button
                onClick={setModelErrorState}
                className="w-full px-3 py-2 text-sm bg-red-500/10 text-red-600 rounded hover:bg-red-500/20 transition-colors"
              >
                Set Model Error
              </button>
            </div>
          </div>
        )}

        {/* Debug Toggle Button */}
        <button
          onClick={() => setDebugMode(!debugMode)}
          className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs z-50"
          style={{ display: debugMode ? 'none' : 'block' }}
        >
          Debug
        </button>
      </main>
    </div>
  );
}
