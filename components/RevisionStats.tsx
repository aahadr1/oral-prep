'use client';

import React from 'react';
import { getCategoryLabel, getCategoryColor } from '@/lib/revision-algorithm';
import type { RevisionStats, QuestionCard } from '@/lib/types';

interface RevisionStatsProps {
  stats: RevisionStats;
  className?: string;
  showDetails?: boolean;
}

interface CategoryCardProps {
  level: number;
  data: {
    count: number;
    avg_streak: number;
    avg_lapses: number;
    questions: QuestionCard[];
  };
  onExpandToggle?: (level: number) => void;
  isExpanded?: boolean;
}

function CategoryCard({ level, data, onExpandToggle, isExpanded = false }: CategoryCardProps) {
  const label = getCategoryLabel(level);
  const colorClass = getCategoryColor(level);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* En-tête de la catégorie */}
      <div 
        className={`p-4 ${colorClass} cursor-pointer`}
        onClick={() => onExpandToggle?.(level)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-lg font-semibold">{label}</div>
            <div className="bg-white bg-opacity-20 rounded-full px-2 py-1 text-sm font-medium">
              {data.count}
            </div>
          </div>
          
          <div className="text-right text-sm">
            <div>Niveau {level}</div>
            {onExpandToggle && (
              <div className="text-xs opacity-75">
                {isExpanded ? '▼' : '▶'} Détails
              </div>
            )}
          </div>
        </div>

        {/* Métriques rapides */}
        <div className="mt-2 flex space-x-4 text-sm opacity-90">
          <div>
            <span className="font-medium">Streak:</span> {data.avg_streak.toFixed(1)}
          </div>
          <div>
            <span className="font-medium">Échecs:</span> {data.avg_lapses.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Détails expansibles */}
      {isExpanded && data.questions.length > 0 && (
        <div className="p-4 border-t bg-gray-50">
          <h4 className="font-medium text-gray-800 mb-3">Questions dans cette catégorie:</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.questions.map((card) => (
              <div key={card.id} className="bg-white rounded p-3 border text-sm">
                <div className="font-medium text-gray-800 mb-1">{card.question}</div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Streak: {card.streak}</span>
                  <span>Échecs: {card.lapses}</span>
                  <span>Prochaine révision: {card.steps_until_due} pas</span>
                  {card.is_leech && (
                    <span className="bg-red-100 text-red-600 px-1 rounded">LEECH</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RevisionStats({ stats, className = "", showDetails = false }: RevisionStatsProps) {
  const [expandedCategories, setExpandedCategories] = React.useState<Set<number>>(new Set());

  const toggleCategory = (level: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(level)) {
      newExpanded.delete(level);
    } else {
      newExpanded.add(level);
    }
    setExpandedCategories(newExpanded);
  };

  // Calculer les pourcentages
  const getPercentage = (count: number) => {
    return stats.total_cards > 0 ? Math.round((count / stats.total_cards) * 100) : 0;
  };

  // Trier les catégories par niveau
  const sortedCategories = Object.entries(stats.categories)
    .map(([level, data]) => ({ level: parseInt(level), data }))
    .sort((a, b) => a.level - b.level);

  if (stats.total_cards === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 text-center ${className}`}>
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-600 mb-2">Aucune donnée de révision</h3>
        <p className="text-gray-500">Créez des cartes de révision pour commencer à voir vos statistiques.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Vue d'ensemble */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Statistiques de révision
        </h2>

        {/* Métriques principales */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">{stats.total_cards}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{stats.new_cards}</div>
            <div className="text-sm text-gray-600">Nouvelles</div>
            <div className="text-xs text-gray-500">{getPercentage(stats.new_cards)}%</div>
          </div>
          
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700">{stats.learning_cards}</div>
            <div className="text-sm text-yellow-700">En apprentissage</div>
            <div className="text-xs text-yellow-600">{getPercentage(stats.learning_cards)}%</div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">{stats.mature_cards}</div>
            <div className="text-sm text-blue-700">Maîtrisées</div>
            <div className="text-xs text-blue-600">{getPercentage(stats.mature_cards)}%</div>
          </div>
          
          {stats.leech_cards > 0 && (
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{stats.leech_cards}</div>
              <div className="text-sm text-red-700">Problématiques</div>
              <div className="text-xs text-red-600">{getPercentage(stats.leech_cards)}%</div>
            </div>
          )}
        </div>

        {/* Barre de progression */}
        <div className="mb-4">
          <div className="flex text-sm text-gray-600 mb-2 justify-between">
            <span>Progression de maîtrise</span>
            <span>{Math.round(((stats.mature_cards) / stats.total_cards) * 100)}% maîtrisé</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div className="h-full flex">
              {stats.new_cards > 0 && (
                <div 
                  className="bg-gray-400"
                  style={{ width: `${getPercentage(stats.new_cards)}%` }}
                  title={`${stats.new_cards} nouvelles cartes`}
                />
              )}
              {stats.learning_cards > 0 && (
                <div 
                  className="bg-yellow-400"
                  style={{ width: `${getPercentage(stats.learning_cards)}%` }}
                  title={`${stats.learning_cards} cartes en apprentissage`}
                />
              )}
              {stats.mature_cards > 0 && (
                <div 
                  className="bg-blue-500"
                  style={{ width: `${getPercentage(stats.mature_cards)}%` }}
                  title={`${stats.mature_cards} cartes maîtrisées`}
                />
              )}
              {stats.leech_cards > 0 && (
                <div 
                  className="bg-red-500"
                  style={{ width: `${getPercentage(stats.leech_cards)}%` }}
                  title={`${stats.leech_cards} cartes problématiques`}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Détail par catégories */}
      {showDetails && sortedCategories.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Détail par niveau de maîtrise</h3>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedCategories.map(({ level, data }) => (
              <CategoryCard
                key={level}
                level={level}
                data={data}
                onExpandToggle={toggleCategory}
                isExpanded={expandedCategories.has(level)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Légende */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="text-sm text-blue-800">
          <div className="font-semibold mb-2">💡 Comment ça marche :</div>
          <ul className="space-y-1 text-blue-700">
            <li>• <strong>Niveau de maîtrise</strong> : Plus le niveau est élevé, mieux vous connaissez la question</li>
            <li>• <strong>Streak</strong> : Nombre de bonnes réponses consécutives</li>
            <li>• <strong>Échecs</strong> : Nombre de fois où vous avez cliqué &quot;Again&quot;</li>
            <li>• <strong>Cartes problématiques</strong> : Questions avec trop d&apos;échecs, affichées avec indices</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
