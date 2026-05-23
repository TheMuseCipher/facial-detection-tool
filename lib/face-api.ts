import * as faceapi from "face-api.js";

export interface RegisteredFace {
  id: string;
  name: string;
  descriptor: number[];
  thumbnail: string;
  createdAt: string;
}

export interface DetectedFace {
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  name: string;
  isRecognized: boolean;
  distance: number;
}

const MODEL_URL = "/facial-detection-tool/models";
let modelsLoaded = false;

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;

  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
}

export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

export async function extractFaceDescriptor(
  imageElement: HTMLImageElement | HTMLCanvasElement
): Promise<{ descriptor: Float32Array; box: faceapi.Box } | null> {
  const detection = await faceapi
    .detectSingleFace(imageElement, new faceapi.SsdMobilenetv1Options())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  return {
    descriptor: detection.descriptor,
    box: detection.detection.box,
  };
}

export function createFaceMatcher(
  registeredFaces: RegisteredFace[],
  threshold: number = 0.6
): faceapi.FaceMatcher | null {
  if (registeredFaces.length === 0) return null;

  const labeledDescriptors = registeredFaces.map((face) => {
    const descriptor = new Float32Array(face.descriptor);
    return new faceapi.LabeledFaceDescriptors(face.name, [descriptor]);
  });

  return new faceapi.FaceMatcher(labeledDescriptors, threshold);
}

export async function detectFacesInFrame(
  videoElement: HTMLVideoElement,
  faceMatcher: faceapi.FaceMatcher | null
): Promise<DetectedFace[]> {
  const detections = await faceapi
    .detectAllFaces(videoElement, new faceapi.SsdMobilenetv1Options())
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.map((detection) => {
    const box = detection.detection.box;

    if (!faceMatcher) {
      return {
        box: {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        },
        name: "Unknown",
        isRecognized: false,
        distance: 1,
      };
    }

    const match = faceMatcher.findBestMatch(detection.descriptor);

    return {
      box: {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      },
      name: match.label === "unknown" ? "Unknown" : match.label,
      isRecognized: match.label !== "unknown",
      distance: match.distance,
    };
  });
}

// LocalStorage helpers
const STORAGE_KEY = "registered-faces";

export function saveRegisteredFaces(faces: RegisteredFace[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(faces));
  }
}

export function loadRegisteredFaces(): RegisteredFace[] {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
  }
  return [];
}

export function generateThumbnail(
  imageElement: HTMLImageElement,
  box: faceapi.Box
): string {
  const canvas = document.createElement("canvas");
  const padding = 40;
  const size = Math.max(box.width, box.height) + padding * 2;

  canvas.width = 100;
  canvas.height = 100;

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const sourceX = Math.max(0, box.x - padding);
  const sourceY = Math.max(0, box.y - padding);
  const sourceWidth = Math.min(size, imageElement.width - sourceX);
  const sourceHeight = Math.min(size, imageElement.height - sourceY);

  ctx.drawImage(
    imageElement,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    100,
    100
  );

  return canvas.toDataURL("image/jpeg", 0.8);
}
