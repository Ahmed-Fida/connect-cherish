import { Item, CATEGORY_LABELS, STATUS_LABELS } from '@/types/database';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Eye, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ItemCardProps {
  item: Item;
  onView?: () => void;
  onClaim?: () => void;
  showClaimButton?: boolean;
}

export function ItemCard({ item, onView, onClaim, showClaimButton }: ItemCardProps) {
  const isLost = item.type === 'lost';
  const isResolved = item.status === 'claimed' || item.status === 'resolved';

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-300 cursor-pointer group card-hover border-0 shadow-md',
        isResolved && 'opacity-70'
      )}
      onClick={onView}
    >
      <div className="relative overflow-hidden">
        {item.image_urls && item.image_urls.length > 0 ? (
          <img
            src={item.image_urls[0]}
            alt={item.title}
            className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className={cn(
            'w-full h-48 flex items-center justify-center',
            isLost ? 'bg-gradient-to-br from-lost/20 to-orange-500/20' : 'bg-gradient-to-br from-found/20 to-accent/20'
          )}>
            <Eye className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge
            className={cn(
              'font-bold shadow-lg',
              isLost
                ? 'gradient-lost text-white border-0'
                : 'gradient-found text-white border-0'
            )}
          >
            {isLost ? '🔍 Lost' : '✨ Found'}
          </Badge>
          {isResolved && (
            <Badge variant="secondary" className="font-semibold bg-background/90 backdrop-blur-sm">
              {STATUS_LABELS[item.status]}
            </Badge>
          )}
        </div>

        {item.image_urls && item.image_urls.length > 1 && (
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
              +{item.image_urls.length - 1} 📷
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <Badge variant="outline" className="shrink-0 border-primary/30 text-primary">
            {CATEGORY_LABELS[item.category]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-lost" />
            <span className="line-clamp-1">{item.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-found" />
            <span>{format(new Date(item.item_date), 'MMM d')}</span>
          </div>
        </div>

        {showClaimButton && !isLost && !isResolved && (
          <Button
            size="sm"
            className="w-full mt-2 gradient-accent btn-bounce shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              onClaim?.();
            }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Claim This Item
          </Button>
        )}
      </CardContent>
    </Card>
  );
}