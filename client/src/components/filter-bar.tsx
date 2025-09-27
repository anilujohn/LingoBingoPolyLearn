import { useMemo } from "react";
import { formatISO } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterValues {
  languageId?: string;
  modelId?: string;
  start?: string;
  end?: string;
}

interface FilterBarProps {
  languages: FilterOption[];
  models: FilterOption[];
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
  onReset: () => void;
}

export function FilterBar({ languages, models, filters, onChange, onReset }: FilterBarProps) {
  const today = useMemo(() => formatISO(new Date(), { representation: "date" }), []);

  const ALL_VALUE = "all";

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 flex-1">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Language</p>
          <Select
            value={filters.languageId ?? ALL_VALUE}
            onValueChange={(value) =>
              onChange({
                ...filters,
                languageId: value === ALL_VALUE ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All languages" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-50 border bg-white shadow-lg">
              <SelectItem value={ALL_VALUE}>All languages</SelectItem>
              {languages.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">Model</p>
          <Select
            value={filters.modelId ?? ALL_VALUE}
            onValueChange={(value) =>
              onChange({
                ...filters,
                modelId: value === ALL_VALUE ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All models" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-50 border bg-white shadow-lg">
              <SelectItem value={ALL_VALUE}>All models</SelectItem>
              {models.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">Start Date</p>
          <Input
            type="date"
            max={today}
            value={filters.start ?? ""}
            onChange={(event) => onChange({ ...filters, start: event.target.value || undefined })}
          />
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">End Date</p>
          <Input
            type="date"
            max={today}
            value={filters.end ?? ""}
            onChange={(event) => onChange({ ...filters, end: event.target.value || undefined })}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
