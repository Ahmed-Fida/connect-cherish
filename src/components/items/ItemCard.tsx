import { Item, CATEGORY_LABELS, STATUS_LABELS } from '@/types/database';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Eye } from 'lucide-react';
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
        'overflow-hidden transition-all hover:shadow-lg cursor-pointer group',
        isResolved && 'opacity-70'
      )}
      onClick={onView}
    >
      <div className="relative">
        {item.image_urls && item.image_urls.length > 0 ? (
          <img
            src={item.image_urls[0]}
            alt={item.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-48 bg-muted flex items-center justify-center">
            <Eye className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge
            className={cn(
              'font-semibold',
              isLost
                ? 'bg-lost text-lost-foreground hover:bg-lost/90'
                : 'bg-found text-found-foreground hover:bg-found/90'
            )}
          >
            {isLost ? 'Lost' : 'Found'}
          </Badge>
          {isResolved && (
            <Badge variant="secondary" className="font-semibold">
              {STATUS_LABELS[item.status]}
            </Badge>
          )}
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg line-clamp-1">{item.title}</h3>
          <Badge variant="outline" className="shrink-0">
            {CATEGORY_LABELS[item.category]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="line-clamp-1">{item.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(item.item_date), 'MMM d, yyyy')}</span>
          </div>
        </div>

        {showClaimButton && !isLost && !isResolved && (
          <Button
            size="sm"
            className="w-full mt-2"
            onClick={(e) => {
              e.stopPropagation();
              onClaim?.();
            }}
          >
            Claim This Item
          </Button>
        )}
      </CardContent>
    </Card>
  );
}