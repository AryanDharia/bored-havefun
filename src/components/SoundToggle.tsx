import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sounds } from '../lib/audio';

export const SoundToggle: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean>(() => sounds.isEnabled());

  const toggle = () => {
    const next = sounds.toggle();
    setEnabled(next);
  };

  return (
    <button
      onClick={toggle}
      title={enabled ? 'Mute sound effects' : 'Unmute sound effects'}
      aria-label="Toggle sound"
      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all border border-transparent hover:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
    >
      {enabled ? (
        <Volume2 className="w-5 h-5 text-emerald-400" />
      ) : (
        <VolumeX className="w-5 h-5 text-slate-500" />
      )}
    </button>
  );
};
