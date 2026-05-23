"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  extractFaceDescriptor,
  generateThumbnail,
  type RegisteredFace,
} from "@/lib/face-api";
import { Upload, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";

interface FaceRegistrationProps {
  onFaceRegistered: (face: RegisteredFace) => void;
  disabled?: boolean;
}

export function FaceRegistration({
  onFaceRegistered,
  disabled,
}: FaceRegistrationProps) {
  const [name, setName] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setStatus({ type: "error", message: "Please select an image file" });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
        setStatus({ type: null, message: "" });
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleRegister = useCallback(async () => {
    if (!name.trim()) {
      setStatus({ type: "error", message: "Please enter a name" });
      return;
    }

    if (!imagePreview || !imageRef.current) {
      setStatus({ type: "error", message: "Please select an image" });
      return;
    }

    setIsProcessing(true);
    setStatus({ type: null, message: "" });

    try {
      const result = await extractFaceDescriptor(imageRef.current);

      if (!result) {
        setStatus({
          type: "error",
          message: "No face detected in the image. Please try another photo.",
        });
        setIsProcessing(false);
        return;
      }

      const thumbnail = generateThumbnail(imageRef.current, result.box);

      const newFace: RegisteredFace = {
        id: crypto.randomUUID(),
        name: name.trim(),
        descriptor: Array.from(result.descriptor),
        thumbnail,
        createdAt: new Date().toISOString(),
        enabled: true,
      };

      onFaceRegistered(newFace);

      setName("");
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setStatus({ type: "success", message: `${name} registered successfully!` });
    } catch (error) {
      console.error("Error registering face:", error);
      setStatus({
        type: "error",
        message: "Failed to process the image. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [name, imagePreview, onFaceRegistered]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Register New Face
        </CardTitle>
        <CardDescription>
          Upload a clear photo of a person to register their face
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="Enter person's name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled || isProcessing}
          />
        </div>

        <div className="space-y-2">
          <Label>Photo</Label>
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <div className="relative">
                <img
                  ref={imageRef}
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-48 mx-auto rounded-md"
                  crossOrigin="anonymous"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Click to change photo
                </p>
              </div>
            ) : (
              <div className="py-8">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload a photo
                </p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isProcessing}
          />
        </div>

        {status.type && (
          <div
            className={`flex items-center gap-2 text-sm p-3 rounded-md ${
              status.type === "error"
                ? "bg-red-500/10 text-red-600"
                : "bg-green-500/10 text-green-600"
            }`}
          >
            {status.type === "error" ? (
              <AlertCircle className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
            {status.message}
          </div>
        )}

        <Button
          onClick={handleRegister}
          disabled={disabled || isProcessing || !name.trim() || !imagePreview}
          className="w-full"
        >
          {isProcessing ? "Processing..." : "Register Face"}
        </Button>
      </CardContent>
    </Card>
  );
}
