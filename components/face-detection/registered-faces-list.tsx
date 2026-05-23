"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type RegisteredFace } from "@/lib/face-api";
import { Users, Trash2, UserX } from "lucide-react";

interface RegisteredFacesListProps {
  faces: RegisteredFace[];
  onRemoveFace: (id: string) => void;
  onClearAll: () => void;
}

export function RegisteredFacesList({
  faces,
  onRemoveFace,
  onClearAll,
}: RegisteredFacesListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Registered Faces ({faces.length})
        </CardTitle>
        <CardDescription>
          People in this list will be recognized with green boxes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {faces.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserX className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No faces registered yet</p>
            <p className="text-sm">Upload photos above to register faces</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {faces.map((face) => (
                <div
                  key={face.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <img
                    src={face.thumbnail}
                    alt={face.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-green-500"
                  />
                  <span className="flex-1 font-medium truncate">
                    {face.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemoveFace(face.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove {face.name}</span>
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAll}
              className="w-full text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Clear All Faces
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
