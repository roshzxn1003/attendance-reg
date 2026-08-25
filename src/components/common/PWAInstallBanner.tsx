import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share2, PlusSquare } from 'lucide-react';
import { promptPWAInstall, subscribeToInstallPrompt, isAppRunningAsPWA, isIOSDevice } from '../../lib/pwaRegister';
import { Button } from './Button';
import { Badge } from './Badge';

export const PWAInstallBanner: React.FC = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);

  useEffect(() => {
    if (isAppRunningAsPWA()) {
      setInstalled(true);
      return;
    }

    setIsIOS(isIOSDevice());

    const unsubscribe = subscribeToInstallPrompt((installable) => {
      setCanInstall(installable);
    });

    return () => unsubscribe();
  }, []);

  if (installed || isDismissed) {
    return null;
  }

  // If on Android/Desktop with native prompt
  if (canInstall) {
    return (
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-3 border-b border-blue-800 shadow-md relative z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black tracking-wide uppercase text-blue-300">
                  📱 Install SPIHER Attendance App
                </span>
                <Badge variant="success" size="sm" className="text-[10px] uppercase font-bold py-0.5">
                  100% Offline Ready
                </Badge>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Install as a native app on your phone or PC. Mark attendance instantly in classrooms without internet!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={async () => {
                const res = await promptPWAInstall();
                if (res === 'accepted') {
                  setInstalled(true);
                }
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-4 py-2 rounded-xl shadow-sm gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Install App</span>
            </Button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If on iOS (Safari Add to Home Screen banner)
  if (isIOS && !showIOSTip) {
    return (
      <div className="bg-slate-900 text-white px-4 py-2.5 border-b border-slate-800 shadow-md relative z-40 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-slate-200">
              Install on iPhone/iPad: Tap <Share2 className="w-3.5 h-3.5 inline mx-1 text-blue-400" /> then <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-blue-400" />
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowIOSTip(true)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
