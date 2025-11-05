import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  color?: "default" | "success" | "warning" | "info";
}

export function StatsCard({ title, value, description, icon: Icon, color = "default" }: StatsCardProps) {
  const colorVariants = {
    default: "from-muted/30 to-muted/10 border-muted/30 shadow-card",
    success: "from-success/20 to-success/5 border-success/20 shadow-elegant",
    warning: "from-warning/20 to-warning/5 border-warning/20 shadow-elegant",
    info: "from-info/20 to-info/5 border-info/20 shadow-elegant"
  };

  const iconColorVariants = {
    default: "text-muted-foreground bg-muted/20",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    info: "text-info bg-info/10"
  };

  return (
    <Card className={`bg-gradient-to-br ${colorVariants[color]} border-0 backdrop-blur-sm animate-fade-in hover:shadow-lg hover:scale-105 transition-all duration-300`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text">{value}</p>
            <div className="space-y-1">
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className={`p-4 rounded-xl ${iconColorVariants[color]} backdrop-blur-sm`}>
            <Icon className="h-6 w-6 md:h-7 md:w-7" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}