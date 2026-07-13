import { useState } from "react";
import "../../assets/css/contactSuport.css";

const faqs = [
  {
    q: "Mera order kahan hai?",
    a: "Order ID ke saath tracking page par status dekhein. Status update nahi hua toh courier ko 24 ghante ka samay dein, phir ticket banayein.",
  },
  {
    q: "Refund kab tak aayega?",
    a: "Approve hone ke baad refund 5–7 working days mein original payment method mein wapas aata hai.",
  },
  {
    q: "Password reset nahi ho raha",
    a: 'Spam folder check karein. Email nahi mila toh "Account access" topic ke saath ticket banayein, hum manually verify karke madad karenge.',
  },
  {
    q: "App crash ho rahi hai",
    a: "App ko update karein aur phone restart karein. Phir bhi problem ho toh device model aur app version ticket mein likhein.",
  },
];

const channels = [
  {
    icon: "@",
    title: "Email",
    line: "support@aapkacompany.com",
    meta: "Reply within 2 hours",
  },
  {
    icon: "☎",
    title: "Phone",
    line: "1800-123-4567 (toll-free)",
    meta: "Mon–Sat, 9am – 9pm",
  },
  {
    icon: "💬",
    title: "Live Chat",
    line: "App ya website ke bottom-right corner mein",
    meta: "Available 24×7",
  },
  {
    icon: "📍",
    title: "Office",
    line: "Surat, Gujarat — walk-in by appointment",
    meta: "Tue–Fri, 11am – 5pm",
  },
];

const ContactSupport = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    order: "",
    topic: "Billing aur payments",
    priority: "Normal",
    msg: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="support-page">
      <section className="hero">
        <div className="eyebrow">Support Center</div>
        <h1 className="display">Aapki problem, hamari priority.</h1>
        <p>
          Form bharein ya seedha humse judein — jo bhi aapke liye sahi ho.
          Average reply time 2 ghante se kam hai.
        </p>

        <div className="status-strip">
          <div className="status-pill">
            <span className="num">2 hrs</span>
            <span className="lbl">Average response time</span>
          </div>
          <div className="status-pill">
            <span className="num">24×7</span>
            <span className="lbl">Chat support available</span>
          </div>
          <div className="status-pill">
            <span className="num">98%</span>
            <span className="lbl">Issues resolved first reply mein</span>
          </div>
        </div>
      </section>

      <main className="main">
        <div className="card">
          <h2 className="display">Ticket banayein</h2>
          <p className="sub">Jitni detail denge, utni jaldi solution milega.</p>

          {submitted ? (
            <div className="success-box">
              <strong>Aapka ticket submit ho gaya.</strong>
              <p>Hum jaldi reply karenge. Confirmation email check karein.</p>
              <button className="submit" onClick={() => setSubmitted(false)}>
                Naya ticket banayein
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label htmlFor="name">Naam</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Aapka pura naam"
                value={form.name}
                onChange={handleChange}
                required
              />

              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="aapka@email.com"
                value={form.email}
                onChange={handleChange}
                required
              />

              <label htmlFor="order">Order / Account ID (optional)</label>
              <input
                id="order"
                name="order"
                type="text"
                placeholder="e.g. ORD-48213"
                value={form.order}
                onChange={handleChange}
              />

              <label htmlFor="topic">Topic</label>
              <select
                id="topic"
                name="topic"
                value={form.topic}
                onChange={handleChange}
              >
                <option>Billing aur payments</option>
                <option>Account access</option>
                <option>Product / technical issue</option>
                <option>Delivery / order status</option>
                <option>Kuch aur</option>
              </select>

              <label>Priority</label>
              <div className="priority-row">
                {["Normal", "Urgent", "Sirf sawaal"].map((p) => (
                  <label className="opt" key={p}>
                    <input
                      type="radio"
                      name="priority"
                      value={p}
                      checked={form.priority === p}
                      onChange={handleChange}
                    />
                    {p}
                  </label>
                ))}
              </div>

              <label htmlFor="msg">Apni problem batayein</label>
              <textarea
                id="msg"
                name="msg"
                placeholder="Kya hua, kab hua, aur aapne kya try kiya — sab likhein."
                value={form.msg}
                onChange={handleChange}
                required
              />

              <button className="submit" type="submit">
                Ticket bhejein
              </button>
              <p className="hint">Submit karte hi confirmation email aayega.</p>
            </form>
          )}
        </div>

        <div className="card">
          <h2 className="display">Seedha baat karein</h2>
          <p className="sub">Form ke bina bhi aap humse judh sakte hain.</p>

          {channels.map((c) => (
            <div className="channel" key={c.title}>
              <div className="icon">{c.icon}</div>
              <div>
                <h3>{c.title}</h3>
                <p>{c.line}</p>
                <span className="meta">{c.meta}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      <section className="faq-section">
        <h2 className="display">Pehle yeh check kar lein</h2>

        {faqs.map((f, i) => (
          <details
            key={f.q}
            open={openFaq === i}
            onClick={(e) => {
              e.preventDefault();
              setOpenFaq(openFaq === i ? -1 : i);
            }}
          >
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>

      <footer>
        <span>© 2026 Aapka Company — Support Center</span>
        <span>
          <a href="#">Privacy Policy</a> · <a href="#">Terms</a>
        </span>
      </footer>
    </div>
  );
};

export default ContactSupport