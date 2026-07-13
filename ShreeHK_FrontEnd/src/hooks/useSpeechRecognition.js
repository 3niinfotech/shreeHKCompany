import { useCallback, useEffect, useRef, useState } from "react";

const getSpeechRecognition = () =>
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

/**
 * Browser speech-to-text for search inputs (Chrome / Edge).
 */
export default function useSpeechRecognition({ onResult, lang = "en-IN" } = {}) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => Boolean(getSpeechRecognition()));
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) return undefined;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      const isFinal = event.results[event.results.length - 1]?.isFinal;
      onResultRef.current?.(transcript.trim(), isFinal);
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    };
  }, [lang]);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (listening) {
      stop();
      return;
    }

    try {
      recognition.start();
      setListening(true);
    } catch {
      try {
        recognition.stop();
        recognition.start();
        setListening(true);
      } catch {
        // ignore
      }
    }
  }, [listening, stop]);

  return { listening, supported, toggle, stop };
}
