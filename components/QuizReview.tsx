'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import type { QuizItem, QuizReview as QuizReviewType } from '@/lib/types';

interface QuizReviewProps {
  projectId: string;
}

interface ReviewItem extends QuizItem {
  review?: QuizReviewType;
}

export default function QuizReview({ projectId }: QuizReviewProps) {
  const supabase = createSupabaseBrowser();
  
  const [dueItems, setDueItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMCQOption, setSelectedMCQOption] = useState<number | null>(null);
  const [stats, setStats] = useState({ total: 0, reviewed: 0, remaining: 0 });

  const loadDueItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all quiz items for this project
      const { data: quizItems } = await supabase
        .from('quiz_items')
        .select(`
          *,
          quizzes!inner(project_id),
          quiz_reviews(*)
        `)
        .eq('quizzes.project_id', projectId);

      if (!quizItems) return;

      // Filter items that are due for review
      const now = new Date();
      const due: ReviewItem[] = [];

      for (const item of quizItems) {
        const reviews = item.quiz_reviews || [];
        const userReview = reviews.find((r: any) => r.user_id === user.id);

        if (!userReview) {
          // Never reviewed, add to queue
          due.push({ ...item, review: undefined });
        } else if (new Date(userReview.due_at) <= now) {
          // Due for review
          due.push({ ...item, review: userReview });
        }
      }

      setDueItems(due);
      setStats({
        total: quizItems.length,
        reviewed: quizItems.length - due.length,
        remaining: due.length,
      });
    } catch (error) {
      console.error('Error loading due items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDueItems();
  }, [projectId]);

  const currentItem = dueItems[currentIndex];

  // SM-2 algorithm for spaced repetition
  const calculateNextReview = (quality: number, review?: QuizReviewType) => {
    const ease = review?.ease || 2.5;
    const interval = review?.interval_days || 1;

    let newEase = ease;
    let newInterval = interval;

    if (quality >= 3) {
      // Correct answer
      if (interval === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(interval * ease);
      }
      newEase = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    } else {
      // Incorrect answer - reset
      newInterval = 1;
      newEase = Math.max(1.3, ease - 0.2);
    }

    newEase = Math.max(1.3, newEase);

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + newInterval);

    return { ease: newEase, interval: newInterval, dueAt };
  };

  const submitReview = async (quality: number) => {
    if (!currentItem) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { ease, interval, dueAt } = calculateNextReview(quality, currentItem.review);

      if (currentItem.review) {
        // Update existing review
        await supabase
          .from('quiz_reviews')
          .update({
            ease,
            interval_days: interval,
            due_at: dueAt.toISOString(),
            last_reviewed_at: new Date().toISOString(),
            review_count: currentItem.review.review_count + 1,
          })
          .eq('id', currentItem.review.id);
      } else {
        // Create new review
        await supabase.from('quiz_reviews').insert({
          quiz_item_id: currentItem.id,
          user_id: user.id,
          ease,
          interval_days: interval,
          due_at: dueAt.toISOString(),
          review_count: 1,
        });
      }

      // Move to next item
      if (currentIndex < dueItems.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setShowAnswer(false);
        setSelectedMCQOption(null);
      } else {
        // All done
        loadDueItems();
        setCurrentIndex(0);
        setShowAnswer(false);
        setSelectedMCQOption(null);
      }

      setStats(prev => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        remaining: prev.remaining - 1,
      }));
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (dueItems.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Tout est à jour !</h3>
        <p className="text-gray-600">Aucune question à réviser pour le moment.</p>
        <p className="text-sm text-gray-500 mt-2">Revenez plus tard pour continuer vos révisions.</p>
      </div>
    );
  }

  const options = currentItem.options
    ? Array.isArray(currentItem.options)
      ? currentItem.options
      : JSON.parse(currentItem.options as any)
    : [];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Progression</span>
          <span>
            {currentIndex + 1} / {dueItems.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gray-900 h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / dueItems.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Total: {stats.total}</span>
          <span>Révisées: {stats.reviewed}</span>
          <span>Restantes: {stats.remaining}</span>
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Question header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-xs px-2 py-1 bg-white border border-gray-200 rounded text-gray-600">
              {currentItem.type === 'mcq' ? 'QCM' : currentItem.type === 'flashcard' ? 'Flashcard' : 'Question ouverte'}
            </span>
            {currentItem.review && (
              <span className="text-xs text-gray-500">
                Révision #{currentItem.review.review_count + 1}
              </span>
            )}
          </div>
        </div>

        {/* Question content */}
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">{currentItem.question}</h3>

          {/* MCQ options */}
          {currentItem.type === 'mcq' && !showAnswer && (
            <div className="space-y-2 mb-6">
              {options.map((option: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedMCQOption(index)}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition ${
                    selectedMCQOption === index
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium text-gray-700 mr-2">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* Show answer button */}
          {!showAnswer && (
            <button
              onClick={() => setShowAnswer(true)}
              disabled={currentItem.type === 'mcq' && selectedMCQOption === null}
              className="w-full px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentItem.type === 'flashcard' ? 'Montrer la réponse' : 'Vérifier'}
            </button>
          )}

          {/* Answer */}
          {showAnswer && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm font-medium text-green-900 mb-1">Réponse correcte</div>
                <div className="text-green-800">{currentItem.answer}</div>
              </div>

              {currentItem.explanation && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-900 mb-1">Explication</div>
                  <div className="text-sm text-blue-800">{currentItem.explanation}</div>
                </div>
              )}

              {/* Rating buttons */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3 text-center">
                  Comment avez-vous trouvé cette question ?
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => submitReview(1)}
                    className="px-4 py-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                  >
                    Difficile
                  </button>
                  <button
                    onClick={() => submitReview(3)}
                    className="px-4 py-3 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 transition"
                  >
                    Moyen
                  </button>
                  <button
                    onClick={() => submitReview(4)}
                    className="px-4 py-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition"
                  >
                    Facile
                  </button>
                  <button
                    onClick={() => submitReview(5)}
                    className="px-4 py-3 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition"
                  >
                    Très facile
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


