import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";

interface DualVariantDisplayProps {
  heading: string;
  helper?: string;
  everydayText?: string;
  everydayTransliteration?: string;
  pureHeading?: string;
  pureText?: string;
  pureTransliteration?: string;
  pronounceEverydayText?: string;
  pronouncePureText?: string;
  showPure: boolean;
  onTogglePure: () => void;
  toggleLabels?: {
    show: string;
    hide: string;
  };
  onPronounceEveryday?: (text?: string) => void;
  onPronouncePure?: (text?: string) => void;
  pronounceLabel?: string;
  showToggle?: boolean;
  className?: string;
  pureCardClassName?: string;
}

export function DualVariantDisplay({
  heading,
  helper,
  everydayText,
  everydayTransliteration,
  pureHeading = "Pure Translation",
  pureText,
  pureTransliteration,
  pronounceEverydayText,
  pronouncePureText,
  showPure,
  onTogglePure,
  toggleLabels = {
    show: "Also show Pure Translation",
    hide: "Hide Pure Translation",
  },
  onPronounceEveryday,
  onPronouncePure,
  pronounceLabel = "Pronounce",
  showToggle = true,
  className = "",
  pureCardClassName = "",
}: DualVariantDisplayProps) {
  const everydayDisplayText = everydayText?.trim().length ? everydayText : pureText ?? "";
  const everydayDisplayTransliteration =
    everydayText?.trim().length
      ? everydayTransliteration
      : everydayTransliteration ?? pureTransliteration;

  const handleEverydayPronounce = () => {
    if (onPronounceEveryday) {
      onPronounceEveryday(pronounceEverydayText ?? everydayDisplayText);
    }
  };

  const handlePurePronounce = () => {
    if (onPronouncePure) {
      onPronouncePure(pronouncePureText ?? pureText ?? everydayDisplayText);
    }
  };

  return (
    <div className={className}>
      <p className="text-xs font-semibold text-gray-600 text-center uppercase tracking-wide">
        {heading}
      </p>
      {helper && <p className="text-xs text-gray-500 text-center mt-1">{helper}</p>}

      <div className="space-y-2 text-center mt-2">
        <p className="text-sm text-gray-500 mb-1">{everydayDisplayText}</p>
        <div className="flex items-center justify-center gap-3">
          {everydayDisplayTransliteration && (
            <p className="text-2xl font-bold text-black">{everydayDisplayTransliteration}</p>
          )}
          {onPronounceEveryday && (
            <Button variant="outline" size="sm" onClick={handleEverydayPronounce}>
              <Volume2 className="w-4 h-4 mr-1" />
              {pronounceLabel}
            </Button>
          )}
        </div>
      </div>

      {showToggle && pureText && (
        <div className="text-center mt-3">
          <Button variant="outline" size="sm" className="text-xs" onClick={onTogglePure}>
            {showPure ? toggleLabels.hide : toggleLabels.show}
          </Button>
        </div>
      )}

      {showPure && pureText && (
        <div
          className={`mt-4 border-dashed border-gray-300 rounded-md p-4 text-center space-y-2 ${
            pureCardClassName ?? ""
          }`}
        >
          <p className="text-xs text-gray-500 uppercase tracking-wide">{pureHeading}</p>
          <p className="text-sm text-gray-600">{pureText}</p>
          <div className="flex items-center justify-center gap-3">
            {pureTransliteration && (
              <p className="text-lg font-semibold text-gray-900">{pureTransliteration}</p>
            )}
            {onPronouncePure && (
              <Button variant="outline" size="sm" onClick={handlePurePronounce}>
                <Volume2 className="w-4 h-4 mr-1" />
                {pronounceLabel}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
