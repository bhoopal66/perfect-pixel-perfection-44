import { format } from 'date-fns';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ActivityAction } from '@/hooks/use-activity-log';

const ACTION_OPTIONS: { value: ActivityAction | 'all'; label: string }[] = [
  { value: 'all', label: 'All actions' },
  { value: 'member_invited', label: 'Invited' },
  { value: 'invitation_cancelled', label: 'Cancelled invitation' },
  { value: 'member_added', label: 'Added' },
  { value: 'member_removed', label: 'Removed' },
  { value: 'member_reactivated', label: 'Reactivated' },
  { value: 'member_deleted', label: 'Permanently deleted' },
  { value: 'role_changed', label: 'Role changed' },
  { value: 'bulk_role_changed', label: 'Bulk role change' },
  { value: 'bulk_removed', label: 'Bulk removed' },
];

export interface ActivityLogFiltersState {
  actionType: ActivityAction | 'all';
  startDate: Date | undefined;
  endDate: Date | undefined;
}

interface ActivityLogFiltersProps {
  filters: ActivityLogFiltersState;
  onFiltersChange: (filters: ActivityLogFiltersState) => void;
}

export function ActivityLogFilters({ filters, onFiltersChange }: ActivityLogFiltersProps) {
  const hasActiveFilters = 
    filters.actionType !== 'all' || 
    filters.startDate !== undefined || 
    filters.endDate !== undefined;

  const handleClearFilters = () => {
    onFiltersChange({
      actionType: 'all',
      startDate: undefined,
      endDate: undefined,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <Filter className="h-4 w-4 text-muted-foreground" />
      
      {/* Action Type Filter */}
      <Select
        value={filters.actionType}
        onValueChange={(value) => 
          onFiltersChange({ ...filters, actionType: value as ActivityAction | 'all' })
        }
      >
        <SelectTrigger className="w-[180px] h-8 text-sm">
          <SelectValue placeholder="Filter by action" />
        </SelectTrigger>
        <SelectContent>
          {ACTION_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Start Date Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 justify-start text-left font-normal",
              !filters.startDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-3 w-3" />
            {filters.startDate ? format(filters.startDate, "MMM d, yyyy") : "From"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.startDate}
            onSelect={(date) => onFiltersChange({ ...filters, startDate: date })}
            disabled={(date) => 
              date > new Date() || (filters.endDate ? date > filters.endDate : false)
            }
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* End Date Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 justify-start text-left font-normal",
              !filters.endDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-3 w-3" />
            {filters.endDate ? format(filters.endDate, "MMM d, yyyy") : "To"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.endDate}
            onSelect={(date) => onFiltersChange({ ...filters, endDate: date })}
            disabled={(date) => 
              date > new Date() || (filters.startDate ? date < filters.startDate : false)
            }
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
