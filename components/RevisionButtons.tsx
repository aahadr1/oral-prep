'use client';

import React from 'react';
import type { RevisionResponse } from '@/lib/types';

interface RevisionButtonsProps {
  onResponse: (response: RevisionResponse) => void;
  disabled?: boolean;
  className?: string;
}

export default function RevisionButtons({ onResponse, disabled = false, className = "" }: RevisionButtonsProps) {
  const buttons = [
    {
      response: 'again' as RevisionResponse,
      label: 'Again',
      description: 'Je ne savais pas',
      color: 'bg-red-500 hover:bg-red-600 focus:ring-red-300',
      shortcut: '1',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    },
    {
      response: 'hard' as RevisionResponse,
      label: 'Hard',
      description: 'Difficile, avec hésitation',
      color: 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-300',
      shortcut: '2',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    },
    {
      response: 'good' as RevisionResponse,
      label: 'Good',
      description: 'Bien répondu',
      color: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-300',
      shortcut: '3',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    {
      response: 'easy' as RevisionResponse,
      label: 'Easy',
      description: 'Très facile',
      color: 'bg-green-500 hover:bg-green-600 focus:ring-green-300',
      shortcut: '4',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    }
  ];

  // Gestionnaire pour les raccourcis clavier
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (disabled) return;
      
      const key = event.key;
      const button = buttons.find(b => b.shortcut === key);
      
      if (button) {
        event.preventDefault();
        onResponse(button.response);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [disabled, onResponse]);

  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      {/* Instructions */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Comment avez-vous trouvé cette question ?
        </h3>
        <p className="text-sm text-gray-600">
          Utilisez les boutons ci-dessous ou les touches <span className="font-mono bg-gray-100 px-1 rounded">1-4</span>
        </p>
      </div>

      {/* Boutons de réponse */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {buttons.map((button) => (
          <button
            key={button.response}
            onClick={() => onResponse(button.response)}
            disabled={disabled}
            className={`
              relative flex flex-col items-center justify-center p-4 rounded-lg text-white font-medium
              transition-all duration-200 transform
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
              ${button.color}
              focus:outline-none focus:ring-4 focus:ring-opacity-50
              shadow-lg hover:shadow-xl
            `}
            title={button.description}
          >
            {/* Raccourci clavier */}
            <span className="absolute top-2 right-2 text-xs bg-white bg-opacity-20 rounded px-1">
              {button.shortcut}
            </span>
            
            {/* Icône */}
            <div className="mb-2">
              {button.icon}
            </div>
            
            {/* Label */}
            <span className="text-sm font-semibold">{button.label}</span>
            
            {/* Description */}
            <span className="text-xs opacity-90 text-center mt-1 leading-tight">
              {button.description}
            </span>
          </button>
        ))}
      </div>

      {/* Légende des couleurs */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="font-semibold mb-2">💡 Guide de sélection :</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div><span className="inline-block w-3 h-3 bg-red-500 rounded mr-2"></span>Again : Revoir très vite</div>
            <div><span className="inline-block w-3 h-3 bg-orange-500 rounded mr-2"></span>Hard : Petit espacement</div>
            <div><span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>Good : Espacement moyen</div>
            <div><span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>Easy : Grand espacement</div>
          </div>
          <div className="text-center text-gray-500 mt-2 text-xs">
            L&apos;espacement = nombre d&apos;autres questions vues entre les révisions
          </div>
        </div>
      </div>
    </div>
  );
}
