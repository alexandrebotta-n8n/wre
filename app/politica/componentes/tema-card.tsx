// Card de tema usado no hub /politica.
import Link from "next/link";
import {
  Compass,
  Users,
  TrendingUp,
  MapPin,
  UserPlus,
  Landmark,
  Layers,
  PieChart,
  Scale,
  LogOut,
  Globe,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { TemaPolitica, IconeKey } from "../conteudo/temas";

const ICONES: Record<IconeKey, React.ComponentType<{ className?: string }>> = {
  compass: Compass,
  users: Users,
  "trending-up": TrendingUp,
  "map-pin": MapPin,
  "user-plus": UserPlus,
  landmark: Landmark,
  layers: Layers,
  "pie-chart": PieChart,
  scale: Scale,
  "log-out": LogOut,
  globe: Globe,
  "check-circle": CheckCircle,
};

export function TemaCard({ tema }: { tema: TemaPolitica }) {
  const Icone = ICONES[tema.icone] ?? Layers;
  return (
    <Link href={`/politica/${tema.slug}`} className="group block">
      <Card className="h-full p-5 hover:border-peri-400 hover:shadow-md transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="h-10 w-10 rounded-lg bg-peri-50 text-peri-700 inline-flex items-center justify-center group-hover:bg-peri-100 transition-colors">
            <Icone className="h-5 w-5" />
          </div>
          <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-peri-600 group-hover:translate-x-0.5 transition-all" />
        </div>
        <h3 className="mt-3 font-semibold text-navy-900 text-base">{tema.titulo}</h3>
        <p className="mt-1 text-sm text-neutral-600 leading-snug">{tema.resumoCurto}</p>
        <div className="mt-3 pt-3 border-t border-neutral-100">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
            {tema.refLabel}
          </span>
        </div>
      </Card>
    </Link>
  );
}
