'use client';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { HexColorPicker, HexAlphaColorPicker } from 'react-colorful';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  hexToRgb,
  rgbToHsl,
  rgbToHex,
  hslToRgb,
  hexToRgba,
  rgbaToHex,
  rgbaToHsla,
  hslaToRgba,
} from '@/utils/color-converter';
import { z } from 'zod';
import { cn } from '@/utils/ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { PipetteIcon } from 'lucide-react';

export const colorSchema = z
  .string()
  .regex(
    /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/,
    'Color must be a valid hex color (e.g., #FF0000 or #FF0000FF)'
  )
  .transform((val) => val.toUpperCase());

const triggerVariants = cva(
  'border-card border border-2 shadow-none relative overflow-hidden shrink-0 rounded-full ring-1 ring-offset-0 ring-border ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all',
  {
    variants: {
      size: {
        default: 'h-10 w-10',
        sm: 'h-7 w-7',
        xs: 'h-5 w-5',
        lg: 'h-11 w-11',
        xl: 'h-12 w-12',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

interface ColorPickerProps extends VariantProps<typeof triggerVariants> {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  isLoading?: boolean;
  showInput?: boolean;
  error?: string;
  className?: string;
  alpha?: boolean;
}

interface ColorValues {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  rgba?: { r: number; g: number; b: number; a: number };
  hsla?: { h: number; s: number; l: number; a: number };
}

export default function InputColor({
  value,
  onChange,
  onBlur,
  isLoading = false,
  showInput = false,
  error,
  className = 'mt-6',
  alpha = false,
  size,
}: ColorPickerProps) {
  const [colorFormat, setColorFormat] = useState(alpha ? 'HEXA' : 'HEX');
  const [colorValues, setColorValues] = useState<ColorValues>(() => {
    if (alpha) {
      const rgba = hexToRgba(value);
      const hsla = rgbaToHsla(rgba.r, rgba.g, rgba.b, rgba.a);
      return {
        hex: value.length === 9 ? value.slice(0, 7) : value,
        rgb: { r: rgba.r, g: rgba.g, b: rgba.b },
        hsl: rgbToHsl(rgba.r, rgba.g, rgba.b),
        rgba,
        hsla,
      };
    } else {
      const rgb = hexToRgb(value);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      return {
        hex: value,
        rgb,
        hsl,
      };
    }
  });
  // Add a state to store the current HEX/HEXA input value
  const [hexInputValue, setHexInputValue] = useState(value);
  const [hexInputError, setHexInputError] = useState<string | null>(null);

  // Update all color formats when color changes
  const updateColorValues = (newColor: string) => {
    if (alpha) {
      const rgba = hexToRgba(newColor);
      const hsla = rgbaToHsla(rgba.r, rgba.g, rgba.b, rgba.a);
      setColorValues({
        hex: newColor.length === 9 ? newColor.slice(0, 7) : newColor,
        rgb: { r: rgba.r, g: rgba.g, b: rgba.b },
        hsl: rgbToHsl(rgba.r, rgba.g, rgba.b),
        rgba,
        hsla,
      });
      setHexInputValue(newColor.toUpperCase());
    } else {
      const rgb = hexToRgb(newColor);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      setColorValues({
        hex: newColor.toUpperCase(),
        rgb,
        hsl,
      });
      setHexInputValue(newColor.toUpperCase());
    }
  };

  // Handle color picker change
  const handleColorChange = (newColor: string) => {
    updateColorValues(newColor);
    onChange(newColor);
  };

  // Handle HEX input change
  const handleHexChange = (value: string) => {
    let formattedValue = value.toUpperCase();
    if (!formattedValue.startsWith('#')) {
      formattedValue = '#' + formattedValue;
    }

    const maxLength = alpha ? 9 : 7;
    if (
      formattedValue.length <= maxLength &&
      /^#[0-9A-Fa-f]*$/.test(formattedValue)
    ) {
      setHexInputValue(formattedValue); // Always update the input value
      // Update color and color values for any valid partial hex
      onChange(formattedValue);
      updateColorValues(formattedValue);
      try {
        if (formattedValue.length === maxLength) {
          // Only validate when full length
          colorSchema.parse(formattedValue);
          // Already updated above
          setHexInputError(null);
        } else {
          // Not full length, so log
          console.log('Enter a valid color');
          setHexInputError('Enter a valid color');
        }
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          // Do not update color, just keep the input value
          console.log('Enter a valid color');
          setHexInputError('Enter a valid color');
        }
      }
    }
  };

  // Handle RGB input change
  const handleRgbChange = (component: 'r' | 'g' | 'b', value: string) => {
    const numValue = Number.parseInt(value) || 0;
    const clampedValue = Math.max(0, Math.min(255, numValue));
    const newRgb = { ...colorValues.rgb, [component]: clampedValue };
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    const hsl = rgbToHsl(newRgb.r, newRgb.g, newRgb.b);

    setColorValues({ ...colorValues, hex, rgb: newRgb, hsl });
    onChange(hex);
  };

  // Handle RGBA input change
  const handleRgbaChange = (
    component: 'r' | 'g' | 'b' | 'a',
    value: string
  ) => {
    if (!alpha || !colorValues.rgba) return;

    const numValue = Number.parseFloat(value) || 0;
    let clampedValue;

    if (component === 'a') {
      clampedValue = Math.max(0, Math.min(1, numValue));
    } else {
      clampedValue = Math.max(0, Math.min(255, Math.floor(numValue)));
    }

    const newRgba = { ...colorValues.rgba, [component]: clampedValue };
    const hex = rgbaToHex(newRgba.r, newRgba.g, newRgba.b, newRgba.a);
    const hsla = rgbaToHsla(newRgba.r, newRgba.g, newRgba.b, newRgba.a);

    setColorValues({
      ...colorValues,
      hex: hex.slice(0, 7),
      rgb: { r: newRgba.r, g: newRgba.g, b: newRgba.b },
      hsl: rgbToHsl(newRgba.r, newRgba.g, newRgba.b),
      rgba: newRgba,
      hsla,
    });
    onChange(hex);
  };

  // Handle HSL input change
  const handleHslChange = (component: 'h' | 's' | 'l', value: string) => {
    const numValue = Number.parseInt(value) || 0;
    let clampedValue;
    if (component === 'h') {
      clampedValue = Math.max(0, Math.min(360, numValue));
    } else {
      clampedValue = Math.max(0, Math.min(100, numValue));
    }
    const newHsl = { ...colorValues.hsl, [component]: clampedValue };
    const rgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

    setColorValues({ ...colorValues, hex, rgb, hsl: newHsl });
    onChange(hex);
  };

  // Handle HSLA input change
  const handleHslaChange = (
    component: 'h' | 's' | 'l' | 'a',
    value: string
  ) => {
    if (!alpha || !colorValues.hsla) return;

    const numValue = Number.parseFloat(value) || 0;
    let clampedValue;

    if (component === 'a') {
      clampedValue = Math.max(0, Math.min(1, numValue));
    } else if (component === 'h') {
      clampedValue = Math.max(0, Math.min(360, numValue));
    } else {
      clampedValue = Math.max(0, Math.min(100, numValue));
    }

    const newHsla = { ...colorValues.hsla, [component]: clampedValue };
    const rgba = hslaToRgba(newHsla.h, newHsla.s, newHsla.l, newHsla.a);
    const hex = rgbaToHex(rgba.r, rgba.g, rgba.b, rgba.a);

    setColorValues({
      ...colorValues,
      hex: hex.slice(0, 7),
      rgb: { r: rgba.r, g: rgba.g, b: rgba.b },
      hsl: { h: newHsla.h, s: newHsla.s, l: newHsla.l },
      rgba,
      hsla: newHsla,
    });
    onChange(hex);
  };

  // Handle popover close
  const handlePopoverChange = (open: boolean) => {
    if (!open) {
      setColorFormat(alpha ? 'HEXA' : 'HEX');
      onBlur();
    }
  };

  // Check if EyeDropper API is available
  const isEyeDropperAvailable = () => {
    return typeof window !== 'undefined' && 'EyeDropper' in window;
  };

  // Handle eyedropper click
  const handleEyeDropper = async () => {
    if (!isEyeDropperAvailable()) {
      toast.error('Eyedropper not supported', {
        description:
          'The Eyedropper API is not available in your browser. Please try using a different browser.',
      });
      return;
    }
    try {
      // @ts-expect-error - TypeScript doesn't have types for EyeDropper yet
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      const pickedColor = result.sRGBHex;
      updateColorValues(pickedColor);
      onChange(pickedColor);
    } catch {
      console.log('User canceled the eyedropper');
    }
  };

  // Initialize color values on mount and when value changes from outside
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateColorValues(value);
    setHexInputValue(value.toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Get current hex value for display
  const getCurrentHexValue = () => {
    if (colorFormat === 'HEX' || colorFormat === 'HEXA') {
      return hexInputValue;
    }
    if (alpha && colorValues.rgba) {
      return rgbaToHex(
        colorValues.rgba.r,
        colorValues.rgba.g,
        colorValues.rgba.b,
        colorValues.rgba.a
      );
    }
    return colorValues.hex;
  };

  return (
    <div className={cn(className)}>
      <div className="flex items-center gap-4">
        <Popover onOpenChange={handlePopoverChange}>
          <PopoverTrigger asChild>
            <Button
              className={cn(triggerVariants({ size }))}
              size={'icon'}
              style={{ backgroundColor: hexInputValue }}
            >
              {alpha && colorValues.rgba && colorValues.rgba.a < 1 && (
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `linear-gradient(45deg, #ccc 25%, transparent 25%), 
                                    linear-gradient(-45deg, #ccc 25%, transparent 25%), 
                                    linear-gradient(45deg, transparent 75%, #ccc 75%), 
                                    linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
                    backgroundSize: '8px 8px',
                    backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                  }}
                />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="color-picker space-y-3">
              <div className="relative">
                {alpha ? (
                  <HexAlphaColorPicker
                    className="!aspect-square !h-[244.79px] !w-[244.79px]"
                    color={value}
                    onChange={handleColorChange}
                  />
                ) : (
                  <HexColorPicker
                    className="!aspect-square !h-[244.79px] !w-[244.79px]"
                    color={value}
                    onChange={handleColorChange}
                  />
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="flex items-center gap-1 bg-transparent hover:bg-transparent"
                  onClick={handleEyeDropper}
                  disabled={!isEyeDropperAvailable()}
                  icon={PipetteIcon}
                ></Button>
                <Select value={colorFormat} onValueChange={setColorFormat}>
                  <SelectTrigger className="h-[2.35rem] !w-[4.8rem] rounded-md py-1 !text-sm">
                    <SelectValue placeholder="Color" />
                  </SelectTrigger>
                  <SelectContent className="min-w-20">
                    {alpha ? (
                      <>
                        <SelectItem value="HEXA" className="h-7 text-sm">
                          HEXA
                        </SelectItem>
                        <SelectItem value="RGBA" className="h-7 text-sm">
                          RGBA
                        </SelectItem>
                        <SelectItem value="HSLA" className="h-7 text-sm">
                          HSLA
                        </SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="HEX" className="h-7 text-sm">
                          HEX
                        </SelectItem>
                        <SelectItem value="RGB" className="h-7 text-sm">
                          RGB
                        </SelectItem>
                        <SelectItem value="HSL" className="h-7 text-sm">
                          HSL
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                {colorFormat === 'HEX' || colorFormat === 'HEXA' ? (
                  <Input
                    size="sm"
                    className="w-[115px] rounded-md text-sm"
                    value={getCurrentHexValue()}
                    onChange={(e) => handleHexChange(e.target.value)}
                    placeholder={alpha ? '#FF0000FF' : '#FF0000'}
                    maxLength={alpha ? 9 : 7}
                  />
                ) : colorFormat === 'RGB' ? (
                  <div className="flex items-center">
                    <Input
                      size="sm"
                      className="w-13 rounded-l-sm rounded-r-none text-center text-sm"
                      value={colorValues.rgb.r}
                      onChange={(e) => handleRgbChange('r', e.target.value)}
                      placeholder="255"
                      maxLength={3}
                    />
                    <Input
                      size="sm"
                      className="w-13 rounded-none border-x-0 text-center text-sm"
                      value={colorValues.rgb.g}
                      onChange={(e) => handleRgbChange('g', e.target.value)}
                      placeholder="255"
                      maxLength={3}
                    />
                    <Input
                      size="sm"
                      className="w-13 rounded-l-none rounded-r-sm text-center text-sm"
                      value={colorValues.rgb.b}
                      onChange={(e) => handleRgbChange('b', e.target.value)}
                      placeholder="255"
                      maxLength={3}
                    />
                  </div>
                ) : colorFormat === 'RGBA' && alpha && colorValues.rgba ? (
                  <div className="flex items-center">
                    <Input
                      size="sm"
                      className="w-10 rounded-l-sm rounded-r-none px-1 text-center text-sm"
                      value={colorValues.rgba.r}
                      onChange={(e) => handleRgbaChange('r', e.target.value)}
                      placeholder="255"
                      maxLength={3}
                    />
                    <Input
                      size="sm"
                      className="w-10 rounded-none border-x-0 px-1 text-center text-sm"
                      value={colorValues.rgba.g}
                      onChange={(e) => handleRgbaChange('g', e.target.value)}
                      placeholder="255"
                      maxLength={3}
                    />
                    <Input
                      size="sm"
                      className="w-10 rounded-none border-x-0 px-1 text-center text-sm"
                      value={colorValues.rgba.b}
                      onChange={(e) => handleRgbaChange('b', e.target.value)}
                      placeholder="255"
                      maxLength={3}
                    />
                    <Input
                      size="sm"
                      className="w-10 rounded-l-none rounded-r-sm px-1 text-center text-sm"
                      value={colorValues.rgba.a.toFixed(2)}
                      onChange={(e) => handleRgbaChange('a', e.target.value)}
                      placeholder="1.00"
                      maxLength={4}
                    />
                  </div>
                ) : colorFormat === 'HSL' ? (
                  <div className="flex items-center">
                    <Input
                      size="sm"
                      className="w-13 rounded-l-sm rounded-r-none text-center text-sm"
                      value={colorValues.hsl.h}
                      onChange={(e) => handleHslChange('h', e.target.value)}
                      placeholder="360"
                      maxLength={3}
                    />
                    <Input
                      size="sm"
                      className="w-13 rounded-none border-x-0 text-center text-sm"
                      value={colorValues.hsl.s}
                      onChange={(e) => handleHslChange('s', e.target.value)}
                      placeholder="100"
                      maxLength={3}
                    />
                    <Input
                      size="sm"
                      className="w-13 rounded-l-none rounded-r-sm text-center text-sm"
                      value={colorValues.hsl.l}
                      onChange={(e) => handleHslChange('l', e.target.value)}
                      placeholder="100"
                      maxLength={3}
                    />
                  </div>
                ) : colorFormat === 'HSLA' && alpha && colorValues.hsla ? (
                  <div className="flex items-center">
                    <Input
                      size="sm"
                      className="w-10 rounded-l-sm rounded-r-none px-1 text-center text-sm"
                      value={colorValues.hsla.h}
                      onChange={(e) => handleHslaChange('h', e.target.value)}
                      placeholder="360"
                      maxLength={3}
                    />
                    <Input
                      className="h-7 w-10 rounded-none border-x-0 px-1 text-center text-sm"
                      value={colorValues.hsla.s}
                      onChange={(e) => handleHslaChange('s', e.target.value)}
                      placeholder="100"
                      maxLength={3}
                    />
                    <Input
                      className="h-7 w-10 rounded-none border-x-0 px-1 text-center text-sm"
                      value={colorValues.hsla.l}
                      onChange={(e) => handleHslaChange('l', e.target.value)}
                      placeholder="100"
                      maxLength={3}
                    />
                    <Input
                      className="h-7 w-10 rounded-l-none rounded-r-sm px-1 text-center text-sm"
                      value={colorValues.hsla.a.toFixed(2)}
                      onChange={(e) => handleHslaChange('a', e.target.value)}
                      placeholder="1.00"
                      maxLength={4}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        {showInput && (
          <div className="relative flex-1 sm:flex-none">
            <Input
              value={getCurrentHexValue()}
              onChange={(e) => handleHexChange(e.target.value)}
              onBlur={onBlur}
              size={size === 'xl' ? 'lg' : size!}
              className={cn(
                'uppercase',
                error ? 'border-destructive' : '',
                size === 'xl' && 'h-12'
              )}
            />
            {isLoading && (
              <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                <Spinner variant="ring" className="h-5 w-5" />
              </span>
            )}
          </div>
        )}
      </div>
      {error && <p className="text-destructive mt-1.5 text-sm">{error}</p>}
      {hexInputError && (
        <p className="text-destructive mt-1.5 text-sm">{hexInputError}</p>
      )}
    </div>
  );
}
