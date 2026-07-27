import { useEffect, useRef, useState } from "react";
import { Button, Drawer, message } from "antd";
import {
  Bot,
  Diamond,
  Send,
  Sparkles,
  User,
  X,
  Zap,
} from "lucide-react";
import { sendAiChat } from "../../api/services/aiService";
import { pickApiMessage } from "../../utils/apiToast";
import logo from "../../assets/image/logo/download.png";
import styles from "../../assets/scss/components/ai/aiChat.module.scss";

const QUICK_PROMPTS = [
  { icon: Zap, text: "Aaj ki inventory summary batao" },
  { icon: Diamond, text: "Hold stones kitne hain?" },
  { icon: Sparkles, text: "Color breakdown dikhao" },
  { icon: Bot, text: "Sales report last 30 days" },
];

const FloatingAIChat = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, loading, open]);

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
      const res = await sendAiChat({
        message: trimmed,
        conversationHistory: messages,
      });
      if (res?.success) {
        setMessages([
          ...nextHistory,
          { role: "assistant", content: res.data },
        ]);
      } else {
        const errMsg = pickApiMessage(res);
        if (errMsg) message.error(errMsg);
        setMessages([
          ...nextHistory,
          { role: "assistant", content: errMsg || "", isError: true },
        ]);
      }
    } catch (err) {
      const errMsg = pickApiMessage(err?.response?.data);
      if (errMsg) message.error(errMsg);
      setMessages([
        ...nextHistory,
        { role: "assistant", content: errMsg || "", isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => sendMessage(input);

  const handleClear = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <>
      <div className={styles.chatFabWrap}>
        <span className={styles.fabPulse} aria-hidden />
        <span className={styles.fabLabel}>Diamond AI Assistant</span>
        <Button
          type="primary"
          shape="circle"
          size="small"
          className={styles.chatFab}
          icon={<Sparkles size={24} strokeWidth={1.75} />}
          onClick={() => setOpen(true)}
          aria-label="Open Diamond Inventory AI"
        />
      </div>

      <Drawer
        placement="right"
        size={440}
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
                <div className={styles.avatarRing}>
                  {/* <Diamond size={22} strokeWidth={1.5} /> */}
                  <img src={logo} alt="logo" className={styles.logo} />
                </div>
                <div className={styles.headerTitles}>
                  <h3>Smart Diamond Inventory AI</h3>
                  <p>Smart DIA · Surat, Gujarat</p>
                  <div className={styles.statusRow}>
                    <span className={styles.statusDot} />
                    <span className={styles.statusText}>Gemini 2.5 Flash · Live</span>
                  </div>
                </div>
              </div>
              <Button
                type="text"
                shape="circle"
                className={styles.closeBtn}
                icon={<X size={18} />}
                onClick={() => setOpen(false)}
                aria-label="Close chat"
              />
            </div>
            <div className={styles.headerChips}>
              <span className={styles.chip}>Inventory</span>
              <span className={styles.chip}>Pricing</span>
              <span className={styles.chip}>Stock Alerts</span>
              <span className={styles.chip}>Hinglish</span>
            </div>
          </header>

          <div className={styles.messagesArea}>
            {messages.length === 0 && !loading ? (
              <div className={styles.welcome}>
                <div className={styles.welcomeIcon}>
                  <Bot size={28} strokeWidth={1.5} />
                </div>
                {/* <div className={styles.welcomeTitle}>Namaste!</div> */}
                <div className={styles.welcomeTitle}>Hello!</div>
                <p className={styles.welcomeSub}>
                  Your luxury diamond inventory assistant is here to help with stock availability, pricing intelligence, and business insights—just ask.
                </p>
                <div className={styles.promptGrid}>
                  {QUICK_PROMPTS.map(({ icon: Icon, text }) => (
                    <Button
                      key={text}
                      className={styles.promptBtn}
                      onClick={() => sendMessage(text)}
                    >
                      <span>
                        <Icon size={14} />
                        {text}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div
                    key={`${msg.role}-${idx}`}
                    className={`${styles.messageRow} ${msg.role === "user" ? styles.userRow : ""
                      }`}
                  >
                    <div
                      className={`${styles.msgAvatar} ${msg.role === "user" ? styles.userAvatar : styles.aiAvatar
                        }`}
                    >
                      {msg.role === "user" ? (
                        <User size={16} />
                      ) : (
                        <Sparkles size={15} />
                      )}
                    </div>
                    <div className={styles.bubbleWrap}>
                      <span className={styles.bubbleLabel}>
                        {msg.role === "user" ? "You" : "Diamond AI"}
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
                        {msg.content}
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
                      <span className={styles.bubbleLabel}>Diamond AI</span>
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
            <div className={styles.inputWrap}>
              <textarea
                ref={textareaRef}
                className={styles.chatTextarea}
                placeholder="Enter YOur Question... inventory, stock, price..."
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
              <Button
                className={styles.sendBtn}
                icon={<Send size={17} strokeWidth={2.25} />}
                onClick={handleSend}
                loading={loading}
                disabled={!input.trim()}
                aria-label="Send message"
              />
            </div>
            <p className={styles.inputHint}>
              Press Enter send · Shift+Enter New Line
            </p>
            {messages.length > 0 ? (
              <div className={styles.footerActions}>
                <Button type="link" className={styles.clearBtn} onClick={handleClear}>
                  Clear conversation
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Drawer>
    </>
  );
};

export default FloatingAIChat;
