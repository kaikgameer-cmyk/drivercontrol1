import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DatePreset,
  DATE_PRESET_OPTIONS,
  getDateRangeFromPreset,
} from "@/hooks/useDateFilterPresets";

interface GlobalDateFilterProps {
  preset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  customRange?: DateRange;
  onCustomRangeChange?: (range: DateRange | undefined) => void;
  className?: string;
}

/**
 * Componente reutilizável de filtro de datas global
 * Pode ser usado em Dashboard, Lançamentos, Combustível, Cartões, etc.
 */
export function GlobalDateFilter({
  preset,
  onPresetChange,
  customRange,
  onCustomRangeChange,
  className,
}: GlobalDateFilterProps) {
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  // Track the temporary selection while user is picking dates
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(customRange);

  const currentLabel = DATE_PRESET_OPTIONS.find((o) => o.value === preset)?.label || "Período";
  
  // Get the actual date range for display
  const displayRange = preset === "custom" && customRange?.from
    ? customRange
    : getDateRangeFromPreset(preset);

  const handlePresetClick = (newPreset: DatePreset) => {
    if (newPreset === "custom") {
      // Initialize temp range with current custom range or undefined
      setTempRange(customRange);
      setCalendarOpen(true);
    } else {
      onPresetChange(newPreset);
    }
  };

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    // Always update the temporary range to show selection feedback
    setTempRange(range);
    
    // Only apply and close when both dates are selected
    if (range?.from && range?.to) {
      onCustomRangeChange?.(range);
      onPresetChange("custom");
      setCalendarOpen(false);
    }
  };

  // Reset temp range when calendar closes without completing selection
  const handleCalendarOpenChange = (open: boolean) => {
    setCalendarOpen(open);
    if (!open) {
      // Reset temp range when closing
      setTempRange(customRange);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Preset Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 min-w-[140px] justify-between">
            <span className="truncate">{currentLabel}</span>
            <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-popover">
          {DATE_PRESET_OPTIONS.filter((o) => o.value !== "custom").map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handlePresetClick(option.value)}
              className={cn(
                "cursor-pointer",
                preset === option.value && "bg-primary/10 text-primary"
              )}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handlePresetClick("custom")}
            className={cn(
              "cursor-pointer",
              preset === "custom" && "bg-primary/10 text-primary"
            )}
          >
            Personalizado...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Date Range Display / Custom Picker */}
      <Popover open={calendarOpen} onOpenChange={handleCalendarOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal min-w-[200px] sm:min-w-[260px]",
              !displayRange?.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {displayRange?.from ? (
                displayRange.to ? (
                  <>
                    {format(displayRange.from, "dd/MM/yy", { locale: ptBR })} - {" "}
                    {format(displayRange.to, "dd/MM/yy", { locale: ptBR })}
                  </>
                ) : (
                  format(displayRange.from, "dd/MM/yyyy", { locale: ptBR })
                )
              ) : (
                "Selecione o período"
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end" sideOffset={4}>
          <div className="p-3 border-b border-border">
            <p className="text-sm text-muted-foreground">
              {tempRange?.from && !tempRange?.to
                ? "Selecione a data final"
                : "Selecione o período desejado"}
            </p>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={displayRange?.from}
            selected={tempRange}
            onSelect={handleCustomRangeSelect}
            numberOfMonths={2}
            locale={ptBR}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
