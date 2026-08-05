import { useEffect, useRef, useState } from "react";
import { Button, Drawer, message, Tooltip, Tag, Select } from "antd";
import {
  Bot,
  Diamond,
  Send,
  Sparkles,
  User,
  X,
  Zap,
  Mic,
  MicOff,
  Command,
  PlusCircle,
  History,
  Gem,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  Trash2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { sendAgentQuery, sendAiChat, fetchUserThreads, fetchThreadHistory, deleteUserThread } from "../../api/services/aiService";
import { pickApiMessage } from "../../utils/apiToast";
import useSpeechRecognition from "../../hooks/useSpeechRecognition";
import AIAgentCommandBar from "./AIAgentCommandBar";
import styles from "../../assets/scss/components/ai/aiChat.module.scss";

const QUICK_PROMPTS = [
  // { icon: Zap, label: "STOCK OVERVIEW", text: "Aaj ki inventory summary batao", color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0" },
  // { icon: Diamond, label: "RESERVATION ALERTS", text: "Hold stones kitne hain?", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  // { icon: Sparkles, label: "GRADES & COLOR", text: "Color breakdown dikhao", color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  // { icon: TrendingUp, label: "SALES & TURNOVER", text: "Sales report last 30 days", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  { icon: Zap, label: "STOCK OVERVIEW", text: "Show today's inventory summary", color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0" },
  { icon: Diamond, label: "RESERVATION ALERTS", text: "How many stones are on hold?", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  { icon: Sparkles, label: "GRADES & COLOR", text: "Show color breakdown", color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  { icon: TrendingUp, label: "SALES & TURNOVER", text: "Sales report for last 30 days", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
];

const FloatingAIChat = () => {
  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentThreadId, setCurrentThreadId] = useState("default");
  const [threads, setThreads] = useState([]);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const { listening, supported: speechSupported, toggle: toggleSpeech } = useSpeechRecognition({
    onResult: (text) => setInput(text),
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
      loadThreads();
    }
  }, [messages, loading, open]);

  const loadThreads = async () => {
    try {
      const res = await fetchUserThreads();
      if (res?.success && Array.isArray(res.threads)) {
        setThreads(res.threads);
      }
    } catch {
      // ignore
    }
  };

  const loadThreadMessages = async (tId) => {
    setCurrentThreadId(tId);
    setLoading(true);
    try {
      const res = await fetchThreadHistory(tId);
      if (res?.success && Array.isArray(res.history)) {
        setMessages(res.history);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (currentThreadId && currentThreadId !== "default") {
      try {
        await deleteUserThread(currentThreadId);
      } catch {
        // ignore
      }
    }
    setMessages([]);
    setInput("");
    message.success("Conversation cleared");
    loadThreads();
  };

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  };

  useEffect(() => {
    resizeTextarea();
  }, [input]);

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: "user", content: trimmed };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    try {
      let res;
      try {
        res = await sendAgentQuery({
          message: trimmed,
          threadId: currentThreadId,
        });
      } catch {
        res = await sendAiChat({
          message: trimmed,
          conversationHistory: messages,
        });
      }

      if (res?.success && (res?.data?.message || res?.data)) {
        const replyText = typeof res.data === "object" ? res.data.message : res.data;
        setMessages([
          ...nextHistory,
          { role: "assistant", content: replyText, provider: res.data?.provider || "agent" },
        ]);
        loadThreads();
      } else {
        const errMsg = pickApiMessage(res);
        if (errMsg) message.error(errMsg);
        setMessages([
          ...nextHistory,
          { role: "assistant", content: errMsg || "Failed to generate AI response.", isError: true },
        ]);
      }
    } catch (err) {
      const errMsg = pickApiMessage(err?.response?.data);
      if (errMsg) message.error(errMsg);
      setMessages([
        ...nextHistory,
        { role: "assistant", content: errMsg || "AI Assistant unavailable.", isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => sendMessage(input);

  const handleNewThread = () => {
    const newId = `thread_${Date.now()}`;
    setCurrentThreadId(newId);
    setMessages([]);
    setInput("");
  };

  const handleExecuteFromCommandBar = (promptText, toggleOnly = false) => {
    if (toggleOnly) {
      setCommandBarOpen(!commandBarOpen);
      return;
    }
    if (promptText) {
      setOpen(true);
      sendMessage(promptText);
    }
  };

  const formatAiMessage = (content) => {
    if (!content || typeof content !== "string") return content;

    let formatted = content.replace(/\*\*(\d[\d,.]*)\*\*/g, (_, num) => `<span class="${styles.metricHighlight}">${num}</span>`);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\n/g, '<br/>');

    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  return (
    <>
      <div className={styles.chatFabWrap}>
        <span className={styles.fabPulse} aria-hidden />
        <span className={styles.fabLabel}>Diamond AI Assistant (Cmd+K)</span>
        <Button
          type="primary"
          shape="circle"
          size="small"
          className={styles.chatFab}
          icon={<Sparkles size={20} strokeWidth={1.75} />}
          onClick={() => setOpen(true)}
          aria-label="Open Diamond Inventory AI"
        />
      </div>

      <AIAgentCommandBar
        open={commandBarOpen}
        onClose={() => setCommandBarOpen(false)}
        onExecutePrompt={handleExecuteFromCommandBar}
      />

      <Drawer
        placement="right"
        width={isExpanded ? 720 : 440}
        open={open}
        onClose={() => setOpen(false)}
        className={styles.drawerRoot}
        closable={false}
        destroyOnClose={false}
      >
        <div className={styles.chatShell}>
          <header className={styles.header}>
            <div className={styles.headerTop}>
              <div className={styles.headerBrand}>
                <div className={styles.headerAvatar}>
                  <Gem size={22} className={styles.headerAvatarIcon} />
                </div>
                <div className={styles.headerTitles}>
                  <h3>ShreeHK Enterprise AI</h3>
                  <p>Diamond Inventory Intelligence</p>
                  <div className={styles.statusRow}>
                    <span className={styles.statusDot} />
                    <span className={styles.statusText}>Live Orchestrator</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip title={isExpanded ? "Standard width (440px)" : "Expand width (720px)"}>
                  <Button
                    type="text"
                    shape="circle"
                    className={styles.closeBtn}
                    icon={isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    onClick={() => setIsExpanded(!isExpanded)}
                  />
                </Tooltip>
                <Tooltip title="Quick Command Palette (Cmd+K)">
                  <Button
                    type="text"
                    shape="circle"
                    className={styles.closeBtn}
                    icon={<Command size={16} />}
                    onClick={() => setCommandBarOpen(true)}
                  />
                </Tooltip>
                <Button
                  type="text"
                  shape="circle"
                  className={styles.closeBtn}
                  icon={<X size={18} />}
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                />
              </div>
            </div>


            <div className={styles.threadToolBar}>
              <Select
                size="small"
                value={currentThreadId}
                onChange={loadThreadMessages}
                className={styles.threadSelect}
                options={[
                  { value: 'default', label: 'Current Session Thread' },
                  ...threads.map((t) => ({ value: t.threadId, label: t.title })),
                ]}
              />
              <div className="flex items-center gap-1">
                <Button
                  size="small"
                  type="text"
                  icon={<PlusCircle size={14} className="text-emerald-600" />}
                  onClick={handleNewThread}
                  className={styles.threadBtnNew}
                >
                  New Thread
                </Button>
                <Tooltip title="Clear current conversation history">
                  <Button
                    size="small"
                    type="text"
                    icon={<RotateCcw size={14} className="text-rose-500" />}
                    onClick={handleClear}
                    className={styles.threadBtnClear}
                  >
                    Clear
                  </Button>
                </Tooltip>
              </div>
            </div>
          </header>

          <div className={styles.messagesArea}>

            {messages.length === 0 && !loading ? (
              <div className={styles.welcome}>
                <div className={styles.welcomeHeroBadge}>
                  <div className={styles.heroGlow} />
                  <Gem size={30} className={styles.heroGemIcon} />
                </div>
                <div className={styles.welcomeTitle}>ShreeHK Diamond AI</div>
                <p className={styles.welcomeSub}>
                  Instant access to diamond stock availability, party accounts outstanding, memo movements, and sales performance.
                </p>

                <div className={styles.welcomeMetaChips}>
                  <span className={styles.metaChip}><Zap size={11} /> Stock Lookup</span>
                  <span className={styles.metaChip}><ShieldCheck size={11} /> Party Ledger</span>
                  <span className={styles.metaChip}><Sparkles size={11} /> Vision OCR</span>
                </div>

                <div className={styles.promptGrid}>
                  {QUICK_PROMPTS.map(({ icon: Icon, label, text, color, bg, border }) => (
                    <div
                      key={text}
                      className={styles.actionCard}
                      onClick={() => sendMessage(text)}
                      style={{ '--card-accent': color, '--card-bg': bg, '--card-border': border }}
                    >
                      <div className={styles.actionCardLeft}>
                        <div className={styles.actionIconBox} style={{ color, backgroundColor: bg, borderColor: border }}>
                          <Icon size={16} />
                        </div>
                        <div className={styles.actionTextGroup}>
                          <span className={styles.actionTag} style={{ color }}>{label}</span>
                          <span className={styles.actionPromptText}>{text}</span>
                        </div>
                      </div>
                      <ArrowRight size={15} className={styles.actionArrow} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (

              <>
                {messages.map((msg, idx) => (
                  <div
                    key={`${msg.role}-${idx}`}
                    className={`${styles.messageRow} ${msg.role === "user" ? styles.userRow : ""}`}
                  >
                    <div
                      className={`${styles.msgAvatar} ${msg.role === "user" ? styles.userAvatar : styles.aiAvatar}`}
                    >
                      {msg.role === "user" ? <User size={16} /> : <Sparkles size={16} />}
                    </div>
                    <div className={styles.bubbleWrap}>
                      <span className={styles.bubbleLabel}>
                        {msg.role === "user" ? "You" : "Diamond Agent"}
                      </span>
                      <div
                        className={
                          msg.role === "user"
                            ? styles.userBubble
                            : msg.isError
                              ? styles.errorBubble
                              : styles.assistantBubble
                        }
                      >
                        {msg.role === "assistant" && !msg.isError
                          ? formatAiMessage(msg.content)
                          : msg.content}
                      </div>
                    </div>
                  </div>
                ))}

                {loading ? (
                  <div className={styles.messageRow}>
                    <div className={`${styles.msgAvatar} ${styles.aiAvatar}`}>
                      <Sparkles size={15} />
                    </div>
                    <div className={styles.bubbleWrap}>
                      <span className={styles.bubbleLabel}>Diamond Agent</span>
                      <div className={styles.typingBubble} aria-label="AI is typing">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.inputDock}>
            <div className={styles.inputChipBar}>
              <span className={styles.chipTag} onClick={() => sendMessage("Available stones summary")}>💎 Available Stock</span>
              <span className={styles.chipTag} onClick={() => sendMessage("Hold stones kitne hain?")}>📋 Hold Stones</span>
              <span className={styles.chipTag} onClick={() => sendMessage("Show party outstanding summary")}>💰 Party Outstanding</span>
              <span className={styles.chipTag} onClick={() => sendMessage("Sales report last 30 days")}>📊 Sales Performance</span>
            </div>

            <div className={styles.inputWrap}>
              <textarea
                ref={textareaRef}
                className={styles.chatTextarea}
                placeholder="Ask AI agent... inventory, memo, party outstanding, stone history..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={loading}
                rows={1}
              />
              <div className="flex items-center gap-1.5 flex-shrink-0 pr-1">
                {speechSupported && (
                  <Tooltip title={listening ? "Listening... Click to stop" : "Voice Input"}>
                    <Button
                      type="text"
                      shape="circle"
                      className={`${styles.micBtn} ${listening ? styles.micActive : ""}`}
                      icon={listening ? <MicOff size={16} /> : <Mic size={16} />}
                      onClick={toggleSpeech}
                    />
                  </Tooltip>
                )}
                <Button
                  className={styles.sendBtn}
                  icon={<Send size={16} strokeWidth={2.25} />}
                  onClick={handleSend}
                  loading={loading}
                  disabled={!input.trim()}
                  aria-label="Send message"
                />
              </div>
            </div>

            <div className={styles.inputHint}>
              <span><kbd className={styles.kbdTag}>Enter</kbd> Send</span>
              <span className="opacity-40">•</span>
              <span><kbd className={styles.kbdTag}>Shift + Enter</kbd> Line</span>
              <span className="opacity-40">•</span>
              <span><kbd className={styles.kbdTag}>Cmd + K</kbd> Palette</span>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
};


export default FloatingAIChat;
