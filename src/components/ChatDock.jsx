import React from 'react';
import { X, ChevronUp, ChevronDown, Minimize2, Maximize2, MoreHorizontal, Edit } from 'lucide-react';

const ChatDock = ({ 
  isOpen, 
  onToggle, 
  onClose, 
  isLoading, 
  children 
}) => {
  return (
    <div 
      className={`fixed bottom-0 right-4 z-[100] transition-all duration-300 ease-in-out shadow-2xl bg-white rounded-t-xl flex flex-col border border-gray-200`}
      style={{
        width: '380px',
        height: isOpen ? '500px' : '56px',
        transform: 'translateY(0)',
        boxShadow: "0 -4px 20px rgba(0,0,0,0.1)"
      }}
    >
      {/* Dock Header */}
      <div 
        onClick={onToggle}
        className="flex items-center justify-between px-4 py-3 cursor-pointer bg-amber-400 hover:bg-amber-500 transition-colors h-14 rounded-t-xl"
      >
        <div className="flex items-center gap-3">
          {/* Avatar with Online Status */}
          <div className="relative">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-100 shadow-sm flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200">
              <img
                src="/infinity-symbol.svg"
                alt="AI"
                className="w-5 h-5 opacity-80"
                style={{ filter: "brightness(0.5) sepia(1) hue-rotate(5deg)" }}
              />
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-semibold text-gray-800 leading-normal">Astrologer Assistant</span>
            <span className="text-xs text-green-600 font-medium leading-normal flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-[pulse_2s_infinite]"></span>
              Online
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* LinkedIn style icons */}
          <button 
            className="p-1.5 hover:bg-amber-300 rounded-full text-gray-800 transition-colors"
            onClick={(e) => { e.stopPropagation(); /* Menu action */ }}
          >
            <MoreHorizontal size={16} />
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="p-1.5 hover:bg-amber-300 rounded-full text-gray-800 transition-colors"
          >
            {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* Dock Body - Always render to preserve state, hidden by height/overflow when closed */}
      <div 
        className={`flex-1 overflow-hidden bg-gray-50 relative flex flex-col ${!isOpen ? 'invisible' : 'visible'}`}
      >
        {children}
      </div>
    </div>
  );
};

export default ChatDock;
