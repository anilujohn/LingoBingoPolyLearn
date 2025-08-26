import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WordMeaning {
  word: string;
  meaning: string;
  transliteration?: string;
}

interface WordMeaningsCardProps {
  wordMeanings?: WordMeaning[];
  isLoading?: boolean;
}

export function WordMeaningsCard({ wordMeanings, isLoading = false }: WordMeaningsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Word Meanings</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-gray-600">Loading word analysis...</p>
        ) : wordMeanings && wordMeanings.length > 0 ? (
          <div className="space-y-1">
            {wordMeanings.map((word, index) => (
              <div key={index} className="text-sm p-2 bg-gray-50 rounded-md border-l-4 border-blue-300">
                <span className="font-semibold text-black">{word.word}</span>
                {word.transliteration && (
                  <span 
                    className="font-bold text-blue-700"
                    dangerouslySetInnerHTML={{ 
                      __html: ` (${renderMarkdownBold(word.transliteration)})` 
                    }}
                  />
                )}
                <span className="text-gray-800 ml-2">→ {word.meaning}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600">No word analysis available</p>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickTipCardProps {
  quickTip?: string;
}

// Helper function to convert markdown bold to HTML
function renderMarkdownBold(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

export function QuickTipCard({ quickTip }: QuickTipCardProps) {
  // Only render if quickTip exists and has meaningful content
  if (!quickTip || !quickTip.trim() || quickTip.includes("will appear here")) {
    return null;
  }

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-blue-900 text-base">Quick Tip</CardTitle>
      </CardHeader>
      <CardContent>
        <p 
          className="text-blue-800 text-sm"
          dangerouslySetInnerHTML={{ __html: renderMarkdownBold(quickTip) }}
        />
      </CardContent>
    </Card>
  );
}

interface WordAnalysisCardsProps {
  wordMeanings?: WordMeaning[];
  quickTip?: string;
  isLoading?: boolean;
  gridCols?: 1 | 2;
}

export function WordAnalysisCards({ 
  wordMeanings, 
  quickTip, 
  isLoading = false,
  gridCols = 2 
}: WordAnalysisCardsProps) {
  const gridClass = gridCols === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2";
  
  return (
    <div className={`grid ${gridClass} gap-3`}>
      <WordMeaningsCard wordMeanings={wordMeanings} isLoading={isLoading} />
      <QuickTipCard quickTip={quickTip} />
    </div>
  );
}