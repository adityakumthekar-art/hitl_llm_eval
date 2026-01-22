import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface ParamSelectProps<T extends string> {
  label: string
  value: T | null
  options: { label: string; value: T }[]
  onChange: (value: T | null) => void
  placeholder?: string
}

export function ParamSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Select...",
}: ParamSelectProps<T>) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Select
        value={value ?? "all"}
        onValueChange={(val) => onChange(val === "all" ? null : (val as T))}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

