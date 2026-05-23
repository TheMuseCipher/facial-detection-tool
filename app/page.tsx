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
import { Scan, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export default function FaceDetectionPage() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [registeredFaces, setRegisteredFaces] = useState<RegisteredFace[]>([]);
  const [stats, setStats] = useState({
    totalFaces: 0,
    recognized: 0,
    unknown: 0,
  });

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

  const handleStatsUpdate = useCallback(
    (newStats: { totalFaces: number; recognized: number; unknown: number }) => {
      setStats(newStats);
    },
    []
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                <Scan className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AI Face Detection</h1>
                <p className="text-sm text-muted-foreground">
                  Real-time facial recognition system
                </p>
              </div>
            </div>

            {/* Model Status */}
            <div className="flex items-center gap-2">
              {modelError ? (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-full text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Models Error
                </div>
              ) : modelsLoaded ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-500/10 px-3 py-1.5 rounded-full text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Models Ready
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground bg-muted px-3 py-1.5 rounded-full text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading Models...
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

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
            />
          </div>
        </div>
      </main>
    </div>
  );
}
