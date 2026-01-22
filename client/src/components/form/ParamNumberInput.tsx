import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ParamNumberInputProps {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  placeholder?: string
  min?: number
  max?: number
  step?: number
}

export function ParamNumberInput({
  label,
  value,
  onChange,
  placeholder = "Enter value...",
  min,
  max,
  step = 1,
}: ParamNumberInputProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const val = e.target.value
          if (val === "") {
            onChange(null)
          } else {
            const num = step === 1 ? parseInt(val, 10) : parseFloat(val)
            if (!isNaN(num)) {
              onChange(num)
            }
          }
        }}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
      />
    </div>
  )
}

