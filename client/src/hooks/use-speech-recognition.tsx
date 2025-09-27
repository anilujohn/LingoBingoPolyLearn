import { useState, useCallback, useRef, useEffect } from "react";

interface UseSpeechRecognitionProps {
  language?: string;
  onResult?: (result: string) => void;
  onError?: (error: string) => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: any) => void) | null;
  onspeechend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function useSpeechRecognition({
  language = "en-US",
  onResult,
  onError,
}: UseSpeechRecognitionProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      onErrorRef.current?.("Speech recognition is not supported in this browser.");
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
      onResultRef.current?.(result);
      setIsListening(false);
      try {
        recognition.stop();
      } catch (error) {
        // ignore stop errors when recognition has already stopped
      }
    };

    recognition.onerror = (event: any) => {
      onErrorRef.current?.(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onspeechend = () => {
      setIsListening(false);
      try {
        recognition.stop();
      } catch (error) {
        // ignore stop errors when recognition has already stopped
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onspeechend = null;
      try {
        recognition.stop();
      } catch (error) {
        // ignore stop errors when recognition has not started yet
      }
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };
  }, [language]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      onErrorRef.current?.("Speech recognition is not supported");
      return;
    }

    try {
      recognitionRef.current.lang = language;
      recognitionRef.current.start();
      setIsListening(true);
      setTranscript("");
    } catch (error) {
      onErrorRef.current?.("Failed to start speech recognition");
      setIsListening(false);
    }
  }, [isSupported, language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        // ignore stop errors when recognition has not started yet
      }
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
  };
}


