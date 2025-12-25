import { useEffect, useState } from 'react';
import { MapPin, Search } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/80 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-pulse delay-500" />
        <div className="absolute top-1/3 right-1/4 h-40 w-40 rounded-full bg-white/5 blur-2xl animate-pulse delay-300" />
      </div>

      {/* Logo and content */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Animated icon */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-white/30" style={{ animationDuration: '2s' }} />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30 shadow-2xl">
            <div className="flex items-center justify-center">
              <MapPin className="h-10 w-10 text-white animate-bounce" style={{ animationDuration: '1.5s' }} />
              <Search className="h-8 w-8 text-white/90 -ml-3 animate-pulse" />
            </div>
          </div>
        </div>

        {/* App name */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white tracking-tight drop-shadow-lg">
            FoundIt!
          </h1>
          <p className="mt-2 text-lg text-white/80 font-medium">
            Campus Lost & Found
          </p>
        </div>

        {/* Loading indicator */}
        <div className="mt-8 flex gap-2">
          <div className="h-2 w-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="h-2 w-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="h-2 w-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      {/* Bottom tagline */}
      <p className="absolute bottom-8 text-white/60 text-sm font-medium">
        Reuniting you with your belongings
      </p>
    </div>
  );
};

export default SplashScreen;
