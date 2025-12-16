import { Search, Menu, LogOut, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenu?: boolean;
}

export function Header({ onMenuClick, showMenu }: HeaderProps) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const getInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          {showMenu && (
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
              <Search className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-extrabold text-xl hidden sm:inline bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
              FoundIt!
            </span>
          </Link>
          {role && (
            <Badge 
              className={role === 'admin' 
                ? 'gradient-primary text-primary-foreground border-0 shadow-md' 
                : 'bg-accent/20 text-accent border-accent/30'
              }
            >
              {role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
              {role}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-primary/20 hover:ring-primary/50 transition-all">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="gradient-primary text-primary-foreground font-bold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 glass" align="end" forceMount>
              <div className="flex items-center gap-2 p-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold">{user?.email}</p>
                  <Badge variant="outline" className="w-fit text-xs capitalize">
                    {role} Account
                  </Badge>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/my-posts" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4 text-primary" />
                  My Posts
                </Link>
              </DropdownMenuItem>
              {role === 'admin' && (
                <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                  <Shield className="mr-2 h-4 w-4 text-primary" />
                  Admin Dashboard
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}