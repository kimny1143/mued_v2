'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface MaterialContent {
  type?: string;
  questions?: Array<{
    question: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
  }>;
  sections?: Array<{ title: string; content: string }>;
  cards?: Array<{ front: string; back: string; term?: string; definition?: string; example?: string }>;
  problems?: Array<{ problem: string; hint?: string; solution?: string }>;
}

interface MaterialData {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  content: MaterialContent;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export default function MaterialDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [material, setMaterial] = useState<MaterialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMaterial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchMaterial = async () => {
    try {
      const response = await fetch(`/api/ai/materials/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setMaterial(data.material);
      } else {
        setError(data.error || 'Failed to load material');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading material...</p>
        </div>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Material not found'}
        </div>
        <button
          onClick={() => router.push('/dashboard/materials')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Materials
        </button>
      </div>
    );
  }

  const renderContent = () => {
    switch (material.content.type) {
      case 'quiz':
        return <QuizContent content={material.content} />;
      case 'summary':
        return <SummaryContent content={material.content} />;
      case 'flashcards':
        return <FlashcardsContent content={material.content} />;
      case 'practice':
        return <PracticeContent content={material.content} />;
      default:
        return <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">{JSON.stringify(material.content, null, 2)}</pre>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard/materials')}
          className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
        >
          ← Back to Materials
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{material.title}</h1>
            <p className="text-gray-600 mt-2">{material.description}</p>
            <div className="flex gap-2 mt-3">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {material.type}
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                {material.difficulty}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {renderContent()}
      </div>

      {/* Metadata */}
      {material.metadata && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Generation Info</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Created: {new Date(material.createdAt).toLocaleString()}</p>
            {(material.metadata as { model?: string }).model && <p>Model: {(material.metadata as { model?: string }).model}</p>}
            {(material.metadata as { tokens?: number }).tokens && <p>Tokens: {(material.metadata as { tokens?: number }).tokens}</p>}
            {(material.metadata as { generationCost?: number }).generationCost && (
              <p>Cost: ${((material.metadata as { generationCost?: number }).generationCost || 0).toFixed(4)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Quiz component
function QuizContent({ content }: { content: MaterialContent }) {
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState(false);

  if (!content.questions) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Quiz</h2>
      {content.questions.map((q, idx: number) => (
        <div key={idx} className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h3 className="font-semibold mb-3">
            {idx + 1}. {q.question}
          </h3>
          {q.options && (
            <div className="space-y-2">
              {q.options.map((option: string, optIdx: number) => (
                <label
                  key={optIdx}
                  className={`block p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedAnswers[idx] === option
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${
                    showResults && option === q.correctAnswer
                      ? 'bg-green-50 border-green-600'
                      : showResults && selectedAnswers[idx] === option
                      ? 'bg-red-50 border-red-600'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${idx}`}
                    value={option}
                    checked={selectedAnswers[idx] === option}
                    onChange={(e) =>
                      setSelectedAnswers({ ...selectedAnswers, [idx]: e.target.value })
                    }
                    className="mr-2"
                    disabled={showResults}
                  />
                  {option}
                </label>
              ))}
            </div>
          )}
          {showResults && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Explanation:</strong> {q.explanation}
              </p>
            </div>
          )}
        </div>
      ))}
      <button
        onClick={() => setShowResults(!showResults)}
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        {showResults ? 'Hide Results' : 'Show Results'}
      </button>
    </div>
  );
}

// Summary component
interface SummaryContentType {
  overview?: string;
  keyPoints?: string[];
  examples?: string[];
  sections?: Array<{ title: string; content: string }>;
}

function SummaryContent({ content }: { content: MaterialContent }) {
  const summaryContent = content as unknown as SummaryContentType;

  if (!summaryContent.sections && !summaryContent.keyPoints) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Summary</h2>
      <div className="prose max-w-none">
        {summaryContent.overview && (
          <p className="text-gray-700 leading-relaxed mb-6">{summaryContent.overview}</p>
        )}

        {summaryContent.keyPoints && summaryContent.keyPoints.length > 0 && (
          <>
            <h3 className="text-xl font-semibold mb-3">Key Points</h3>
            <ul className="space-y-2">
              {summaryContent.keyPoints.map((point, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {summaryContent.examples && summaryContent.examples.length > 0 && (
          <>
            <h3 className="text-xl font-semibold mt-6 mb-3">Examples</h3>
            <div className="space-y-3">
              {summaryContent.examples.map((example, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                  {example}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Flashcards component
function FlashcardsContent({ content }: { content: MaterialContent }) {
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!content.cards || content.cards.length === 0) return null;

  const nextCard = () => {
    if (!content.cards) return;
    setFlipped(false);
    setCurrentCard((prev) => (prev + 1) % content.cards!.length);
  };

  const prevCard = () => {
    if (!content.cards) return;
    setFlipped(false);
    setCurrentCard((prev) => (prev - 1 + content.cards!.length) % content.cards!.length);
  };

  const card = content.cards[currentCard];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Flashcards</h2>
      <div className="text-center mb-4 text-gray-600">
        Card {currentCard + 1} of {content.cards.length}
      </div>
      <div
        onClick={() => setFlipped(!flipped)}
        className="min-h-[300px] bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-8 cursor-pointer hover:shadow-lg transition-shadow flex items-center justify-center"
      >
        <div className="text-center">
          {!flipped ? (
            <>
              <div className="text-sm text-gray-600 mb-2">FRONT</div>
              <div className="text-2xl font-bold">{card.term || card.front}</div>
            </>
          ) : (
            <>
              <div className="text-sm text-gray-600 mb-2">BACK</div>
              <div className="text-xl">{card.definition || card.back}</div>
              {card.example && (
                <div className="mt-4 text-sm text-gray-700 italic">
                  Example: {card.example}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex justify-between mt-6">
        <button
          onClick={prevCard}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={content.cards.length <= 1}
        >
          ← Previous
        </button>
        <button
          onClick={() => setFlipped(!flipped)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {flipped ? 'Show Term' : 'Show Definition'}
        </button>
        <button
          onClick={nextCard}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={content.cards.length <= 1}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// Practice problems component
interface ProblemType {
  problem: string;
  hints?: string[];
  hint?: string;
  solution?: string;
}

function PracticeContent({ content }: { content: MaterialContent }) {
  const [showSolutions, setShowSolutions] = useState<{ [key: number]: boolean }>({});

  if (!content.problems || content.problems.length === 0) return null;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Practice Problems</h2>
      {content.problems.map((problem, idx) => {
        const typedProblem = problem as ProblemType;
        return (
        <div key={idx} className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h3 className="font-semibold mb-3">
            Problem {idx + 1}
          </h3>
          <p className="text-gray-700 mb-4">{typedProblem.problem}</p>

          {typedProblem.hints && typedProblem.hints.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-sm text-gray-600 mb-2">Hints:</h4>
              <ul className="space-y-1">
                {typedProblem.hints.map((hint, hintIdx) => (
                  <li key={hintIdx} className="text-sm text-gray-600">
                    💡 {hint}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() =>
              setShowSolutions({ ...showSolutions, [idx]: !showSolutions[idx] })
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            {showSolutions[idx] ? 'Hide Solution' : 'Show Solution'}
          </button>

          {showSolutions[idx] && typedProblem.solution && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold mb-2">Solution:</h4>
              <p className="text-gray-700 mb-3">{typedProblem.solution}</p>
              {(typedProblem as { steps?: string[] }).steps && (typedProblem as { steps?: string[] }).steps!.length > 0 && (
                <>
                  <h5 className="font-medium text-sm mb-2">Steps:</h5>
                  <ol className="space-y-2">
                    {(typedProblem as { steps?: string[] }).steps!.map((step, stepIdx) => (
                      <li key={stepIdx} className="text-sm text-gray-700">
                        {stepIdx + 1}. {step}
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}
