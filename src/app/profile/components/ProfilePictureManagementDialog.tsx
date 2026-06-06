'use client';

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type PointerEvent,
} from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

const CANVAS_SIZE = 320;
const OUTPUT_SIZE = 256;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface ProfilePictureManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Raw data-url of the uploaded image (before cropping) */
  imageSrc: string;
  /** Called with the final cropped base64 data URI */
  onCropComplete: (croppedBase64: string) => void;
  isSaving?: boolean;
}

/**
 * Loads an HTMLImageElement from a src url.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

export function ProfilePictureManagementDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
  isSaving,
}: ProfilePictureManagementDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });

  // Load image when src changes
  useEffect(() => {
    if (!imageSrc) return;
    loadImage(imageSrc).then((img) => {
      imgRef.current = img;
      setZoom(MIN_ZOOM);
      setOffset({ x: 0, y: 0 });
    });
  }, [imageSrc]);

  // Clamp offset so image stays within the crop circle
  const clampOffset = useCallback((ox: number, oy: number, z: number) => {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    // The image is scaled to fit the canvas, then multiplied by zoom
    const scale = (CANVAS_SIZE / Math.min(img.width, img.height)) * z;
    const imgW = img.width * scale;
    const imgH = img.height * scale;
    const maxX = Math.max(0, (imgW - CANVAS_SIZE) / 2);
    const maxY = Math.max(0, (imgH - CANVAS_SIZE) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }, []);

  // Draw the preview onto the canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Scale image so its shorter edge fills the canvas, then apply zoom
    const scale = (CANVAS_SIZE / Math.min(img.width, img.height)) * zoom;
    const imgW = img.width * scale;
    const imgH = img.height * scale;
    const dx = (CANVAS_SIZE - imgW) / 2 + offset.x;
    const dy = (CANVAS_SIZE - imgH) / 2 + offset.y;

    // Draw full image (unclipped) so outside the circle shows dimmed image, not transparent
    ctx.drawImage(img, dx, dy, imgW, imgH);

    // Semi-transparent overlay outside the circle only (evenodd punches circle hole)
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2);
    ctx.fill('evenodd');
    ctx.restore();

    // Circle border
    ctx.beginPath();
    ctx.arc(
      CANVAS_SIZE / 2,
      CANVAS_SIZE / 2,
      CANVAS_SIZE / 2 - 1,
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [zoom, offset]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Pointer drag handlers
  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offset };
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset(
      clampOffset(offsetStart.current.x + dx, offsetStart.current.y + dy, zoom)
    );
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  // Wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      setZoom((prev) => {
        const next = prev - e.deltaY * 0.002;
        const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
        setOffset((o) => clampOffset(o.x, o.y, clamped));
        return clamped;
      });
    },
    [clampOffset]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleZoomChange = (value: number[]) => {
    const newZoom = value[0];
    setZoom(newZoom);
    setOffset((o) => clampOffset(o.x, o.y, newZoom));
  };

  const handleReset = () => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  };

  const handleSave = () => {
    const img = imgRef.current;
    if (!img) return;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = OUTPUT_SIZE;
    outCanvas.height = OUTPUT_SIZE;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    // Reproduce the same transform as the preview, but render at OUTPUT_SIZE
    const ratio = OUTPUT_SIZE / CANVAS_SIZE;
    const scale = (CANVAS_SIZE / Math.min(img.width, img.height)) * zoom;
    const imgW = img.width * scale * ratio;
    const imgH = img.height * scale * ratio;
    const dx = (OUTPUT_SIZE - imgW) / 2 + offset.x * ratio;
    const dy = (OUTPUT_SIZE - imgH) / 2 + offset.y * ratio;

    // Clip to circle
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, dx, dy, imgW, imgH);

    onCropComplete(outCanvas.toDataURL('image/webp', 0.85));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="max-w-sm gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="items-center p-6 pb-3 text-center">
          <DialogTitle className="font-serif text-xl font-medium">
            Adjust Profile Picture
          </DialogTitle>
          <DialogDescription className="text-center">
            Drag to reposition and use the slider to zoom.
          </DialogDescription>
        </DialogHeader>
        {/* Canvas preview */}
        <div className="bg-background flex justify-center px-6 py-3">
          <canvas
            ref={canvasRef}
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
            className="cursor-grab touch-none rounded-lg active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </div>

        {/* Zoom controls */}
        <div className="bg-background flex items-center gap-3 px-8 py-4 pb-6">
          <ZoomOut className="text-muted-foreground h-4 w-4 shrink-0" />
          <Slider
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={[zoom]}
            onValueChange={handleZoomChange}
          />
          <ZoomIn className="text-muted-foreground h-4 w-4 shrink-0" />
        </div>

        <DialogFooter className="bg-card gap-1 rounded-b-lg border-t p-3">
          <Button
            type="button"
            variant="muted"
            className="text-foreground flex-1"
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={handleSave}
            disabled={isSaving}
            loading={isSaving}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
