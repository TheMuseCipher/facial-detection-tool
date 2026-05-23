"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  detectFacesInFrame,
  createFaceMatcher,
  type RegisteredFace,
  type DetectedFace,
} from "@/lib/face-api";
import {
  Upload,
  Play,
  Pause,
  Video,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import * as faceapi from "face-api.js";

interface VideoPlayerProps {
  registeredFaces: RegisteredFace[];
  modelsLoaded: boolean;
  modelError?: string | null;
  onStatsUpdate?: (stats: {
    totalFaces: number;
    recognized: number;
    unknown: number;
  }) => void;
  stats?: {
    totalFaces: number;
    recognized: number;
    unknown: number;
  };
}

export function VideoPlayer({
  registeredFaces,
  modelsLoaded,
  modelError,
  onStatsUpdate,
  stats,
}: VideoPlayerProps) {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number | null>(null);
  const faceMatcherRef = useRef<faceapi.FaceMatcher | null>(null);
  const frameCountRef = useRef(0);

  // Update face matcher when registered faces change
  useEffect(() => {
    faceMatcherRef.current = createFaceMatcher(registeredFaces);
  }, [registeredFaces]);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("video/")) {
        alert("Please select a video file");
        return;
      }

      // Revoke old URL to prevent memory leak
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }

      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setIsPlaying(false);
      setIsDetecting(false);
      setVideoError(null);
      setIsVideoReady(false);

      // Reset canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    },
    [videoSrc],
  );

  const drawDetections = useCallback(
    (
      detections: DetectedFace[],
      displaySize: { width: number; height: number },
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear previous drawings
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw each detection
      detections.forEach((detection) => {
        const { box, name, isRecognized } = detection;

        // Set colors based on recognition
        const color = isRecognized ? "#22c55e" : "#ef4444"; // green-500 or red-500

        // Draw bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Draw label background
        const label = isRecognized ? name : "Unknown";
        ctx.font = "bold 16px sans-serif";
        const textWidth = ctx.measureText(label).width;
        const padding = 8;
        const labelHeight = 24;

        ctx.fillStyle = color;
        ctx.fillRect(
          box.x,
          box.y - labelHeight - 4,
          textWidth + padding * 2,
          labelHeight,
        );

        // Draw label text
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, box.x + padding, box.y - 10);
      });

      // Update stats
      if (onStatsUpdate) {
        const recognized = detections.filter((d) => d.isRecognized).length;
        onStatsUpdate({
          totalFaces: detections.length,
          recognized,
          unknown: detections.length - recognized,
        });
      }
    },
    [onStatsUpdate],
  );

  const detectLoop = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.paused || video.ended) {
      setIsDetecting(false);
      return;
    }

    // Skip frames for performance (process every 3rd frame)
    frameCountRef.current++;
    if (frameCountRef.current % 3 === 0) {
      try {
        const detections = await detectFacesInFrame(
          video,
          faceMatcherRef.current,
        );

        const displaySize = {
          width: video.videoWidth,
          height: video.videoHeight,
        };

        drawDetections(detections, displaySize);
      } catch (error) {
        console.error("Detection error:", error);
      }
    }

    animationRef.current = requestAnimationFrame(detectLoop);
  }, [drawDetections]);

  const handlePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      await video.play();
      setIsPlaying(true);
      setIsDetecting(true);
      frameCountRef.current = 0;
      detectLoop();
    } catch (error) {
      console.error("Video play error:", error);
    }
  }, [detectLoop]);

  const handlePause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    setIsPlaying(false);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const handleVideoLoad = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    setIsVideoReady(true);
    setVideoError(null);
  }, []);

  const handleVideoError = useCallback(() => {
    const video = videoRef.current;
    const errorMessage = video?.error?.message || "Failed to load video";
    setVideoError(errorMessage);
    setIsVideoReady(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc]);

  // Handle video end
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      setIsPlaying(false);
      setIsDetecting(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };

    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, []);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Detection
            </CardTitle>
            <CardDescription>
              Upload a video to detect and identify faces in real-time
            </CardDescription>
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
      </CardHeader>
      <CardContent className="space-y-4">
        {!videoSrc ? (
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors aspect-video flex flex-col items-center justify-center"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Upload Video</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click to select a video file
            </p>
          </div>
        ) : (
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={videoSrc}
              className="w-full h-full object-contain"
              onLoadedMetadata={handleVideoLoad}
              onError={handleVideoError}
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
            />
            {isDetecting && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Detecting...
              </div>
            )}
            {videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center p-4">
                  <p className="text-red-400 font-medium">Video Error</p>
                  <p className="text-white/70 text-sm mt-1">{videoError}</p>
                  <p className="text-white/50 text-xs mt-2">
                    Please try uploading a different video file
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            <Upload className="h-4 w-4" />
            {videoSrc ? "Change Video" : "Upload Video"}
          </Button>

          {videoSrc && (
            <>
              {!isPlaying ? (
                <Button
                  onClick={handlePlay}
                  disabled={!modelsLoaded || !isVideoReady || !!videoError}
                  className="flex-1"
                >
                  <Play className="h-4 w-4" />
                  Play & Detect
                </Button>
              ) : (
                <Button
                  onClick={handlePause}
                  variant="secondary"
                  className="flex-1"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
              )}
            </>
          )}
        </div>

        {!modelsLoaded && videoSrc && (
          <p className="text-sm text-muted-foreground text-center">
            Please wait for models to load before playing...
          </p>
        )}

        {modelsLoaded && videoSrc && !isVideoReady && !videoError && (
          <p className="text-sm text-muted-foreground text-center">
            Loading video...
          </p>
        )}

        {/* Stats Bar */}
        {stats && (
          <div className="p-4 bg-white rounded-lg border">
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Faces Detected:</span>
                <span className="font-bold text-lg">{stats.totalFaces}</span>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Recognized:</span>
                <span className="font-bold text-lg text-green-600">
                  {stats.recognized}
                </span>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Unknown:</span>
                <span className="font-bold text-lg text-red-600">
                  {stats.unknown}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
