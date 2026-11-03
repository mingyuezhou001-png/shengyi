import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeftRight,
  AudioLines,
  CircleStop,
  Keyboard,
  LoaderCircle,
  Mic,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { translateText } from "@/lib/translate";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import "../App.css";

type Direction = "zh-en" | "en-zh";
type Entry = {
  id: string;
  source: string;
  translated: string;
  direction: Direction;
  status: "loading" | "done" | "error";
};

const directionMeta = {
  "zh-en": { from: "中文", to: "English", sourceLang: "zh-CN" as const, targetLang: "en-US" },
  "en-zh": { from: "English", to: "中文", sourceLang: "en-US" as const, targetLang: "zh-CN" },
};

export default function Home() {
  const [direction, setDirection] = useState<Direction>("zh-en");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [error, setError] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [manualText, setManualText] = useState("");
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const sessionRef = useRef(0);
  const autoSpeakRef = useRef(autoSpeak);
  const endRef = useRef<HTMLDivElement>(null);
  const meta = directionMeta[direction];

  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [entries]);

  const speak = useCallback((text: string, language: string) => {
    if (!autoSpeakRef.current || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.96;
    window.speechSynthesis.speak(utterance);
  }, []);

  const runTranslation = useCallback(
    (id: string, text: string, entryDirection: Direction) => {
      const session = sessionRef.current;
      queueRef.current = queueRef.current.then(async () => {
        if (session !== sessionRef.current) return;
        try {
          const translated = await translateText(text, entryDirection);
          if (session !== sessionRef.current) return;
          setEntries((current) =>
            current.map((entry) =>
              entry.id === id
                ? { ...entry, translated, status: "done" }
                : entry,
            ),
          );
          speak(translated, directionMeta[entryDirection].targetLang);
        } catch (translationError) {
          if (session !== sessionRef.current) return;
          setEntries((current) =>
            current.map((entry) =>
              entry.id === id ? { ...entry, status: "error" } : entry,
            ),
          );
          setError(
            translationError instanceof Error
              ? translationError.message
              : "翻译失败，请稍后重试。",
          );
        }
      });
    },
    [speak],
  );

  const addTranscript = useCallback(
    (text: string) => {
      const cleaned = text.trim();
      if (!cleaned) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setEntries((current) => [
        ...current,
        { id, source: cleaned, translated: "", direction, status: "loading" },
      ]);
      setError("");
      runTranslation(id, cleaned, direction);
    },
    [direction, runTranslation],
  );

  const speech = useSpeechRecognition({
    language: meta.sourceLang,
    onFinal: addTranscript,
    onError: setError,
  });

  const toggleListening = () => {
    if (speech.isListening) speech.stop();
    else {
      setError("");
      speech.start();
    }
  };

  const changeDirection = () => {
    speech.stop();
    window.speechSynthesis?.cancel();
    setDirection((current) => (current === "zh-en" ? "en-zh" : "zh-en"));
    setError("");
  };

  const clearAll = () => {
    sessionRef.current += 1;
    speech.stop();
    window.speechSynthesis?.cancel();
    setEntries([]);
    setError("");
    setManualText("");
  };

  const submitManual = (event: FormEvent) => {
    event.preventDefault();
    addTranscript(manualText);
    setManualText("");
  };

  return (
    <main className="interpreter-shell">
      <header className="topbar">
        <button className="wordmark" onClick={() => setShowHelp(true)} aria-label="打开使用说明">
          <AudioLines size={23} strokeWidth={1.8} aria-hidden="true" />
          <span>声译</span>
          <small>LIVE INTERPRETER</small>
        </button>
        <button className="privacy-button" onClick={() => setShowHelp(true)}>
          <ShieldCheck size={17} aria-hidden="true" />
          隐私说明
        </button>
      </header>

      <section className="language-switcher" aria-label="翻译方向">
        <span>{meta.from}</span>
        <button onClick={changeDirection} aria-label="切换翻译方向">
          <ArrowLeftRight size={19} aria-hidden="true" />
        </button>
        <span>{meta.to}</span>
      </section>

      <section className="conversation" aria-live="polite" aria-label="翻译记录">
        {entries.length === 0 ? (
          <div className="empty-state">
            <div className={`sound-figure ${speech.isListening ? "active" : ""}`} aria-hidden="true">
              {Array.from({ length: 17 }, (_, index) => (
                <i key={index} style={{ "--bar": index } as React.CSSProperties} />
              ))}
            </div>
            <p className="eyebrow">{speech.isListening ? "LISTENING NOW" : "READY WHEN YOU ARE"}</p>
            <h1>{speech.isListening ? "正在聆听，请自然说话" : "说一句，译一句"}</h1>
            <p>
              {speech.supported
                ? "点击下方麦克风开始。每句话结束后，译文会显示在这里。"
                : "此浏览器暂不支持语音识别，请使用手动输入翻译。"}
            </p>
          </div>
        ) : (
          <div className="entry-list">
            {entries.map((entry, index) => {
              const entryMeta = directionMeta[entry.direction];
              return (
                <article className="translation-entry" key={entry.id}>
                  <div className="entry-number">{String(index + 1).padStart(2, "0")}</div>
                  <div className="entry-source">
                    <span>{entryMeta.from} · 原文</span>
                    <p>{entry.source}</p>
                  </div>
                  <div className="entry-target">
                    <span>{entryMeta.to} · 译文</span>
                    {entry.status === "loading" ? (
                      <p className="translating"><LoaderCircle size={19} className="spin" /> 正在翻译</p>
                    ) : entry.status === "error" ? (
                      <button className="retry" onClick={() => {
                        setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, status: "loading" } : item));
                        runTranslation(entry.id, entry.source, entry.direction);
                      }}>
                        <RotateCcw size={17} /> 翻译失败，点击重试
                      </button>
                    ) : (
                      <p>{entry.translated}</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {speech.interim && (
          <div className="interim-text">
            <span>正在识别</span>
            <p>{speech.interim}</p>
          </div>
        )}
        <div ref={endRef} />
      </section>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="关闭错误提示"><X size={18} /></button>
        </div>
      )}

      {showInput && (
        <form className="manual-panel" onSubmit={submitManual}>
          <label htmlFor="manual-text">手动输入{meta.from}，翻译为{meta.to}</label>
          <div>
            <textarea
              id="manual-text"
              value={manualText}
              onChange={(event) => setManualText(event.target.value)}
              placeholder={direction === "zh-en" ? "例如：很高兴见到你。" : "For example: Nice to meet you."}
              rows={2}
              maxLength={1200}
              autoFocus
            />
            <button type="submit" disabled={!manualText.trim()}>翻译</button>
          </div>
        </form>
      )}

      <footer className="control-dock">
        <div className="secondary-controls">
          <button onClick={() => setShowInput((visible) => !visible)} aria-pressed={showInput}>
            <Keyboard size={20} />
            {showInput ? "收起输入" : "手动输入"}
          </button>
          <button onClick={() => {
            setAutoSpeak((enabled) => !enabled);
            if (autoSpeak) window.speechSynthesis?.cancel();
          }} aria-pressed={autoSpeak}>
            {autoSpeak ? <Volume2 size={20} /> : <VolumeX size={20} />}
            {autoSpeak ? "朗读已开" : "朗读已关"}
          </button>
          <button onClick={clearAll} disabled={entries.length === 0 && !speech.interim}>
            <Trash2 size={20} />
            清空
          </button>
        </div>
        <button
          className={`mic-button ${speech.isListening ? "listening" : ""}`}
          onClick={toggleListening}
          aria-label={speech.isListening ? "停止同传" : "开始同传"}
        >
          {speech.isListening ? <CircleStop size={27} /> : <Mic size={27} />}
          <span>{speech.isListening ? "停止同传" : "开始同传"}</span>
        </button>
        <p className="dock-note">不保存录音 · 翻译文本发送至 MyMemory</p>
      </footer>

      {showHelp && (
        <div className="sheet-backdrop" onClick={() => setShowHelp(false)}>
          <section className="help-sheet" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={(event) => event.stopPropagation()}>
            <button className="sheet-close" onClick={() => setShowHelp(false)} aria-label="关闭说明"><X /></button>
            <p className="eyebrow">QUICK GUIDE</p>
            <h2 id="help-title">在 iPhone 上使用</h2>
            <ol>
              <li>用 Safari 打开本页面，点击“开始同传”并允许麦克风权限。</li>
              <li>选择中文→英文或英文→中文，正常说话即可。</li>
              <li>如需放到主屏幕：点 Safari 的“分享”，选择“添加到主屏幕”。</li>
            </ol>
            <p>语音识别能力取决于 iOS 和 Safari 版本，且需要联网。无法识别时，可使用“手动输入”。</p>
            <p><strong>隐私：</strong>不保存录音；待翻译文本会发送至 MyMemory 免费翻译服务。请勿输入密码或隐私信息。刷新页面后记录消失，匿名免费额度为每天 5,000 字符。</p>
          </section>
        </div>
      )}
    </main>
  );
}
