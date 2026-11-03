import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeechRecognitionInstance } from "@/types/speech-recognition";

export type SpeechLanguage = "zh-CN" | "en-US";

type Options = {
  language: SpeechLanguage;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
};

export function useSpeechRecognition({ language, onFinal, onError }: Options) {
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldListenRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);
  const languageRef = useRef(language);

  const supported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    onFinalRef.current = onFinal;
    onErrorRef.current = onError;
    languageRef.current = language;
  }, [onFinal, onError, language]);

  const clearRestart = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    clearRestart();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterim("");
  }, [clearRestart]);

  const start = useCallback(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      onErrorRef.current("当前浏览器不支持语音识别，请使用下方手动输入。iPhone 可尝试最新版 Safari。");
      return;
    }

    clearRestart();
    recognitionRef.current?.abort();
    shouldListenRef.current = true;
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = languageRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += `${transcript} `;
        else interimText += transcript;
      }
      setInterim(interimText.trim());
      const cleaned = finalText.trim();
      if (cleaned) onFinalRef.current(cleaned);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldListenRef.current = false;
        setIsListening(false);
        onErrorRef.current("麦克风权限未开启。请在 Safari 设置中允许麦克风，或改用手动输入。");
      } else if (event.error === "network") {
        onErrorRef.current("语音识别网络异常，正在尝试恢复；也可以改用手动输入。");
      } else if (event.error === "audio-capture") {
        shouldListenRef.current = false;
        setIsListening(false);
        onErrorRef.current("没有检测到可用麦克风，请检查设备权限。");
      }
    };

    recognition.onend = () => {
      if (!shouldListenRef.current) return;
      restartTimerRef.current = window.setTimeout(() => {
        try {
          recognition.start();
        } catch {
          shouldListenRef.current = false;
          setIsListening(false);
          onErrorRef.current("语音识别已暂停，请重新点击开始。");
        }
      }, 250);
    };

    try {
      recognition.start();
      setInterim("");
      setIsListening(true);
    } catch {
      shouldListenRef.current = false;
      recognitionRef.current = null;
      onErrorRef.current("无法启动语音识别，请确认浏览器允许使用麦克风。");
    }
  }, [clearRestart]);

  useEffect(() => stop, [stop]);

  return { supported, isListening, interim, start, stop, clearInterim: () => setInterim("") };
}
