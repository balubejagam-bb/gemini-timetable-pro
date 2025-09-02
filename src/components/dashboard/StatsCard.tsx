import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  color?: "default" | "success" | "warning" | "info";
  isLoading?: boolean;
}

export function StatsCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  color = "default",
  isLoading = false
}: StatsCardProps) {
  const colorClasses = {
    default: "border-border",
    success: "border-success/20 bg-success/5",
    warning: "border-warning/20 bg-warning/5",
    info: "border-info/20 bg-info/5"
  };

  const iconClasses = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning",
    info: "text-info"
  };

  return (
    <Card className={`${colorClasses[color]} hover:shadow-md transition-shadow duration-200`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <div className="space-y-2 mt-1">
                <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                {description && <div className="h-3 w-32 bg-muted animate-pulse rounded" />}
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold">{value}</p>
                {description && (
                  <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
              </>
            )}
          </div>
          <div className={`p-2 rounded-lg bg-muted ${iconClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}