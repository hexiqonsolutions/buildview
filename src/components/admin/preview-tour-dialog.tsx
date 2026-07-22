"use client";

import { useState, type ReactNode } from "react";
import { Eye } from "lucide-react";
import { MatterportViewer } from "@/components/projects/MatterportViewer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PreviewTourDialogProps {
  name: string;
  matterportUrl: string;
  trigger?: ReactNode;
}

export function PreviewTourDialog({ name, matterportUrl, trigger }: PreviewTourDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Eye className="mr-1.5 h-4 w-4" />
            Preview
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
        </DialogHeader>
        <MatterportViewer url={matterportUrl} title={name} aspectRatio showToolbar />
      </DialogContent>
    </Dialog>
  );
}
