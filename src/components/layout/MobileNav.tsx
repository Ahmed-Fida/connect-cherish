import { Link, useLocation } from 'react-router-dom';
import { Home, PlusCircle, FileText, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface MobileNavProps {
  className?: string;
}

export function MobileNav({ className }: MobileNavProps) {
  const location = useLocation();
  const { role } = useAuth();

  const studentLinks = [
    { href: '/', icon: Home, label: 'Feed' },
    { href: '/create', icon: PlusCircle, label: 'Post' },
    { href: '/my-posts', icon: FileText, label: 'My Posts' },
  ];

  const adminLinks = [
    { href: '/admin', icon: Shield, label: 'Dashboard' },
    { href: '/', icon: Home, label: 'Feed' },
  ];

  const links = role === 'admin' ? adminLinks : studentLinks;

  return (
    <nav className={cn('fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden', className)}>
      <div className="flex items-center justify-around py-2">
        {links.map((link) => {
          const isActive = location.pathname === link.href;
          return (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <link.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}