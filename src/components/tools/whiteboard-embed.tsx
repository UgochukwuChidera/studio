
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Edit3, Palette, Trash2, Download, Eraser } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTheme } from 'next-themes';

export default function WhiteboardEmbed() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000'); 
  const [lineWidth, setLineWidth] = useState(5);
  const [mode, setMode] = useState<'draw' | 'erase'>('draw'); 
  const { theme: activeTheme, resolvedTheme } = useTheme(); // Use resolvedTheme for consistent background
  const [canvasBgColor, setCanvasBgColor] = useState('rgb(255, 255, 255)');

  const getCanvasContext = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext('2d') : null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Determine background color based on resolved theme
    const currentBgColor = resolvedTheme === 'dark' ? 'rgb(20, 20, 30)' : 'rgb(255, 255, 255)'; // Example dark/light bg
    setCanvasBgColor(currentBgColor);
    
    // Set canvas dimensions based on its container if possible, or defaults
    const parent = canvas.parentElement;
    if (parent && parent.clientWidth > 0) {
        // Attempt to fit within the parent, with some padding
        canvas.width = Math.max(300, parent.clientWidth - 40); // Subtract padding/margins
        canvas.height = Math.min(500, window.innerHeight * 0.5); // Limit height
    } else {
        // Fallback dimensions if parent size is not available
        canvas.width = Math.max(300, window.innerWidth * 0.6); // Smaller default width
        canvas.height = 400; // Default height
    }


    const context = getCanvasContext();
    if (context) {
      context.fillStyle = currentBgColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.lineCap = 'round';
      context.lineJoin = 'round';
    }
  }, [getCanvasContext, resolvedTheme]); // Re-run when resolvedTheme changes


  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const context = getCanvasContext();
    if (!context) return;

    setIsDrawing(true);
    const { offsetX, offsetY } = getCoordinates(event);
    context.beginPath();
    context.moveTo(offsetX, offsetY);
  }, [getCanvasContext]);

  const draw = useCallback((event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const context = getCanvasContext();
    if (!context) return;

    const { offsetX, offsetY } = getCoordinates(event);
    context.strokeStyle = mode === 'draw' ? color : canvasBgColor; 
    context.lineWidth = mode === 'draw' ? lineWidth : lineWidth * 3; 
    context.lineTo(offsetX, offsetY);
    context.stroke();
  }, [isDrawing, color, lineWidth, mode, getCanvasContext, canvasBgColor]);

  const stopDrawing = useCallback(() => {
    const context = getCanvasContext();
    if (!context) return;
    context.closePath();
    setIsDrawing(false);
  }, [getCanvasContext]);

  const getCoordinates = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in event && event.touches.length > 0) { 
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else if ('clientX' in event) { 
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
        return { offsetX: 0, offsetY: 0 };
    }
    return { 
        offsetX: clientX - rect.left, 
        offsetY: clientY - rect.top 
    };
  };

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = getCanvasContext();
    if (canvas && context) {
      context.fillStyle = canvasBgColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [getCanvasContext, canvasBgColor]);

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = 'whiteboard_drawing.png';
      document.body.appendChild(link); // Required for Firefox
      link.click();
      document.body.removeChild(link);
    }
  };
  
  return (
    <Card className="shadow-xl w-full max-w-2xl mx-auto my-4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-primary flex items-center justify-center gap-2">
          <Edit3 className="w-8 h-8" /> Whiteboard
        </CardTitle>
        <CardDescription className="text-center">
          Sketch ideas, solve problems, or just doodle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 p-2 rounded-md bg-muted/60">
          <div className="flex items-center gap-2">
            <Label htmlFor="wb-color-picker"><Palette size={18} /></Label>
            <Input id="wb-color-picker" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-12 h-9 p-0.5 rounded" disabled={mode === 'erase'} />
          </div>
          <div className="flex flex-col items-center gap-1 w-32">
            <Label htmlFor="wb-line-width" className="text-sm">Brush: {lineWidth}px</Label>
            <Slider
              id="wb-line-width"
              min={1}
              max={mode === 'draw' ? 20 : 50} 
              step={1}
              value={[lineWidth]}
              onValueChange={(value) => setLineWidth(value[0])}
              className="w-full"
            />
          </div>
          <Button variant={mode === 'draw' ? 'secondary' : 'outline'} size="sm" onClick={() => setMode('draw')} className="gap-1">
            <Edit3 size={16} /> Draw
          </Button>
          <Button variant={mode === 'erase' ? 'secondary' : 'outline'} size="sm" onClick={() => setMode('erase')} className="gap-1">
            <Eraser size={16} /> Erase
          </Button>
          <Button variant="outline" size="sm" onClick={clearCanvas} className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1">
            <Trash2 size={16} /> Clear
          </Button>
          <Button variant="outline" size="sm" onClick={downloadImage} className="gap-1">
            <Download size={16} /> Save
          </Button>
        </div>

        <div className="flex justify-center items-center border border-input rounded-lg overflow-hidden shadow-inner aspect-[16/10] bg-card">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing} 
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="cursor-crosshair touch-none w-full h-full"
            // Style is set via JS fillRect now
          />
        </div>
      </CardContent>
    </Card>
  );
}
