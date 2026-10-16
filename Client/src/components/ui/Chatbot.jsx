import { useState } from "react";
import { MessageCircle, X, Send, ChevronDown, ChevronUp } from "lucide-react";
import { fetchPublicClinicSchedule } from "@/api/clientPortal.js";

// Real current rates (see Maintenance module) — this is a static FAQ bot,
// not a live lookup, so update these strings if prices change.
const FAQS = [
  {
    keywords: ["hour", "open", "close", "time"],
    answer:
      "We're open 9:00 AM – 6:00 PM daily. Grooming is closed on Sundays, and veterinarians are off on Wednesdays (the shop stays open for products/grooming that day).",
  },
  {
    keywords: ["price", "cost", "fee", "how much", "rate"],
    answer:
      "Consultation: ₱380 (₱1,500 for emergency/after-hours). Vaccination: ₱350–₱600 depending on type. Grooming: ₱420–₱1,100 depending on your pet's weight. Lab tests (CBC, Fecalysis, etc.) range ₱250–₱1,100.",
  },
  {
    keywords: ["groom"],
    answer:
      "Grooming is priced by weight: 1–7kg ₱420, 7–15kg ₱580, 15–22kg ₱700, 22–32kg ₱1,100. Closed Sundays.",
  },
  {
    keywords: ["vaccin"],
    answer:
      "We offer 3-in-1 (₱350), 5-in-1 (₱450), and 8-in-1 (₱600) vaccines.",
  },
  {
    keywords: ["book", "appointment", "schedule"],
    answer:
      "You can book an appointment right here in the portal — go to Appointments and pick a service, date, and time.",
  },
  {
    keywords: ["pay", "gcash", "cash"],
    answer: "We accept Cash and GCash, in person or through the portal.",
  },
  {
    keywords: ["address", "location", "where"],
    answer: "PetVet Cycle Animal and Grooming Center, IBP Road, Commonwealth, Quezon City.",
  },
];

const AVAILABILITY_KEYWORDS = ["available", "availab", "open date", "free date", "slot", "when can"];

// Shown as tap-to-ask chips so visitors don't have to type — each `text` is
// just what gets typed into the same send() flow, matched by the keyword
// lists above like any other message.
const QUICK_QUESTIONS = [
  "What are your hours?",
  "How much is a consultation?",
  "Grooming prices?",
  "Vaccine prices?",
  "How do I book an appointment?",
  "What dates are available?",
  "Payment methods?",
  "Where are you located?",
];

function toDateString(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const BOOKING_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17]; // 9AM-6PM fixed slots

function formatHour(h) {
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${period}`;
}

// Reuses the same public endpoint LandingPage's LiveCalendar already uses —
// a date counts as "open" if it has 3 or fewer bookings across all staff,
// same bucket LiveCalendar shows as green/amber vs red. For the nearest
// open day, also breaks bookings down by the fixed hourly slot (same 9AM-6PM
// slots the booking form uses) so the reply names actual open times, not
// just the day.
async function availabilityAnswer() {
  const today = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 13);
  const rows = await fetchPublicClinicSchedule({
    start_date: toDateString(today),
    end_date: toDateString(end),
  });

  const counts = rows.reduce((acc, r) => {
    acc[r.appointment_date] = (acc[r.appointment_date] || 0) + 1;
    return acc;
  }, {});

  let firstOpenDateStr = null;
  let firstOpenLabel = "";
  const openDates = [];
  for (let i = 0; i < 14 && openDates.length < 5; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const count = counts[toDateString(d)] || 0;
    if (count <= 3) {
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      openDates.push(label);
      if (!firstOpenDateStr) {
        firstOpenDateStr = toDateString(d);
        firstOpenLabel = label;
      }
    }
  }

  if (!openDates.length) {
    return "The next two weeks look fully booked — please check the calendar for dates further out.";
  }

  // start_time is a bare "YYYY-MM-DD HH:mm:ss" wall-clock string (see
  // AddAppointmentModal.jsx's extractHour comment) — never new Date() it,
  // that's exactly the timezone-shift bug fixed elsewhere in this app.
  const hourCounts = rows
    .filter((r) => r.appointment_date === firstOpenDateStr)
    .reduce((acc, r) => {
      const h = Number(r.start_time.split(" ")[1].split(":")[0]);
      acc[h] = (acc[h] || 0) + 1;
      return acc;
    }, {});
  const openHours = BOOKING_HOURS.filter((h) => (hourCounts[h] || 0) <= 2).map(formatHour);

  return (
    `Open days in the next two weeks: ${openDates.join(", ")}. ` +
    (openHours.length
      ? `On ${firstOpenLabel}, open times: ${openHours.join(", ")}. `
      : "") +
    "(Grooming is closed Sundays, vets are off Wednesdays.)"
  );
}

async function answerFor(text) {
  const lower = text.toLowerCase();
  if (AVAILABILITY_KEYWORDS.some((k) => lower.includes(k))) {
    try {
      return await availabilityAnswer();
    } catch {
      return "Couldn't check the calendar right now — please try the Appointments page directly.";
    }
  }
  const hit = FAQS.find((f) => f.keywords.some((k) => lower.includes(k)));
  return (
    hit?.answer ??
    "I'm not sure about that one — please contact the clinic directly for details."
  );
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! Ask me about hours, prices, grooming, vaccines, or booking." },
  ]);

  async function sendText(text) {
    if (!text) return;
    setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    const reply = await answerFor(text);
    setMessages((m) => [...m, { from: "bot", text: reply }]);
  }

  function send(e) {
    e.preventDefault();
    sendText(input.trim());
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="w-80 h-128 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white">
            <span className="font-semibold text-sm">PetVet Assistant</span>
            <button onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-sm px-3 py-2 rounded-lg max-w-[85%] ${
                  m.from === "bot"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                    : "bg-indigo-600 text-white ml-auto"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowQuick((v) => !v)}
            className="flex items-center gap-1 px-3 py-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800"
          >
            {showQuick ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            Quick questions
          </button>
          {showQuick && (
            <div className="flex flex-wrap gap-1 px-3 pb-1.5 max-h-16 overflow-y-auto">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendText(q)}
                  className="text-[10px] leading-tight px-1.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={send} className="flex border-t border-slate-200 dark:border-slate-800">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 px-3 py-2 text-sm bg-transparent outline-none text-slate-900 dark:text-slate-100"
            />
            <button type="submit" className="px-3 text-indigo-600 dark:text-indigo-400" aria-label="Send">
              <Send size={18} />
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-500"
          aria-label="Open chat"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
}
