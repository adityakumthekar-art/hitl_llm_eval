import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

interface ParamSliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}

export function ParamSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
}: ParamSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-sm text-muted-foreground">{value.toFixed(2)}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([val]) => onChange(val)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  )
}

