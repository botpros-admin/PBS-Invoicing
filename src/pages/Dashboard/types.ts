import { DateRange } from '../../types'; // Assuming DateRange is defined in src/types

export interface WidgetConfig {
  dateRange: DateRange;
  chartType?: 'bar' | 'line' | 'pie';
  dataSource?: 'aging' | 'status' | 'clients' | 'volume' | 'labs' | 'custom';
  aggregation?: 'sum' | 'average' | 'count';
  calculation?: string;
  comparison?: 'previous_period' | 'same_period_last_year';
  threshold?: number;
  color?: string; // Hex color for widget theme (default: #0078D7)
  customSettings?: Record<string, unknown>;
}

export interface Widget {
  id: string;
  type: 'stat' | 'chart' | 'table';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: number;
  config: WidgetConfig;
}
