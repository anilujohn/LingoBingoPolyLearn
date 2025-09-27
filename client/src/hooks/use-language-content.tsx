import { useQuery } from "@tanstack/react-query";
import { LessonContent } from "@shared/schema";

interface UseLanguageContentProps {
  languageId: string;
  level: string;
  mode: string;
}

export default function useLanguageContent({ languageId, level, mode }: UseLanguageContentProps) {
  const { data: content, isLoading, error } = useQuery<LessonContent[]>({
    queryKey: ["/api/language-content", languageId, level, mode],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    content: content || [],
    isLoading,
    error,
  };
}
