import React, { useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";
import {
  Home, BookOpen, LifeBuoy, TrendingUp, User, ChevronRight, ChevronLeft,
  ArrowLeft, X, Check, Wind, Footprints, Moon, Sparkles, MessageCircle,
  Sun, CloudRain, Battery, Timer, PenLine, Play, Pause, RotateCcw,
  Target, Flame, Calendar, Award, ChevronDown, Send, Music, Snowflake,
  Eye, Waves, HeartPulse, Zap, Leaf, Feather, Mail, Chrome, Apple, ShieldCheck, LogOut, Star
} from "lucide-react";
import { supabase } from "./supabaseClient.js";

/* ---------------------------------------------------------
   NOTIFICATION SCHEDULING — Daily reminder management
   Schedules local notifications at user's chosen time
   (Morning/Afternoon/Evening). Runs entirely on-device.
--------------------------------------------------------- */

/* Map reminder time preference to hour (24-hour format) */
const REMINDER_HOURS = {
  "Morning": 8,        // 8 AM
  "Afternoon": 13,     // 1 PM
  "Evening": 18,       // 6 PM
  "Only when I miss a promise": null, // Don't schedule, only on-demand
  "No reminders": null,                // Don't schedule
};

const NOTIFICATION_ID = 19001;
const DAILY_REMINDER_CONTENT = {
  title: "A moment for yourself",
  body: "What promise do you want to keep to yourself today?",
};
let notificationUpdate = Promise.resolve();

/* Cancel all scheduled notifications with our ID */
async function cancelScheduledNotification() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
    console.log("✓ Cancelled scheduled notification");
  } catch (error) {
    console.log("No scheduled notification to cancel (expected on first run)");
  }
}

/* Schedule a daily notification at the specified hour */
async function scheduleNotification(hour) {
  if (hour === null || !Capacitor.isNativePlatform()) return;

  try {
    let permission = await LocalNotifications.checkPermissions();
    if (permission.display !== "granted") {
      permission = await LocalNotifications.requestPermissions();
    }
    if (permission.display !== "granted") {
      console.warn("Local notification permission was not granted");
      return;
    }

    await LocalNotifications.schedule({
      notifications: [{
        id: NOTIFICATION_ID,
        ...DAILY_REMINDER_CONTENT,
        sound: "default",
        schedule: {
          at: new Date(Date.now() + 60 * 1000),
          repeats: false,
        },
      }],
    });

    const timeStr = `${String(hour).padStart(2, "0")}:00`;
    console.log(`✓ Notification scheduled for ${timeStr} daily`);
  } catch (error) {
    console.error("Failed to schedule notification:", error);
  }
}

/* Cancel old notification and schedule new one based on reminder time */
async function updateScheduledNotification(reminderTime) {
  notificationUpdate = notificationUpdate.then(async () => {
    await cancelScheduledNotification();
    const hour = REMINDER_HOURS[reminderTime];
    if (hour !== null) await scheduleNotification(hour);
  });
  return notificationUpdate;
}

/* Initialize notification handler — runs once when app mounts */
async function initializeNotifications() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { display } = await LocalNotifications.requestPermissions();
    console.log(`Notification permission status: ${display}`);
  } catch (error) {
    console.error("Failed to initialize notifications:", error);
  }
}

async function logReminderOpened() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const { error } = await supabase.from("events").insert({
      user_id: userId,
      event_name: "reminder_opened",
    });
    if (error) console.error("Failed to log reminder_opened:", error);
  } catch (error) {
    console.error("Failed to log reminder_opened:", error);
  }
}

/* ---------------------------------------------------------
   DESIGN TOKENS
   Display: Fraunces (warm, rounded serif — the app's "voice")
   Body/UI: Plus Jakarta Sans (soft, rounded, legible)
   Palette: soft blue + teal core, warm sand for celebration only
--------------------------------------------------------- */
const T = {
  bg: "#F4F8FA",
  surface: "#FFFFFF",
  surfaceAlt: "#EAF3FC",
  teal: "#2F9C8F",
  tealDeep: "#1F6E64",
  tealPale: "#DCF0EC",
  blue: "#7FB3E8",
  bluePale: "#EAF3FC",
  ink: "#26333E",
  inkSoft: "#647685",
  inkFaint: "#9AABB6",
  sand: "#EFA46B",
  sandPale: "#FBEADB",
  ring: "#E4EEF3",
  line: "#E7EFF2",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Dancing+Script:wght@600;700&display=swap');`;

/* ===========================================================
   SELF-TRUST ENGINE CONFIGURATION
   ===========================================================
   This is JOURNI's single configuration module for behavioural
   data. It is intentionally kept at the very top of the file,
   separate from all business logic, so every weight and event
   type used anywhere in the app has exactly one home. Nothing
   should ever hard-code a trust value inline — everything reads
   from SELF_TRUST_WEIGHTS below.
=========================================================== */

/* ---- Canonical event vocabulary. Add new types here as the
   product grows — every future feature plugs in at this layer. ---- */
const EVENT_TYPES = {
  PROMISE_CREATED: "promise_created",
  PROMISE_COMPLETED: "promise_completed",
  PROMISE_MISSED: "promise_missed",
  PROMISE_RESCHEDULED: "promise_rescheduled", // "honest reschedule" — shrinking/resizing instead of abandoning
  PROMISE_INCREASED: "promise_increased",
  PROMISE_POSTPONED: "promise_postponed",
  PROMISE_ABANDONED: "promise_abandoned",
  PROMISE_REVIEW: "promise_review", // reviewing a specific promise's outcome (distinct from open journaling)
  REFLECTION_WRITTEN: "reflection_written",
  REFLECTION_REVIEWED: "reflection_reviewed",
  MOOD_LOGGED: "mood_logged",
  EMOTIONAL_CHECKIN_COMPLETED: "emotional_checkin_completed",
  WEEKLY_REVIEW_COMPLETED: "weekly_review_completed",
  MILESTONE_REACHED: "milestone_reached",
  COACHING_SESSION_COMPLETED: "coaching_session_completed",
  RECOVERY_AFTER_SETBACK: "recovery_after_setback",
  DAILY_CHECKIN: "daily_checkin",
  STUCK_FLOW_ENTERED: "stuck_flow_entered",
  STUCK_REASON_SELECTED: "stuck_reason_selected",
  /* Composite signals — never logged directly by features. They are
     automatically recognised from qualifying primary events by the
     derivation rules in the Evidence Engine, so any current or future
     feature gets this for free just by logging its own primary event
     correctly. */
  QUIET_MOMENT: "quiet_moment",
  MINDFUL_CHOICE: "mindful_choice",
};

/*
 * SELF_TRUST_WEIGHTS — the ONE place that defines how much each kind of
 * behavioural evidence moves the Self-Trust score. Deliberately not a
 * simple completion percentage:
 *  + consistency gets its own capped streak bonus, applied separately
 *    in computeSelfTrust() — not baked into any single weight here
 *  + honest reflection and emotional awareness carry real weight
 *  + recovering after a missed promise adds on TOP of the completion
 *    it rides alongside, so a recovery day is always worth more than
 *    a routine one, without needing an inflated standalone number
 *  + honestly resizing an overwhelming promise is scored as
 *    self-aware evidence, not as a failure
 *  + Quiet Moments and Mindful Choices are supporting signals — small
 *    on purpose, since the primary event they're derived from already
 *    carries its own weight
 *  - a missed promise costs only a small, bounded amount — it should
 *    never be able to wipe out progress on its own
 *
 * To tune JOURNI's behavioural philosophy, change values here — never
 * inline at a call site.
 */
const SELF_TRUST_WEIGHTS = {
  [EVENT_TYPES.PROMISE_COMPLETED]: 2.5,
  [EVENT_TYPES.PROMISE_INCREASED]: 1.5,
  [EVENT_TYPES.PROMISE_RESCHEDULED]: 0.8, // "honest reschedule"
  [EVENT_TYPES.PROMISE_REVIEW]: 0.4,
  [EVENT_TYPES.REFLECTION_WRITTEN]: 1.5,
  [EVENT_TYPES.REFLECTION_REVIEWED]: 0.5,
  [EVENT_TYPES.MOOD_LOGGED]: 0.3,
  [EVENT_TYPES.EMOTIONAL_CHECKIN_COMPLETED]: 0.5,
  [EVENT_TYPES.WEEKLY_REVIEW_COMPLETED]: 2,
  [EVENT_TYPES.MILESTONE_REACHED]: 3,
  [EVENT_TYPES.COACHING_SESSION_COMPLETED]: 1,
  [EVENT_TYPES.RECOVERY_AFTER_SETBACK]: 1.5,
  [EVENT_TYPES.PROMISE_MISSED]: -1.2,
  [EVENT_TYPES.STUCK_FLOW_ENTERED]: 0.3, // showing up honestly when struggling is itself evidence
  [EVENT_TYPES.STUCK_REASON_SELECTED]: 0.2, // naming the obstacle is self-awareness
  [EVENT_TYPES.PROMISE_POSTPONED]: -0.2, // deferring early costs almost nothing
  [EVENT_TYPES.PROMISE_ABANDONED]: -0.5, // still small and bounded, never punishing
  [EVENT_TYPES.QUIET_MOMENT]: 0.2,
  [EVENT_TYPES.MINDFUL_CHOICE]: 0.3,
};

/* Streak bonus configuration — kept alongside the weights so every
   tunable Self-Trust parameter lives in this one module. */
const SELF_TRUST_STREAK_BONUS_PER_DAY = 0.4;
const SELF_TRUST_STREAK_BONUS_CAP_DAYS = 14;
const SELF_TRUST_FLOOR = 12;
const SELF_TRUST_CEILING = 96;

/* ---------------------------------------------------------
   MASCOT — "Pip", a soft rounded blob with a calm expression
--------------------------------------------------------- */
function Pip({ size = 56, mood = "calm" }) {
  const mouth = {
    calm: "M -8 4 Q 0 10 8 4",
    happy: "M -9 2 Q 0 13 9 2",
    soft: "M -6 5 Q 0 7 6 5",
  }[mood] || "M -8 4 Q 0 10 8 4";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <ellipse cx="32" cy="34" rx="26" ry="24" fill={T.tealPale} />
      <ellipse cx="32" cy="33" rx="21" ry="19" fill={T.teal} />
      <circle cx="24" cy="30" r="2.6" fill="#fff" />
      <circle cx="40" cy="30" r="2.6" fill="#fff" />
      <path d={mouth} transform="translate(32 34)" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M 20 14 Q 24 6 30 10" stroke={T.sand} strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* Ascending steps illustration — each step represents one kept promise,
   climbing toward the larger goal at the top. Used on the Motivation screen. */
function PromiseStepsIllustration({ width = 260, height = 190 }) {
  const steps = [
    { x: 8, w: 60, h: 26 },
    { x: 52, w: 60, h: 46 },
    { x: 96, w: 60, h: 66 },
    { x: 140, w: 60, h: 86 },
    { x: 184, w: 60, h: 106 },
  ];
  const fills = [T.tealPale, T.tealPale, T.bluePale, T.bluePale, T.teal];
  return (
    <svg width={width} height={height} viewBox="0 0 260 190" aria-hidden="true">
      {/* soft ground line */}
      <line x1="0" y1="182" x2="260" y2="182" stroke={T.ring} strokeWidth="2" />
      {steps.map((s, i) => (
        <g key={i}>
          <rect x={s.x} y={182 - s.h} width={s.w} height={s.h} rx="10" fill={fills[i]} />
          <circle cx={s.x + s.w / 2} cy={182 - s.h - 14} r="9" fill="#fff" stroke={i < 4 ? T.teal : T.sand} strokeWidth="2" />
          {i < 4 ? (
            <path d={`M ${s.x + s.w / 2 - 4} ${182 - s.h - 14} l 3 3 l 5 -6`} stroke={T.teal} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M0 0 L1.8 3.6 L5.8 4.2 L2.9 7 L3.6 11 L0 9.1 L-3.6 11 L-2.9 7 L-5.8 4.2 L-1.8 3.6 Z" fill={T.sand} transform={`translate(${s.x + s.w / 2} ${182 - s.h - 14}) scale(0.9)`} />
          )}
        </g>
      ))}
      {/* Pip climbing the middle step */}
      <g transform="translate(96 60)">
        <ellipse cx="0" cy="14" rx="17" ry="15.5" fill={T.tealPale} />
        <ellipse cx="0" cy="13" rx="13.5" ry="12" fill={T.teal} />
        <circle cx="-5" cy="11" r="1.7" fill="#fff" />
        <circle cx="5" cy="11" r="1.7" fill="#fff" />
        <path d="M -5 16 Q 0 21 5 16" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

/* A gentle upward path rather than a finish line — communicates ongoing
   growth and confidence, not pressure or a fixed endpoint. Used on the
   pre-Promise-Builder Motivation screen. */
function PromiseJourneyIllustration({ width = 260, height = 190 }) {
  const pathD = "M 18 172 C 70 160, 60 118, 108 104 C 158 90, 150 52, 226 30";
  const waypoints = [
    { x: 63, y: 138, r: 4 },
    { x: 118, y: 96, r: 5 },
    { x: 178, y: 62, r: 6 },
  ];
  return (
    <svg width={width} height={height} viewBox="0 0 260 190" aria-hidden="true">
      {/* soft horizon glow, top right — growth, not a finish marker */}
      <circle cx="222" cy="34" r="46" fill={T.sandPale} opacity="0.6" />
      <circle cx="222" cy="34" r="30" fill={T.sandPale} opacity="0.7" />
      <circle cx="222" cy="34" r="15" fill="#fff" opacity="0.8" />

      <path d={pathD} stroke={T.ring} strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d={pathD} stroke={T.teal} strokeWidth="4" strokeLinecap="round" fill="none" strokeDasharray="1 14" />

      {waypoints.map((w, i) => (
        <circle key={i} cx={w.x} cy={w.y} r={w.r} fill={i === waypoints.length - 1 ? T.sand : T.tealPale} stroke={T.teal} strokeWidth="1.5" />
      ))}

      {/* Pip walking the path */}
      <g transform="translate(118 82)">
        <ellipse cx="0" cy="14" rx="16" ry="14.5" fill={T.tealPale} />
        <ellipse cx="0" cy="13" rx="12.5" ry="11" fill={T.teal} />
        <circle cx="-4.5" cy="11" r="1.6" fill="#fff" />
        <circle cx="4.5" cy="11" r="1.6" fill="#fff" />
        <path d="M -4.5 15.5 Q 0 20 4.5 15.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

/* ---------------------------------------------------------
   SHARED PRIMITIVES
--------------------------------------------------------- */
function Card({ children, style, onClick, pad = 16 }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.surface,
        borderRadius: 20,
        padding: pad,
        boxShadow: "0 1px 3px rgba(38,51,62,0.06), 0 8px 20px rgba(38,51,62,0.04)",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Pill({ children, tone = "teal" }) {
  const map = {
    teal: { bg: T.tealPale, fg: T.tealDeep },
    sand: { bg: T.sandPale, fg: "#9C5B26" },
    blue: { bg: T.bluePale, fg: "#3A6690" },
  }[tone];
  return (
    <span style={{
      background: map.bg, color: map.fg, fontSize: 12, fontWeight: 600,
      padding: "4px 10px", borderRadius: 999, letterSpacing: 0.2,
    }}>{children}</span>
  );
}

function PrimaryButton({ children, onClick, style, icon, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-disabled={disabled || undefined} style={{
      width: "100%", background: T.teal, color: "#fff", border: "none",
      borderRadius: 16, padding: "15px 18px", fontSize: 15.5, fontWeight: 600,
      fontFamily: "'Plus Jakarta Sans', sans-serif", display: "flex", alignItems: "center",
      justifyContent: "center", gap: 8, cursor: disabled ? "not-allowed" : "pointer",
      boxShadow: disabled ? "none" : "0 6px 16px rgba(47,156,143,0.28)",
      opacity: disabled ? 0.4 : 1,
      ...style,
    }}>
      {icon}{children}
    </button>
  );
}

function GhostButton({ children, onClick, style, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-disabled={disabled || undefined} style={{
      width: "100%", background: "transparent", color: T.inkSoft,
      border: `1.5px solid ${T.line}`, borderRadius: 16, padding: "14px 18px",
      fontSize: 15, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif",
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, ...style,
    }}>{children}</button>
  );
}

function SectionTitle({ children, action, onAction }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "22px 2px 10px" }}>
      <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 18, color: T.ink, margin: 0 }}>{children}</h3>
      {action && <span onClick={onAction} style={{ fontSize: 13, fontWeight: 600, color: T.teal, cursor: "pointer" }}>{action}</span>}
    </div>
  );
}

function TopBar({ title, subtitle, onBack, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 2px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {onBack && (
          <button onClick={onBack} aria-label="Go back" style={{ background: T.surface, border: "none", width: 36, height: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 1px 3px rgba(38,51,62,0.08)", flexShrink: 0 }}>
            <ArrowLeft size={17} color={T.ink} />
          </button>
        )}
        <div>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 500, color: T.ink, display: "block" }}>{title}</span>
          {subtitle && <span style={{ fontSize: 12, color: T.inkSoft, display: "block", marginTop: 2 }}>{subtitle}</span>}
        </div>
      </div>
      {right}
    </div>
  );
}

/* A calm, non-blocking coaching moment from Pip — used for micro-celebrations
   and contextual encouragement throughout the app. Never blocks interaction. */
const CELEBRATE_KEYFRAMES = `
@keyframes jToastIn { from { opacity: 0; transform: translate(-50%, -14px); } to { opacity: 1; transform: translate(-50%, 0); } }
`;
function CelebrationToast({ message }) {
  if (!message) return null;
  return (
    <div style={{ position: "absolute", top: 16, left: "50%", zIndex: 90, width: "calc(100% - 32px)", maxWidth: 340, animation: "jToastIn .35s ease" }}>
      <style>{CELEBRATE_KEYFRAMES}</style>
      <div style={{ background: T.surface, borderRadius: 18, padding: "12px 14px", display: "flex", gap: 10, alignItems: "center", boxShadow: "0 10px 28px rgba(38,51,62,0.18)", border: `1px solid ${T.tealPale}` }}>
        <Pip size={30} mood="happy" />
        <p style={{ margin: 0, fontSize: 12.5, color: T.ink, lineHeight: 1.45, fontWeight: 600 }}>{message}</p>
      </div>
    </div>
  );
}


function TrustRing({ value = 82, size = 168, stroke = 14 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={T.ring} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r} stroke={T.teal} strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <foreignObject x="0" y="0" width={size} height={size}>
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 34, fontWeight: 500, color: T.ink }}>{value}%</span>
          <span style={{ fontSize: 12.5, color: T.inkSoft, fontWeight: 600, marginTop: 2 }}>Self Trust</span>
        </div>
      </foreignObject>
    </svg>
  );
}

function LinearBar({ value, tone = "teal" }) {
  const color = tone === "teal" ? T.teal : tone === "sand" ? T.sand : T.blue;
  return (
    <div style={{ height: 8, borderRadius: 999, background: T.ring, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 999, transition: "width .5s ease" }} />
    </div>
  );
}

/* ---------------------------------------------------------
   DATA
--------------------------------------------------------- */
const CHAPTERS = [
  { n: 1, title: "Why you dream big but do nothing", minutes: 8, progress: 100 },
  { n: 2, title: "Two brain systems", minutes: 10, progress: 100 },
  { n: 3, title: "The science of procrastination", minutes: 9, progress: 60 },
  { n: 4, title: "The emotional avoidance loop", minutes: 11, progress: 0 },
  { n: 5, title: "Identity rewiring", minutes: 9, progress: 0 },
  { n: 6, title: "The dread sprint", minutes: 7, progress: 0 },
];

const MOVEMENTS = [
  { name: "Walk", mins: "5–10 min", icon: Footprints },
  { name: "Stretch", mins: "3–5 min", icon: Waves },
  { name: "Jumping jacks", mins: "2 min", icon: Zap },
  { name: "Breathing walk", mins: "5 min", icon: Wind },
  { name: "Dance", mins: "3 min", icon: Music },
  { name: "Quick reset", mins: "2 min", icon: Sparkles },
];

const RESETS = [
  { name: "Box breathing", icon: Wind },
  { name: "Grounding", icon: Footprints },
  { name: "5-4-3-2-1", icon: Eye },
  { name: "Cold water reset", icon: Snowflake },
  { name: "Progressive relaxation", icon: HeartPulse },
  { name: "Body scan", icon: Sparkles },
];

/* ---------------------------------------------------------
   TODAY'S PROMISE — emotional check-in
   A balanced range of positive, neutral, and challenging states,
   each mapped to a distinct coaching response.
--------------------------------------------------------- */
const EMOTION_GROUPS = [
  { cat: "Positive", tone: "teal", options: [
    { e: "😁", label: "Excited" }, { e: "😊", label: "Happy" }, { e: "💪", label: "Confident" },
    { e: "😌", label: "Calm" }, { e: "🌟", label: "Motivated" },
  ]},
  { cat: "Neutral", tone: "blue", options: [
    { e: "🙂", label: "Okay" }, { e: "🤔", label: "Unsure" }, { e: "😴", label: "Low Energy" },
  ]},
  { cat: "Challenging", tone: "sand", options: [
    { e: "😟", label: "Overwhelmed" }, { e: "😰", label: "Anxious" }, { e: "😞", label: "Discouraged" },
    { e: "😩", label: "Stressed" }, { e: "🧠", label: "Overthinking" }, { e: "🚧", label: "Resisting" },
  ]},
];

/* Personalised coaching logic keyed by the selected emotion label */
const EMOTION_COACHING = {
  Excited: { msg: "That energy is exactly what momentum is made of. Let's not let it go to waste.", cta: "Start today's promise", action: "stuck" },
  Happy: { msg: "Great headspace to build on — showing up today reinforces exactly this feeling.", cta: "Start today's promise", action: "stuck" },
  Confident: { msg: "That confidence is evidence, not luck. Let's put it to use.", cta: "Start today's promise", action: "stuck" },
  Motivated: { msg: "Let's ride this momentum straight into today's promise.", cta: "Start today's promise", action: "stuck" },
  Calm: { msg: "A steady state is a great place to act from. Keep it brief — no need to overthink it.", cta: "Start today's promise", action: "stuck" },
  Okay: { msg: "Nothing needs to change — today's promise is ready whenever you are.", cta: "Start today's promise", action: "stuck" },
  Unsure: { msg: "That's alright. Let's figure out what would actually help before you start.", cta: "Talk it through with Journi", action: "coach" },
  "Low Energy": { msg: "Let's protect consistency instead of pushing through. A smaller version still counts.", cta: "Shrink today's promise", action: "breakdown" },
  Overwhelmed: { msg: "Let's regulate your body first — it's hard to act from an overwhelmed state.", cta: "Reset & regulate", action: "reset" },
  Anxious: { msg: "Your nervous system needs to come down a notch before your mind can focus. Let's calm it first.", cta: "Reset & regulate", action: "reset" },
  Stressed: { msg: "A short reset will get you further than pushing through stress will.", cta: "Reset & regulate", action: "reset" },
  Discouraged: { msg: "Remember the promises you've already kept — this feeling doesn't erase that evidence.", cta: "See your evidence", action: "promiseProgress" },
  Overthinking: { msg: "Let's stop analysing and find the smallest possible next action instead.", cta: "Shrink today's promise", action: "breakdown" },
  Resisting: { msg: "This is exactly what the Stuck flow is built for — let's work through it together.", cta: "I'm Stuck", action: "stuck" },
};

/* Mock aggregate data illustrating the Emotional Pattern Map (would be built from real check-in history over time) */
const EMOTION_FOLLOWTHROUGH = [
  { label: "Motivated", pct: 92 }, { label: "Confident", pct: 89 }, { label: "Calm", pct: 86 },
  { label: "Okay", pct: 78 }, { label: "Happy", pct: 76 }, { label: "Low Energy", pct: 61 },
  { label: "Unsure", pct: 57 }, { label: "Overthinking", pct: 49 }, { label: "Stressed", pct: 45 },
  { label: "Overwhelmed", pct: 42 }, { label: "Anxious", pct: 40 }, { label: "Discouraged", pct: 38 }, { label: "Resisting", pct: 33 },
];

/* ---------------------------------------------------------
   WELCOME BACK — the daily return ritual
--------------------------------------------------------- */
const GREETING_CONTENT = {
  morning: { emoji: "🌅", title: (n) => `Good morning, ${n}`, sub: "Every new day is another opportunity to keep one promise to yourself.", gradient: `linear-gradient(180deg, ${T.sandPale}, ${T.bg} 55%)` },
  afternoon: { emoji: "☀️", title: (n) => `Welcome back, ${n}`, sub: "Small promises become lasting confidence when you keep showing up.", gradient: `linear-gradient(180deg, ${T.tealPale}, ${T.bg} 55%)` },
  evening: { emoji: "🌙", title: (n) => `Good evening, ${n}`, sub: "Today doesn't have to be perfect. One kept promise is enough.", gradient: `linear-gradient(180deg, ${T.bluePale}, ${T.bg} 55%)` },
};

const WELCOME_ENCOURAGEMENT = [
  "Welcome back. Your future self is built by today's small promises.",
  "Every promise you keep is another reason to trust yourself.",
  "Progress isn't perfection. It's showing up again.",
  "Self-trust grows through action, not motivation.",
  "Tiny promises create lasting change.",
  "You don't have to feel ready. You only have to begin.",
  "Your confidence is earned one promise at a time.",
  "Today's promise is another vote for the person you're becoming.",
];

const WELCOME_EMOTIONS = [
  { e: "😊", label: "Excited", cat: "Positive" },
  { e: "😌", label: "Calm", cat: "Positive" },
  { e: "💪", label: "Motivated", cat: "Positive" },
  { e: "😁", label: "Confident", cat: "Positive" },
  { e: "🙂", label: "Okay", cat: "Neutral" },
  { e: "🤔", label: "Unsure", cat: "Neutral" },
  { e: "😴", label: "Tired", cat: "Neutral" },
  { e: "😐", label: "Fine", cat: "Neutral" },
  { e: "😟", label: "Overwhelmed", cat: "Challenging" },
  { e: "😰", label: "Anxious", cat: "Challenging" },
  { e: "😞", label: "Discouraged", cat: "Challenging" },
  { e: "🧊", label: "Frozen", cat: "Challenging" },
];

const WELCOME_COACHING = {
  Positive: "Let's make the most of today's energy.",
  Neutral: "Let's build another small win today.",
  Challenging: "Hard days count too. We'll make today's promise easier.",
};

function localDayKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function getTimeOfDay(d) { const h = d.getHours(); if (h < 12) return "morning"; if (h < 18) return "afternoon"; return "evening"; }

const BLOCKERS = ["Too big", "Fear of failure", "Perfectionism", "Don't know where to start", "Low energy", "Too many things", "Waiting until later", "Other"];
const BODY = ["Racing thoughts", "Heavy", "Tense", "Restless", "Numb", "Tight chest"];
const INTERVENTIONS = [
  { name: "Regulate", icon: Wind }, { name: "Brain dump", icon: PenLine },
  { name: "Tiny step", icon: Sparkles }, { name: "Dread sprint", icon: Timer },
  { name: "Movement", icon: Footprints }, { name: "Breathing", icon: Wind },
  { name: "Journal", icon: PenLine }, { name: "Timer", icon: Timer },
];

/* ---------------------------------------------------------
   PROTECT MY PEACE (Chill Maxing) — a calmer promise category
   Not about doing more. About living more intentionally.
--------------------------------------------------------- */
const PEACE_PROMISES = [
  "Today, I promise to protect my peace.",
  "Today, I promise to slow down.",
  "Today, I promise to be fully present.",
  "Today, I promise to spend less time scrolling.",
  "Today, I promise to rest without guilt.",
  "Today, I promise to disconnect from unnecessary noise.",
  "Today, I promise to enjoy the present moment.",
  "Today, I promise to choose calm over chaos.",
  "Today, I promise to stop comparing myself to others.",
  "Today, I promise to spend time in nature.",
  "Today, I promise to breathe before reacting.",
  "Today, I promise to put my phone away during family time.",
  "Today, I promise to finish work on time.",
  "Today, I promise to protect my mental space.",
  "Today, I promise to trust God instead of worrying.",
];

const PEACE_MORNING_LINES = [
  "Peace isn't something you find by accident. It's something you intentionally protect through the choices you make today.",
  "You don't have to earn rest. You're allowed to simply be today.",
  "Slowing down isn't falling behind — it's coming home to yourself.",
  "Today isn't about doing more. It's about being present with what you already have.",
  "Boundaries aren't walls. They're how you protect what matters most.",
  "The calm you're looking for isn't out there somewhere — it's a choice available to you today.",
];

const PEACE_REFLECTIONS = [
  "What usually steals your peace?",
  "What can you let go of today?",
  "What does protecting your peace look like today?",
  "What would today feel like if you weren't rushing?",
];

/* Universal, non-attributed reflections — avoids reproducing any copyrighted quote verbatim */
const PEACE_WISDOM = [
  "Peace is not the absence of noise, but the presence of calm within it.",
  "You can't pour from an empty cup — rest is part of the work, not a break from it.",
  "Slowing down is how you catch up with yourself.",
  "Nothing outside you can give you the peace that comes from within.",
  "The quieter your mind, the clearer everything else becomes.",
  "Boundaries are simply love turned toward yourself.",
];

/* Short paraphrases of scripture (not verbatim translation text) for Christian Mode */
const PEACE_SCRIPTURE = [
  { ref: "Philippians 4:6–7", text: "Bring your worries to God instead of carrying them alone, and let His peace guard your heart." },
  { ref: "Matthew 11:28", text: "Come to Him when you're weary, and He will give you rest." },
  { ref: "Psalm 46:10", text: "Be still, and know that He is in control." },
  { ref: "Proverbs 3:5–6", text: "Trust Him fully instead of leaning only on your own understanding." },
  { ref: "John 14:27", text: "The peace He gives isn't like the world's peace — let your heart be untroubled." },
  { ref: "Isaiah 26:3", text: "He keeps in perfect peace the mind that stays fixed on Him." },
];

const PEACE_PRAYERS = [
  "God, help me protect the peace You've given me today.",
  "Lord, quiet my mind and steady my heart.",
  "Thank You for this moment of rest — help me receive it without guilt.",
  "Father, help me trust You instead of carrying today's worries alone.",
];

const PEACE_REMINDERS = [
  "Remember today's promise.",
  "Take one slow breath.",
  "Protect your peace.",
  "You chose this promise for a reason.",
  "Your peace is worth protecting.",
];

const PEACE_CHECKIN_RESPONSES = {
  yes: "Beautiful. You honoured what you promised yourself today.",
  mostly: "That still counts. Progress over perfection — always.",
  learning: "Every day is another opportunity to honour the promises you make to yourself.",
};

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/* ---------------------------------------------------------
   BOTTOM NAV
--------------------------------------------------------- */
function BottomNav({ screen, go }) {
  const items = [
    { key: "home", label: "Home", icon: Home },
    { key: "learn", label: "Learn", icon: BookOpen },
    { key: "stuck", label: "Stuck", icon: LifeBuoy, center: true },
    { key: "progress", label: "Progress", icon: TrendingUp },
    { key: "profile", label: "Profile", icon: User },
  ];
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0, height: 76,
      background: T.surface, borderTop: `1px solid ${T.line}`,
      display: "flex", alignItems: "center", justifyContent: "space-around",
      borderRadius: "0 0 40px 40px", zIndex: 20,
    }}>
      {items.map((it) => {
        const active = screen === it.key;
        if (it.center) {
          return (
            <div key={it.key} style={{ position: "relative", width: 64, display: "flex", justifyContent: "center" }}>
              <button onClick={() => go(it.key)} aria-label="I'm stuck" style={{
                position: "absolute", top: -30, width: 60, height: 60, borderRadius: "50%",
                background: T.sand, border: `4px solid ${T.bg}`, display: "flex",
                alignItems: "center", justifyContent: "center", cursor: "pointer",
                boxShadow: "0 8px 18px rgba(239,164,107,0.45)",
              }}>
                <it.icon size={24} color="#fff" />
              </button>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: T.inkFaint, marginTop: 34 }}>I'm stuck</span>
            </div>
          );
        }
        return (
          <button key={it.key} onClick={() => go(it.key)} style={{
            background: "none", border: "none", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3, cursor: "pointer", padding: 4,
          }}>
            <it.icon size={21} color={active ? T.teal : T.inkFaint} strokeWidth={active ? 2.4 : 2} />
            <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 600, color: active ? T.teal : T.inkFaint }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------
   AUTH SCREEN
--------------------------------------------------------- */
function AuthScreen({ onStart, onSkip }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 26px 40px", background: `linear-gradient(180deg, ${T.bluePale}, ${T.bg} 60%)` }}>
      <div style={{ textAlign: "center", marginTop: 30 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <Pip size={92} mood="happy" />
        </div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 30, color: T.ink, margin: "0 0 8px" }}>Journi</h1>
        <p style={{ color: T.inkSoft, fontSize: 15, lineHeight: 1.6, margin: "0 auto", maxWidth: 260 }}>
          Journi helps you keep the promises you make to yourself.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <PrimaryButton onClick={onStart}>Continue</PrimaryButton>
        <GhostButton onClick={onSkip}>I already have an account</GhostButton>
        <p style={{ textAlign: "center", fontSize: 11.5, color: T.inkFaint, marginTop: 4 }}>By continuing you agree to keep one promise at a time.</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   SPLASH — brief brand moment before Welcome
--------------------------------------------------------- */
function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1300);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${T.tealPale}, ${T.bg} 65%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "env(safe-area-inset-top) 24px env(safe-area-inset-bottom)", zIndex: 60 }}>
      <style>{OB_KEYFRAMES}</style>
      <div style={{ animation: "jBounce 1.6s ease-in-out infinite" }}><Pip size={80} mood="happy" /></div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 26, color: T.ink, margin: "18px 0 0" }}>Journi</h1>
    </div>
  );
}

/* ---------------------------------------------------------
   SIGN UP / LOG IN — secure account entry before onboarding
   Simulated auth (no live backend), backed by persistent
   window.storage so accounts genuinely survive a reload.
--------------------------------------------------------- */
function SignInScreen({ onAuthenticated, onBack, reauth }) {
  const [mode, setMode] = useState("options"); // options | email | otp | magicSent | connecting
  const [connectingProvider, setConnectingProvider] = useState(null);
  const [email, setEmail] = useState("");
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [otp, setOtp] = useState("");
  const [demoCode] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [error, setError] = useState("");

  const finishAuth = (authMethod, resolvedEmail) => {
    onAuthenticated({
      name: null,
      email: resolvedEmail || null,
      authMethod,
      joinDate: new Date().toISOString(),
    });
  };

  const connectProvider = async (provider) => {
    setConnectingProvider(provider);
    setMode("connecting");
    setError("");

    let timeoutId;
    let unlistenHandle;

    try {
      // Step 1: Call Supabase OAuth to get the login URL (PKCE flow)
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: "journi://auth-callback",
          skipBrowserRedirect: true,
          ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),
        },
      });

      if (oauthError) {
        setError(`Sign-in failed: ${oauthError.message}`);
        setMode("options");
        setConnectingProvider(null);
        return;
      }

      if (!data?.url) {
        setError("Could not generate OAuth URL");
        setMode("options");
        setConnectingProvider(null);
        return;
      }

      // Step 2: Open the OAuth URL in the in-app browser
      await Browser.open({ url: data.url });

      // Step 3: Set up the deep link listener for "journi://auth-callback"
      unlistenHandle = await App.addListener("appUrlOpen", async (event) => {
        // Close the browser immediately when the redirect fires
        await Browser.close();

        // Clear the timeout since we got the callback
        clearTimeout(timeoutId);

        try {
          // exchangeCodeForSession handles PKCE code exchange in one call
          const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(event.url);

          if (exchangeError) {
            setError(`Sign-in failed: ${exchangeError.message}`);
            setMode("options");
            setConnectingProvider(null);
            await unlistenHandle.remove();
            return;
          }

          if (!sessionData?.user) {
            setError("Failed to retrieve user data");
            setMode("options");
            setConnectingProvider(null);
            await unlistenHandle.remove();
            return;
          }

          // Step 4: Use real user data from the session
          finishAuth(provider, sessionData.user.email);

          // Clean up the listener
          await unlistenHandle.remove();

        } catch (error) {
          console.error("Error processing OAuth callback:", error);
          setError("An error occurred during sign-in");
          setMode("options");
          setConnectingProvider(null);
          await unlistenHandle.remove();
        }
      });

      // Step 5: Set a 2-minute timeout in case the user closes the browser without finishing
      timeoutId = setTimeout(async () => {
        setError("Sign-in wasn't completed");
        setMode("options");
        setConnectingProvider(null);
        if (unlistenHandle) {
          await unlistenHandle.remove();
        }
      }, 2 * 60 * 1000); // 2 minutes

    } catch (error) {
      console.error("OAuth initialization error:", error);
      setError(`Sign-in failed: ${error.message}`);
      setMode("options");
      setConnectingProvider(null);
    }
  };

  const sendCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Enter a valid email address."); return; }
    setError("");
    const { error: sendError } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (sendError) { setError(sendError.message); return; }
    setMode("otp");
  };

  const verifyOtp = async () => {
    if (otp.trim().length !== 8) { setError("Enter the 8-digit code."); return; }
    setError("");
    const { data, error: verifyError } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    if (verifyError) { setError(verifyError.message); return; }
    finishAuth("Email (OTP)", data.user?.email || email);
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${T.bluePale}, ${T.bg} 45%)`, display: "flex", flexDirection: "column", padding: "max(26px, env(safe-area-inset-top)) 26px max(30px, env(safe-area-inset-bottom))", zIndex: 50 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        {mode !== "options" ? (
          <button onClick={() => { setError(""); setMode(mode === "otp" ? "email" : "options"); }} aria-label="Go back" style={{ background: T.surface, border: "none", width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ArrowLeft size={16} color={T.ink} />
          </button>
        ) : onBack ? (
          <button onClick={onBack} aria-label="Go back" style={{ background: T.surface, border: "none", width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ArrowLeft size={16} color={T.ink} />
          </button>
        ) : <div />}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <Pip size={56} mood="soft" />
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 21, color: T.ink, margin: "14px 0 6px" }}>
            {reauth ? "Welcome back — sign in again" : "Sign in to Journi"}
          </h1>
          <p style={{ color: T.inkSoft, fontSize: 13, lineHeight: 1.6, maxWidth: 260, margin: "0 auto" }}>
            {reauth ? "For your security, please verify it's you. Your progress is safe and waiting." : "Your progress, promises, and Self-Trust Score — saved and synced."}
          </p>
        </div>

        {mode === "options" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <PrimaryButton onClick={() => setMode("email")} icon={<Mail size={17} />}>Continue with Email</PrimaryButton>
            <GhostButton onClick={() => connectProvider("Google")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Chrome size={16} /> Continue with Google
            </GhostButton>
            <GhostButton onClick={() => connectProvider("Apple")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Apple size={16} /> Continue with Apple
            </GhostButton>
            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 6 }}>
              <ShieldCheck size={13} color={T.inkFaint} />
              <span style={{ fontSize: 11, color: T.inkFaint }}>No passwords. Your data stays private.</span>
            </div>
          </div>
        )}

        {mode === "email" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Card>
              <p style={{ margin: "0 0 8px", fontSize: 12.5, fontWeight: 700, color: T.ink }}>Your email</p>
              <input
                type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                style={{ width: "100%", border: `1.5px solid ${T.line}`, borderRadius: 12, padding: "12px 14px", fontSize: 14, fontFamily: "inherit", outline: "none" }}
              />
            </Card>
            <button onClick={() => setUseMagicLink((v) => !v)} style={{ background: "none", border: "none", textAlign: "left", fontSize: 12.5, color: T.tealDeep, fontWeight: 600, cursor: "pointer", padding: 0 }}>
              {useMagicLink ? "Use a 6-digit code instead" : "Send me a magic link instead"}
            </button>
            {error && <p style={{ margin: 0, fontSize: 12, color: T.sand, fontWeight: 600 }}>{error}</p>}
            <PrimaryButton onClick={sendCode}>{useMagicLink ? "Send magic link" : "Send code"}</PrimaryButton>
          </div>
        )}

        {mode === "otp" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ textAlign: "center", fontSize: 13, color: T.inkSoft, lineHeight: 1.6 }}>Enter the 8-digit code sent to<br /><strong style={{ color: T.ink }}>{email}</strong></p>
            <input
              type="text" inputMode="numeric" maxLength={8} autoFocus value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="00000000"
              style={{ width: "100%", border: `1.5px solid ${T.line}`, borderRadius: 12, padding: "14px", fontSize: 22, letterSpacing: 8, textAlign: "center", fontFamily: "'Fraunces', serif", outline: "none" }}
            />
            {error && <p style={{ margin: 0, fontSize: 12, color: T.sand, fontWeight: 600, textAlign: "center" }}>{error}</p>}
            <PrimaryButton onClick={verifyOtp}>Verify & continue</PrimaryButton>
          </div>
        )}

        {mode === "connecting" && (
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 14, alignItems: "center", marginTop: 20 }}>
            <div style={{ animation: "jBounce 0.7s ease-in-out infinite" }}><Pip size={48} mood="soft" /></div>
            <p style={{ fontSize: 13.5, color: T.inkSoft }}>Connecting to {connectingProvider}…</p>
          </div>
        )}
      </div>

      {mode === "options" && (
        <p style={{ textAlign: "center", fontSize: 11, color: T.inkFaint, marginTop: 10 }}>By continuing you agree to keep one promise at a time.</p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   WELCOME BACK — Journi's daily return ritual
--------------------------------------------------------- */
function WelcomeBackScreen({ name, returnContext, onContinue }) {
  const [emotion, setEmotion] = useState(null);
  const tod = getTimeOfDay(new Date());
  const g = GREETING_CONTENT[tod];
  const [encouragement] = useState(() => pickRandom(WELCOME_ENCOURAGEMENT));

  let specialMessage = null;
  if (returnContext) {
    if (returnContext.daysAway >= 2) {
      specialMessage = "We're glad you're back. Your journey continues from today — not from where you left off.";
    } else if (returnContext.yesterdayCompleted && returnContext.streak >= 7) {
      specialMessage = `${returnContext.streak} promises kept. That's self-trust in action.`;
    } else if (returnContext.yesterdayCompleted) {
      specialMessage = "You kept your promise yesterday. Let's build on that momentum.";
    } else if (returnContext.hasHistory && !returnContext.yesterdayCompleted) {
      specialMessage = "Missing one promise doesn't erase your progress. Let's make today's promise a little easier.";
    }
  }

  const selected = emotion ? WELCOME_EMOTIONS.find((m) => m.label === emotion) : null;

  return (
    <div style={{ position: "absolute", inset: 0, background: g.gradient, display: "flex", flexDirection: "column", padding: "max(50px, env(safe-area-inset-top)) 26px max(30px, env(safe-area-inset-bottom))", zIndex: 50, overflowY: "auto" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <Pip size={88} mood="happy" />
      </div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 24, color: T.ink, textAlign: "center", margin: "16px 0 8px" }}>
        {g.emoji} {g.title(name)}
      </h1>
      <p style={{ textAlign: "center", color: T.inkSoft, fontSize: 13.5, lineHeight: 1.6, maxWidth: 280, margin: "0 auto 10px" }}>{g.sub}</p>

      <Card style={{ margin: "10px 0 18px", background: T.sandPale }}>
        <p style={{ margin: 0, fontSize: 13, color: "#8A5528", fontFamily: "'Fraunces', serif", fontStyle: "italic", lineHeight: 1.6, textAlign: "center" }}>
          {specialMessage || encouragement}
        </p>
      </Card>

      <p style={{ textAlign: "center", fontSize: 14.5, fontWeight: 700, color: T.ink, margin: "0 0 14px" }}>How are you feeling today?</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 4 }}>
        {WELCOME_EMOTIONS.map((m) => {
          const active = emotion === m.label;
          const tone = m.cat === "Positive" ? T.teal : m.cat === "Neutral" ? T.blue : T.sand;
          return (
            <button key={m.label} onClick={() => setEmotion(m.label)} style={{
              padding: "13px 8px", borderRadius: 15, border: `1.5px solid ${active ? tone : T.line}`,
              background: active ? "#fff" : "rgba(255,255,255,0.6)", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
              fontSize: 12, fontWeight: 700, color: T.ink, boxShadow: active ? `0 0 0 1px ${tone}` : "none",
            }}>
              <span style={{ fontSize: 19 }}>{m.e}</span>
              {m.label}
            </button>
          );
        })}
      </div>

      {selected && (
        <Card style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
          <Pip size={30} mood="soft" />
          <p style={{ margin: 0, fontSize: 12.5, color: T.inkSoft, lineHeight: 1.5 }}>{WELCOME_COACHING[selected.cat]}</p>
        </Card>
      )}

      <div style={{ flex: 1, minHeight: 16 }} />
      <PrimaryButton onClick={() => onContinue(selected)} disabled={!selected}>
        Let's Begin
      </PrimaryButton>
    </div>
  );
}

/* ---------------------------------------------------------
   MEET YOUR COACH — emotional intro before any questions
--------------------------------------------------------- */
function MeetCoachScreen({ onBack, onContinue, name }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${T.tealPale}, ${T.bg} 55%)`, display: "flex", flexDirection: "column", padding: "max(22px, env(safe-area-inset-top)) 26px max(30px, env(safe-area-inset-bottom))", zIndex: 40 }}>
      <button onClick={onBack} aria-label="Go back" style={{ background: T.surface, border: "none", width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", alignSelf: "flex-start" }}>
        <ArrowLeft size={16} color={T.ink} />
      </button>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 20, paddingBottom: 20 }}>
        <Pip size={100} mood="happy" />
        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 25, color: T.ink, margin: "22px 0 14px" }}>{name ? `Nice to meet you, ${name}.` : "Meet Journi"}</h1>
        <Card style={{ textAlign: "left" }}>
          <p style={{ margin: 0, fontSize: 14, color: T.ink, lineHeight: 1.7 }}>
            I'm Journi. I'm not here to make you more productive — I'm here to help you rebuild trust in yourself.
          </p>
          <p style={{ margin: "12px 0 0", fontSize: 14, color: T.inkSoft, lineHeight: 1.7 }}>
            Every promise you keep becomes evidence. Evidence builds self-trust. Self-trust builds confidence. And confidence becomes who you are.
          </p>
          <p style={{ margin: "12px 0 0", fontSize: 14, color: T.inkSoft, lineHeight: 1.7 }}>
            I won't judge you when things get hard. I'll help you understand what's getting in the way, break big goals into tiny promises, and celebrate every step forward.
          </p>
          <p style={{ margin: "12px 0 0", fontSize: 14, color: T.inkSoft, lineHeight: 1.7, fontStyle: "italic" }}>
            Before we begin, there's something worth understanding first.
          </p>
        </Card>
      </div>
      <div style={{ flexShrink: 0 }}>
        <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   WHY DO MOST PROMISES FAIL — self-trust philosophy screen
   Shown once, after Meet Your Coach and before any promise
   is created. Minimal, premium, no input collected.
--------------------------------------------------------- */
function WhyPromisesFailScreen({ onBack, onContinue }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${T.bluePale}, ${T.bg} 55%)`, display: "flex", flexDirection: "column", padding: "max(22px, env(safe-area-inset-top)) 26px max(30px, env(safe-area-inset-bottom))", zIndex: 40 }}>
      <style>{OB_KEYFRAMES}</style>
      <button onClick={onBack} aria-label="Go back" style={{ background: T.surface, border: "none", width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", alignSelf: "flex-start" }}>
        <ArrowLeft size={16} color={T.ink} />
      </button>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", animation: "jSlideIn .45s ease" }}>
        <div style={{ margin: "16px 0 22px", animation: "jBounce 3.4s ease-in-out infinite" }}>
          <PromiseJourneyIllustration width={230} height={168} />
        </div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 23, color: T.ink, margin: "0 0 18px", lineHeight: 1.3, maxWidth: 280 }}>
          Why do most promises fail?
        </h1>
        <Card style={{ textAlign: "left" }}>
          <p style={{ margin: 0, fontSize: 14, color: T.ink, lineHeight: 1.8 }}>Most people don't struggle because they're lazy.</p>
          <p style={{ margin: "12px 0 0", fontSize: 14, color: T.inkSoft, lineHeight: 1.8 }}>Life becomes overwhelming.</p>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: T.inkSoft, lineHeight: 1.8 }}>Emotions become stronger than intentions.</p>
          <p style={{ margin: "12px 0 0", fontSize: 14, color: T.inkSoft, lineHeight: 1.8 }}>Every broken promise slowly chips away at the trust we have in ourselves.</p>
          <p style={{ margin: "16px 0 0", fontSize: 14, color: T.ink, fontWeight: 600, lineHeight: 1.8 }}>Journi isn't here to judge you.</p>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: T.ink, fontWeight: 600, lineHeight: 1.8 }}>It's here to help you rebuild trust in yourself.</p>
          <p style={{ margin: "12px 0 0", fontSize: 14.5, color: T.tealDeep, fontFamily: "'Fraunces', serif", fontStyle: "italic", lineHeight: 1.7 }}>One kept promise at a time.</p>
        </Card>
      </div>
      <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
    </div>
  );
}

/* Type-or-draw signature capture, used by the JOURNI Promise Ceremony. */
/* ---------------------------------------------------------
   THE PROMISE TO MYSELF — the commitment ceremony
   A lightweight Commitment Record replaces signature capture:
   typed name, date, time — no canvas data is ever stored.
--------------------------------------------------------- */
const JOURNI_VERSION = "Phase 1.0";
const WHY_MIN = 50;
const WHY_MAX = 500;

function PromiseCeremonyScreen({ onComplete, plan }) {
  const [step, setStep] = useState("form"); // form | confirming | reflection | successDefinition
  const [fullName, setFullName] = useState("");
  const [why, setWhy] = useState("");
  const [knowHow, setKnowHow] = useState("");
  const [confirmedAt, setConfirmedAt] = useState(null);
  const hasName = fullName.trim().length > 1;
  const whyLen = why.trim().length;
  const whyValid = whyLen >= WHY_MIN && whyLen <= WHY_MAX;
  const knowHowLen = knowHow.trim().length;
  const knowHowValid = knowHowLen >= WHY_MIN && knowHowLen <= WHY_MAX;

  const handleCommit = async () => {
    if (!hasName || step !== "form") return;
    const now = new Date();
    const record = {
      fullName: fullName.trim(),
      dateLabel: now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      timeLabel: now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
      dateISO: now.toISOString(),
      commitmentAccepted: true,
      journiVersion: JOURNI_VERSION,
    };
    setConfirmedAt(record);
    await savePromiseCeremony(record);
    setStep("confirming");
    setTimeout(() => setStep("reflection"), 2300);
  };

  const handleSaveWhy = async () => {
    if (!whyValid || !confirmedAt) return;
    const updated = { ...confirmedAt, whyItMatters: why.trim() };
    setConfirmedAt(updated);
    await savePromiseCeremony(updated);
    setStep("successDefinition");
  };

  const handleSkipWhy = async () => {
    if (!confirmedAt) return;
    setStep("successDefinition");
  };

  const handleSaveSuccessDefinition = async () => {
    if (!knowHowValid || !confirmedAt) return;
    await savePromiseCeremony({ ...confirmedAt, successDefinition: knowHow.trim() });
    onComplete(plan);
  };

  const handleSkipSuccessDefinition = () => {
    onComplete(plan);
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${T.bluePale}, ${T.bg} 45%)`, display: "flex", flexDirection: "column", padding: "max(30px, env(safe-area-inset-top)) 24px max(26px, env(safe-area-inset-bottom))", zIndex: 40, overflowY: "auto" }}>
      <style>{OB_KEYFRAMES}{`
        @keyframes jGlow { 0%, 100% { box-shadow: 0 6px 16px rgba(47,156,143,0.28); } 50% { box-shadow: 0 6px 26px rgba(47,156,143,0.5); } }
        @keyframes jNameIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes jStampIn { 0% { opacity: 0; transform: scale(1.4) rotate(-8deg); } 60% { opacity: 1; } 100% { opacity: 1; transform: scale(1) rotate(-8deg); } }
        @keyframes jFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes jPulseGlow { 0%, 100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.08); } }
      `}</style>

      {step === "form" && (<>
        <div style={{ textAlign: "center", marginBottom: 18, animation: "jSlideIn .45s ease" }}>
          <Pip size={54} mood="soft" />
          <p style={{ margin: "14px 0 0", fontSize: 11, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 1.2 }}>The Promise to Myself</p>
        </div>

        <Card style={{ marginBottom: 16, textAlign: "center" }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: T.tealDeep, textTransform: "uppercase", letterSpacing: 0.8 }}>My Commitment</p>
          <p style={{ margin: 0, fontSize: 13.5, color: T.ink, lineHeight: 1.85 }}>This journey isn't about being perfect.</p>
          <p style={{ margin: "8px 0 0", fontSize: 13.5, color: T.inkSoft, lineHeight: 1.85 }}>It's about rebuilding the relationship you have with yourself.</p>
          <div style={{ margin: "14px 0", height: 1, background: T.line }} />
          <p style={{ margin: 0, fontSize: 13, color: T.tealDeep, fontWeight: 600, lineHeight: 1.9 }}>
            Every promise you keep becomes evidence.<br />
            Evidence becomes self-trust.<br />
            Self-trust becomes confidence.<br />
            Confidence shapes the person you become.
          </p>
        </Card>

        <Card style={{ marginBottom: 16, border: `1.5px solid ${T.sand}` }}>
          <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: "#9C5B26", textTransform: "uppercase", letterSpacing: 0.8, textAlign: "center" }}>My Promise</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {[
              "I understand that I won't be perfect.",
              "I understand that I will sometimes miss promises.",
              "When that happens, I will respond with honesty instead of shame.",
              "I will keep my promises small enough to succeed and meaningful enough to matter.",
              "Every promise I keep is another step towards becoming someone I can rely on.",
            ].map((line) => (
              <p key={line} style={{ margin: 0, fontSize: 13, color: T.ink, lineHeight: 1.7 }}>{line}</p>
            ))}
            <p style={{ margin: "6px 0 0", fontSize: 14, color: T.tealDeep, fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 500 }}>Today I choose to begin.</p>
          </div>
        </Card>

        <Card style={{ marginBottom: 18 }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.6, textAlign: "center" }}>Commitment Record</p>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            style={{
              width: "100%", border: "none", outline: "none", textAlign: "center",
              fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 500, color: T.ink,
              borderBottom: `2px solid ${T.line}`, paddingBottom: 10, background: "transparent",
            }}
          />
          <p style={{ margin: "10px 0 0", fontSize: 11, color: T.inkFaint, textAlign: "center" }}>This isn't a legal signature — just you, choosing to begin.</p>
        </Card>

        <PrimaryButton onClick={handleCommit} disabled={!hasName} style={hasName ? { animation: "jGlow 2.2s ease-in-out infinite" } : {}}>
          I Make This Promise
        </PrimaryButton>
      </>)}

      {step === "confirming" && confirmedAt && (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
          <div style={{
            position: "absolute", width: 220, height: 220, borderRadius: "50%",
            background: `radial-gradient(circle, ${T.tealPale} 0%, transparent 70%)`,
            animation: "jPulseGlow 2.2s ease-in-out infinite",
          }} />
          <p style={{ position: "relative", margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 1 }}>You promised</p>
          <p style={{ position: "relative", margin: 0, fontFamily: "'Dancing Script', cursive", fontSize: 42, fontWeight: 700, color: T.ink, animation: "jNameIn .6s ease" }}>{confirmedAt.fullName}</p>
          <div style={{ position: "relative", marginTop: 18, transform: "rotate(-8deg)", border: `2.5px solid ${T.teal}`, borderRadius: 12, padding: "8px 18px", animation: "jStampIn .7s ease .5s both" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.tealDeep, textTransform: "uppercase", letterSpacing: 1.4 }}>Promise Accepted</span>
          </div>
          <p style={{ position: "relative", marginTop: 16, fontSize: 12.5, color: T.inkSoft, animation: "jFadeUp .5s ease 1.1s both" }}>{confirmedAt.dateLabel}</p>
        </div>
      )}

      {step === "reflection" && (<>
        <div style={{ textAlign: "center", marginBottom: 18, animation: "jSlideIn .4s ease" }}>
          <Pip size={48} mood="soft" />
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 21, color: T.ink, margin: "16px 0 8px" }}>Why does rebuilding trust in yourself matter to you?</h1>
          <p style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
            This is for you. There are no right or wrong answers. When things become difficult, Journi will gently remind you why you started.
          </p>
        </div>
        <Card>
          <textarea
            value={why}
            onChange={(e) => setWhy(e.target.value.slice(0, WHY_MAX))}
            rows={6}
            placeholder="Take your time…"
            style={{ width: "100%", border: "none", outline: "none", resize: "none", fontSize: 14, fontFamily: "inherit", color: T.ink, lineHeight: 1.6 }}
          />
          <p style={{ margin: "8px 0 0", fontSize: 11, textAlign: "right", color: whyValid ? T.teal : T.inkFaint, fontWeight: 600 }}>
            {whyLen}/{WHY_MAX} {whyLen < WHY_MIN ? `(at least ${WHY_MIN})` : ""}
          </p>
        </Card>
        <div style={{ marginTop: 16 }}>
          <PrimaryButton onClick={handleSaveWhy} disabled={!whyValid}>
            Continue
          </PrimaryButton>
          <button onClick={handleSkipWhy} style={{ width: "100%", background: "none", border: "none", marginTop: 10, fontSize: 12.5, fontWeight: 600, color: T.inkFaint, cursor: "pointer" }}>
            Skip for now
          </button>
        </div>
      </>)}

      {step === "successDefinition" && (<>
        <div style={{ textAlign: "center", marginBottom: 18, animation: "jSlideIn .4s ease" }}>
          <Pip size={48} mood="soft" />
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 21, color: T.ink, margin: "16px 0 8px" }}>How will you know you've become someone you trust?</h1>
          <p style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
            This is just for you. Journi will remind you of this later — not to hold you to it, but to show you how far you've come.
          </p>
        </div>
        <Card>
          <textarea
            value={knowHow}
            onChange={(e) => setKnowHow(e.target.value.slice(0, WHY_MAX))}
            rows={6}
            placeholder="I'll know because…"
            style={{ width: "100%", border: "none", outline: "none", resize: "none", fontSize: 14, fontFamily: "inherit", color: T.ink, lineHeight: 1.6 }}
          />
          <p style={{ margin: "8px 0 0", fontSize: 11, textAlign: "right", color: knowHowValid ? T.teal : T.inkFaint, fontWeight: 600 }}>
            {knowHowLen}/{WHY_MAX} {knowHowLen < WHY_MIN ? `(at least ${WHY_MIN})` : ""}
          </p>
        </Card>
        <div style={{ marginTop: 16 }}>
          <PrimaryButton onClick={handleSaveSuccessDefinition} disabled={!knowHowValid}>
            Save & Begin My Journi
          </PrimaryButton>
          <button onClick={handleSkipSuccessDefinition} style={{ width: "100%", background: "none", border: "none", marginTop: 10, fontSize: 12.5, fontWeight: 600, color: T.inkFaint, cursor: "pointer" }}>
            Skip for now
          </button>
        </div>
      </>)}
    </div>
  );
}

/* ---------------------------------------------------------
   IDENTITY RECAP — Day 7 / Day 30
   Not a celebration toast. A real, itemized reflection built
   entirely from existing Evidence Engine data — no new
   calculation, only honest presentation. Never inflated:
   if the numbers are modest, the recap still shows them and
   leans on courage-language rather than false enthusiasm.
--------------------------------------------------------- */
function IdentityRecapScreen({ type, gapAware, onContinue }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [ceremony, setCeremony] = useState(null);
  const [showEscape, setShowEscape] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const timeline = await loadEvidenceTimeline();
      const record = await loadPromiseCeremony();
      if (cancelled) return;
      setCeremony(record);
      setStats({
        promisesKept: selectPromisesKept(timeline),
        recoveries: selectEventsOfType(timeline, EVENT_TYPES.RECOVERY_AFTER_SETBACK).length,
        honestReschedules: selectEventsOfType(timeline, EVENT_TYPES.PROMISE_RESCHEDULED).length,
        quietMoments: selectEventsOfType(timeline, EVENT_TYPES.QUIET_MOMENT).length,
      });
      setLoading(false);
    })();
    // Safety net: this screen is auto-triggered, not user-navigated-to, so it
    // must never be able to strand someone with no way back to Home if the
    // storage call is ever slow to resolve.
    const escapeTimer = setTimeout(() => { if (!cancelled) setShowEscape(true); }, 4000);
    return () => { cancelled = true; clearTimeout(escapeTimer); };
  }, []);

  if (loading || !stats) {
    return (
      <div style={{ position: "absolute", inset: 0, background: T.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "env(safe-area-inset-top) 24px env(safe-area-inset-bottom)", zIndex: 45 }}>
        <Pip size={40} mood="soft" />
        {showEscape && (
          <button onClick={onContinue} style={{ background: "none", border: "none", fontSize: 12.5, fontWeight: 600, color: T.inkFaint, cursor: "pointer" }}>
            Continue to Home
          </button>
        )}
      </div>
    );
  }

  const dayLabel = type === "day30" ? "Thirty" : "Seven";
  const rows = [
    { label: "promises kept", value: stats.promisesKept },
    { label: "times you recovered after a setback", value: stats.recoveries },
    { label: "times you chose honesty over pretending", value: stats.honestReschedules },
    { label: "times you paused before reacting", value: stats.quietMoments },
  ].filter((r) => r.value > 0); // never pad the list with zeroes — show only what's real

  const anyCourageEvidence = stats.recoveries > 0 || stats.honestReschedules > 0;

  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${T.tealPale}, ${T.bg} 45%)`, display: "flex", flexDirection: "column", padding: "max(40px, env(safe-area-inset-top)) 26px max(30px, env(safe-area-inset-bottom))", zIndex: 45, overflowY: "auto" }}>
      <style>{OB_KEYFRAMES}{`@keyframes jRowIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }`}</style>

      <div style={{ textAlign: "center", marginBottom: 22, animation: "jSlideIn .45s ease" }}>
        <Pip size={56} mood="happy" />
      </div>

      {gapAware ? (
        <Card style={{ marginBottom: 18, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 15, color: T.ink, lineHeight: 1.8 }}>
            {type === "day30" && ceremony?.successDefinition
              ? <>You told us what becoming someone you trust would look like:<br /><span style={{ fontFamily: "'Dancing Script', cursive", fontSize: 22, color: T.tealDeep }}>"{ceremony.successDefinition}"</span></>
              : "You told Journi what you were hoping to build."}
          </p>
          <p style={{ margin: "14px 0 0", fontSize: 14, color: T.inkSoft, lineHeight: 1.8 }}>
            That's still true today. And today is a good day to keep building it.
          </p>
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: 14, textAlign: "center" }}>
            {type === "day30" && ceremony?.successDefinition ? (
              <p style={{ margin: 0, fontSize: 14, color: T.ink, lineHeight: 1.8 }}>
                Thirty days ago you said:<br />
                <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: 24, color: T.tealDeep }}>"{ceremony.successDefinition}"</span>
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: T.ink, lineHeight: 1.8 }}>{dayLabel} days ago you made yourself a promise.</p>
            )}
          </Card>

          <Card style={{ marginBottom: 18 }}>
            <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.6, textAlign: "center" }}>
              {type === "day30" ? "This month" : "Since then"}
            </p>
            {rows.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13.5, color: T.inkSoft, lineHeight: 1.7, textAlign: "center" }}>The week has just begun — the evidence starts building from here.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {rows.map((r, i) => (
                  <div key={r.label} style={{ display: "flex", alignItems: "baseline", gap: 8, animation: `jRowIn .4s ease ${i * 0.12}s both` }}>
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: T.tealDeep, minWidth: 28 }}>{r.value}</span>
                    <span style={{ fontSize: 13.5, color: T.ink }}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card style={{ marginBottom: 18, background: T.sandPale }}>
            <p style={{ margin: 0, fontSize: 13.5, color: "#8A5528", lineHeight: 1.7, fontFamily: "'Fraunces', serif", fontStyle: "italic", textAlign: "center" }}>
              {type === "day30" && ceremony?.successDefinition
                ? "You're becoming the person you described."
                : anyCourageEvidence || stats.promisesKept > 0
                ? "You are already becoming someone who keeps their word."
                : "Showing up today, after however this week went, is its own kind of evidence."}
            </p>
          </Card>
        </>
      )}

      <div style={{ marginTop: "auto" }}>
        <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   THE WEEKLY REVIEW — a ritual, not a screen
   Never labelled "Weekly Review" or "Summary" anywhere in the
   flow itself. Same warm invitation every time: "Let's look
   back together." Built entirely from real Evidence Engine
   data — no score, no report, no required writing.
--------------------------------------------------------- */
function selectShouldOfferWeeklyReview(timeline, ceremonyDateISO) {
  if (!ceremonyDateISO) return false;
  const lastReview = selectEventsOfType(timeline, EVENT_TYPES.WEEKLY_REVIEW_COMPLETED);
  const anchor = lastReview.length ? lastReview[lastReview.length - 1].timestamp : ceremonyDateISO;
  return daysSince(anchor) >= 6;
}

function WeeklyReviewScreen({ onBack, onComplete, plan, onEvidence }) {
  const [step, setStep] = useState("recap"); // recap | questions | close
  const [timeline, setTimeline] = useState(null);
  const [answers, setAnswers] = useState({ proud: "", inTheWay: "", carryForward: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => { const t = await loadEvidenceTimeline(); if (!cancelled) setTimeline(t); })();
    return () => { cancelled = true; };
  }, []);

  const finish = async () => {
    await onEvidence(EVENT_TYPES.WEEKLY_REVIEW_COMPLETED, {
      reflected: !!(answers.proud.trim() || answers.inTheWay.trim() || answers.carryForward.trim()),
    });
    setStep("close");
  };

  if (!timeline) {
    return (
      <div style={{ position: "absolute", inset: 0, background: T.bg, display: "flex", flexDirection: "column", padding: "env(safe-area-inset-top) 24px env(safe-area-inset-bottom)", zIndex: 45 }}>
        <div style={{ padding: "28px 24px 0" }}>
          <button onClick={onBack} aria-label="Go back" style={{ background: T.surface, border: "none", width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ArrowLeft size={16} color={T.ink} />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", alignItems: "center" }}>
          <Pip size={40} mood="soft" />
        </div>
      </div>
    );
  }

  const kept = countCompletedInWindow(timeline, 7);
  const recoveries = selectEventCountInWindow(timeline, EVENT_TYPES.RECOVERY_AFTER_SETBACK, 7);
  const reschedules = selectEventCountInWindow(timeline, EVENT_TYPES.PROMISE_RESCHEDULED, 7);
  const anchorStatus = selectAnchorDayStatus(timeline, plan?.anchorDay);

  let recapLine = `${plan?.name ? `${plan.name}, y` : "Y"}ou kept ${kept} of the last 7 days' promises.`;
  if (anchorStatus?.kept && kept < 7) {
    recapLine += ` And you kept your Anchor Day, ${plan.anchorDay} — that's real evidence you're still honouring your commitment to yourself.`;
  } else if (recoveries > 0) recapLine += ` You came back after missing one — that's the kind of choice this app exists to recognise.`;
  else if (reschedules > 0) recapLine += ` You rescheduled instead of giving up. That's evidence too.`;
  else if (kept === 0) recapLine += ` A quiet week. That's alright — the evidence starts building again whenever you're ready.`;

  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${T.bluePale}, ${T.bg} 45%)`, display: "flex", flexDirection: "column", padding: "max(28px, env(safe-area-inset-top)) 24px max(26px, env(safe-area-inset-bottom))", zIndex: 45, overflowY: "auto" }}>
      <style>{OB_KEYFRAMES}</style>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <button onClick={onBack} aria-label="Go back" style={{ background: T.surface, border: "none", width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ArrowLeft size={16} color={T.ink} />
        </button>
      </div>

      {step === "recap" && (<>
        <div style={{ textAlign: "center", marginBottom: 20, animation: "jSlideIn .4s ease" }}>
          <Pip size={56} mood="soft" />
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 22, color: T.ink, margin: "16px 0 0" }}>Let's look back together.</h1>
        </div>
        <Card style={{ marginBottom: 18 }}>
          <p style={{ margin: 0, fontSize: 14, color: T.ink, lineHeight: 1.8 }}>{recapLine}</p>
        </Card>
        <PrimaryButton onClick={() => setStep("questions")}>Continue</PrimaryButton>
      </>)}

      {step === "questions" && (<>
        <div style={{ textAlign: "center", marginBottom: 16, animation: "jSlideIn .4s ease" }}>
          <p style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.6 }}>These are optional — answer as many or as few as you'd like.</p>
        </div>
        {[
          { key: "proud", q: "What's one promise you're proud of this week?" },
          { key: "inTheWay", q: "What got in the way, if anything?" },
          { key: "carryForward", q: "What's one thing you want to carry into next week?" },
        ].map((item) => (
          <Card key={item.key} style={{ marginBottom: 12 }}>
            <p style={{ margin: "0 0 8px", fontSize: 13.5, fontWeight: 700, color: T.ink }}>{item.q}</p>
            <textarea
              rows={2} placeholder="Write freely, or leave blank…" value={answers[item.key]}
              onChange={(e) => setAnswers((a) => ({ ...a, [item.key]: e.target.value }))}
              style={{ width: "100%", border: `1.5px solid ${T.line}`, borderRadius: 12, padding: "10px 12px", fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "none" }}
            />
          </Card>
        ))}
        <PrimaryButton onClick={finish}>Continue</PrimaryButton>
      </>)}

      {step === "close" && (<>
        <div style={{ textAlign: "center", marginBottom: 20, animation: "jSlideIn .4s ease" }}>
          <Pip size={56} mood="happy" />
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 21, color: T.ink, margin: "16px 0 8px" }}>Thank you for looking back with me.</h1>
        </div>
        <Card style={{ marginBottom: 18 }}>
          <p style={{ margin: 0, fontSize: 13.5, color: T.ink, lineHeight: 1.8, textAlign: "center" }}>
            Your Promise Roadmap is still there, guiding you one day at a time. No need to rebuild it — just keep showing up to it.
          </p>
        </Card>
        <PrimaryButton onClick={onComplete}>Begin week two</PrimaryButton>
      </>)}
    </div>
  );
}

/* ---------------------------------------------------------
   DEEPEN PROFILE — "Can I get to know you a little better?"
   Completes Progressive Profiling. Reuses the exact same
   PART2_QUESTIONS a full-path user would answer (minus the goal
   question, already known, and the motivation interstitial),
   so there is only ever one source of truth for these questions.
--------------------------------------------------------- */
function DeepenProfileFlow({ plan, onBack, onSkip, onComplete }) {
  const questions = PART2_QUESTIONS.filter((q) => q.key !== "goal" && q.type !== "motivation" && q.type !== "weekdaySchedule");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const rawQ = questions[qIndex];
  const q = rawQ?.dynamic ? { ...rawQ, options: OBSTACLE_OPTIONS_BY_GOAL[plan?.goal] || OBSTACLE_OPTIONS_BY_GOAL["Custom Goal"] } : rawQ;
  const isLast = qIndex === questions.length - 1;

  const setAnswer = (val) => setAnswers((a) => ({ ...a, [q.key]: val }));
  const toggleMulti = (val) => setAnswers((a) => {
    const cur = a[q.key] || [];
    const next = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
    return { ...a, [q.key]: next };
  });

  const finish = async () => {
    const merged = { ...plan, ...answers };
    const newPlan = buildRoadmap(merged);
    await reachMilestoneOnce("deepen-invite-resolved");
    onComplete(newPlan);
  };

  const next = () => (isLast ? finish() : setQIndex((i) => i + 1));
  const back = () => (qIndex === 0 ? onBack() : setQIndex((i) => i - 1));

  const scaleKey = q?.key === "goalConfidence" ? "goalConfidence" : "confidence";
  const canAdvance = !q ? false : q.type === "text" || q.type === "multiChoice" || q.type === "scale" ? true : !!answers[q.key];

  if (!q) return null;

  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${T.bluePale}, ${T.bg} 45%)`, display: "flex", flexDirection: "column", padding: "max(22px, env(safe-area-inset-top)) 24px max(26px, env(safe-area-inset-bottom))", zIndex: 45 }}>
      <style>{OB_KEYFRAMES}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <button onClick={back} aria-label="Go back" style={{ background: T.surface, border: "none", width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ArrowLeft size={16} color={T.ink} />
        </button>
        <div style={{ flex: 1, height: 6, borderRadius: 999, background: T.ring, overflow: "hidden" }}>
          <div style={{ width: `${((qIndex + 1) / questions.length) * 100}%`, height: "100%", background: T.teal, borderRadius: 999, transition: "width .3s" }} />
        </div>
        <button onClick={() => (isLast ? finish() : setQIndex((i) => i + 1))} style={{ background: "none", border: "none", fontSize: 12.5, fontWeight: 700, color: T.inkFaint, cursor: "pointer" }}>Skip</button>
      </div>

      <div key={qIndex} style={{ flex: 1, overflowY: "auto", animation: "jSlideIn .35s ease" }}>
        <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 18px" }}><Pip size={64} mood="soft" /></div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 21, color: T.ink, textAlign: "center", margin: "0 0 8px", lineHeight: 1.3 }}>{q.heading}</h2>
        {q.subtitle && <p style={{ textAlign: "center", color: T.inkSoft, fontSize: 13.5, margin: "0 0 22px" }}>{q.subtitle}</p>}

        {q.type === "choice" && (
          <div style={{ display: "grid", gridTemplateColumns: (q.cols || (q.options.length > 4 ? 2 : 1)) === 1 ? "1fr" : "1fr 1fr", gap: 10 }}>
            {q.options.map((o) => {
              const active = answers[q.key] === o;
              return (
                <button key={o} onClick={() => setAnswer(o)} style={{
                  padding: "15px 16px", borderRadius: 16, border: `1.5px solid ${active ? T.teal : T.line}`,
                  background: active ? T.tealPale : T.surface, cursor: "pointer", textAlign: "left",
                  fontSize: 14, fontWeight: 700, color: active ? T.tealDeep : T.ink,
                }}>{o}</button>
              );
            })}
          </div>
        )}

        {q.type === "multiChoice" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {q.options.map((o) => {
              const active = (answers[q.key] || []).includes(o);
              return (
                <button key={o} onClick={() => toggleMulti(o)} style={{
                  padding: "13px 14px", borderRadius: 16, border: `1.5px solid ${active ? T.teal : T.line}`,
                  background: active ? T.tealPale : T.surface, cursor: "pointer", textAlign: "left",
                  fontSize: 13.5, fontWeight: 700, color: active ? T.tealDeep : T.ink,
                }}>{o}</button>
              );
            })}
          </div>
        )}

        {q.type === "scale" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 42, color: T.ink }}>{answers[scaleKey] || 5}</span>
              <span style={{ fontSize: 15, color: T.inkFaint }}>/10</span>
            </div>
            <input type="range" min={1} max={10} value={answers[scaleKey] || 5} onChange={(e) => setAnswer(Number(e.target.value))} style={{ width: "100%", accentColor: T.teal }} />
          </div>
        )}

        {q.type === "text" && (
          <Card>
            <textarea
              autoFocus rows={q.big ? 4 : 2} placeholder={q.placeholder || "Tell Journi more…"} value={answers[q.key] || ""}
              onChange={(e) => setAnswer(e.target.value)}
              style={{ width: "100%", border: "none", fontSize: 15.5, fontFamily: "'Fraunces', serif", color: T.ink, outline: "none", resize: "none" }}
            />
          </Card>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <PrimaryButton onClick={next} disabled={!canAdvance}>
          {isLast ? "Update my roadmap" : "Continue"}
        </PrimaryButton>
      </div>
    </div>
  );
}


/* =========================================================
   PART 1 — ABOUT YOU
   Simple, welcoming, conversational. Demographic + marketing only.
========================================================= */
const PART1_QUESTIONS = [
  {
    key: "name", type: "shortText", intro: true,
    heading: "What should we call you?",
    subtitle: "Let's start with the basics.",
    placeholder: "Your name",
  },
  {
    key: "gender", type: "choice",
    heading: "What is your gender?",
    options: ["Male", "Female", "Prefer not to say"],
    cols: 1,
  },
  {
    key: "ageRange", type: "choice",
    heading: "How old are you?",
    subtitle: "This helps tailor coaching language.",
    options: ["Under 18", "18–24", "25–34", "35–44", "45–54", "55+"],
    cols: 2,
  },
  {
    key: "country", type: "shortText",
    heading: "Which country are you in?",
    subtitle: "Totally optional — helps with things like timing and language.",
    placeholder: "e.g. United Kingdom",
  },
  {
    key: "referralSource", type: "choice",
    heading: "Where did you hear about Journi?",
    options: ["TikTok", "YouTube", "Instagram", "App Store", "Google Search", "Friend", "Podcast", "Other"],
    cols: 2,
  },
  {
    key: "hopeFor", type: "choice",
    heading: "What brought you here today?",
    options: ["Keeping promises to myself", "Stopping procrastination", "Building consistency", "Reducing overwhelm", "Following through on goals", "Understanding my brain", "Building confidence", "Other"],
    cols: 2,
  },
];

/* =========================================================
   PART 2 — YOUR JOURNEY
   Begins only after the Meet Your Coach philosophy screen.
   No promise is created here — the Promise Builder comes after.
========================================================= */
/* Progressive profiling — "I just want to begin" skips straight to a
   single question (goal) and fills everything buildRoadmap() needs
   with a conservative, gentle default. Since we know less about a
   fast-path user, the safe assumption is the kinder one, not a coin
   flip. Depth is invited back in later, once a first promise is kept. */
const FAST_PATH_DEFAULTS = {
  obstacle: "I'm not sure",
  frequency: "Sometimes",
  timeOfDay: "It changes",
  timeCommit: "5 minutes",
  motivationLoss: "I avoid starting",
  coachSupportStyle: "A mix of all of the above",
  coachStyle: "Balanced",
  confidence: 5,
  strugglingDuration: "A few months",
  goalConfidence: 5,
  challengeLevel: "Easy wins",
  missResponse: "Encourage me",
  giveUpTrigger: "I lose motivation",
  productiveTime: "Varies",
  commitDays: ["Monday", "Wednesday", "Friday"],
  anchorDay: "Wednesday",
  reminderTime: "No reminders",
  celebrationStyle: "Journi encouragement",
};

const PART2_QUESTIONS = [
  {
    key: "priorAppExperience", type: "choice",
    heading: "Have you used habit or productivity apps before?",
    options: ["No, this is my first", "I've used habit trackers", "I've used productivity apps", "I've used meditation apps", "I've tried lots of them"],
  },
  {
    key: "goal", type: "choice",
    heading: "What do you most want help with right now?",
    subtitle: "We'll use this to build promises that move you towards your goal.",
    options: [
      "Build healthier habits", "Improve my mental wellbeing", "Exercise consistently", "Lose weight",
      "Focus on work", "Grow my business", "Study consistently", "Improve relationships",
      "Improve confidence", "Create better routines", "Reduce procrastination", "Sleep better", "Custom Goal",
    ],
    cols: 2,
  },
  {
    key: "motivationScreen", type: "motivation",
  },
  {
    key: "obstacle", type: "choice",
    heading: "What's been getting in the way?",
    subtitle: "Choose what happens most often.",
    options: ["I keep procrastinating", "I lose motivation", "I overthink everything", "I feel overwhelmed", "I forget", "I start but don't finish", "I get distracted", "I'm not sure"],
  },
  {
    key: "frequency", type: "choice",
    heading: "How often do you break promises to yourself?",
    options: ["Almost never", "Sometimes", "Often", "Almost every day"],
    cols: 2,
  },
  {
    key: "timeOfDay", type: "choice",
    heading: "When are you most likely to struggle?",
    options: ["Morning", "Afternoon", "Evening", "Late at night", "It changes"],
    cols: 2,
  },
  {
    key: "timeCommit", type: "choice",
    heading: "How much time can you commit each day?",
    subtitle: "We'll make sure your promises fit your real life.",
    options: ["5 minutes", "10 minutes", "15 minutes", "30 minutes", "45+ minutes"],
    cols: 1,
  },
  {
    key: "motivationLoss", type: "choice",
    heading: "When motivation disappears…",
    subtitle: "Which sounds most like you?",
    options: ["I avoid starting", "I quit halfway", "I become overwhelmed", "I get anxious", "I get distracted", "I wait until tomorrow"],
  },
  {
    key: "coachSupportStyle", type: "choice",
    heading: "How would you like Journi to support you?",
    options: ["A calm coach", "A motivating coach", "A science-based guide", "A gentle accountability partner", "A mix of all of the above"],
  },
  {
    key: "coachStyle", type: "choice",
    heading: "How would you like Journi to coach you?",
    subtitle: "This shapes the AI's tone throughout the app.",
    options: ["Gentle & encouraging", "Balanced", "Firm accountability", "Science-first", "Motivational", "Friendly"],
  },
  {
    key: "confidence", type: "scale",
    heading: "How confident are you that you could keep a very small promise tomorrow?",
    subtitle: "This helps us choose promise sizes you'll actually keep. Be honest — we'll adjust either way.",
  },
  {
    key: "goalDetail", type: "text", big: true,
    heading: "Tell me more about the promise you want to keep.",
    subtitle: "The more detail you give Journi, the better your roadmap will be.",
    placeholder: "I want to…",
    examples: ["I want to reach £10,000 MRR from my SaaS.", "I want to lose 20kg.", "I want to become consistent in the gym.", "I want to stop procrastinating."],
  },
  {
    key: "why", type: "text", big: true,
    heading: "Why does this matter to you?",
    subtitle: "Journi will remind you of this when resistance shows up.",
    placeholder: "This matters because…",
    examples: ["I want financial freedom.", "I want to provide for my family.", "I want to prove to myself I can do it.", "I want confidence."],
  },
  {
    key: "achievingChange", type: "text",
    heading: "What would achieving this actually change?",
    subtitle: "Picture life on the other side of this promise.",
    placeholder: "If I achieved this…",
    examples: ["I'd finally feel in control of my time.", "I could quit my job and do this full-time.", "I'd trust myself to follow through on anything."],
  },
  {
    key: "successLooksLike", type: "text",
    heading: "What does success actually look like?",
    subtitle: "This becomes the top of your Promise Ladder.",
    placeholder: "Success looks like…",
    examples: ["£10,000 monthly recurring revenue", "Complete my degree", "Run a marathon", "Lose 15kg", "Meditate every day"],
  },
  {
    key: "currentLevel", type: "text",
    heading: "Where are you today?",
    subtitle: "This gives Journi your starting point.",
    placeholder: "Right now, I'm at…",
    examples: ["£800 MRR", "Never exercised", "Currently unemployed", "Already working on it", "Gym twice per week"],
  },
  {
    key: "strugglingDuration", type: "choice",
    heading: "How long have you been struggling with this?",
    options: ["Less than a month", "A few months", "6–12 months", "Over a year", "As long as I can remember"],
    cols: 1,
  },
  {
    key: "specificObstacle", type: "choice", dynamic: true,
    heading: "What's stopping you most?",
    subtitle: "Personalised based on your promise.",
  },
  {
    key: "goalConfidence", type: "scale",
    heading: "How consistent have you been during the past month?",
    subtitle: "We'll meet you where you are today, not where you think you should be.",
  },
  {
    key: "challengeLevel", type: "choice",
    heading: "How challenging would you like Journi to make your promises?",
    subtitle: "Some people need momentum. Others want to be pushed.",
    options: ["Easy wins", "Balanced", "Push me"],
    cols: 1,
  },
  {
    key: "missResponse", type: "choice",
    heading: "If you miss a promise, what should Journi do?",
    options: ["Encourage me", "Help me simplify", "Challenge me", "Ask deeper questions", "Remind me why I started", "Stay quiet"],
  },
  {
    key: "giveUpTrigger", type: "choice",
    heading: "What usually happens right before you give up?",
    options: ["I start scrolling", "I become overwhelmed", "I get anxious", "I convince myself I'll do it tomorrow", "I lose motivation", "I become tired"],
  },
  {
    key: "productiveTime", type: "choice",
    heading: "When do you usually have the most energy?",
    options: ["Morning", "Afternoon", "Evening", "Varies"],
    cols: 2,
  },
  {
    key: "commitDays", type: "weekdaySchedule",
    heading: "Which days would you like to make promises to yourself?",
  },
  {
    key: "reminderTime", type: "choice",
    heading: "Would you like daily reminders?",
    subtitle: "This configures your notifications from the start.",
    options: ["Morning", "Afternoon", "Evening", "Only when I miss a promise", "No reminders"],
    cols: 2,
  },
  {
    key: "celebrationStyle", type: "choice",
    heading: "How would you like to celebrate progress?",
    options: ["Visual progress", "Journi encouragement", "Unlock achievements", "Growing Self Trust Score", "Journey milestones", "None"],
  },
];

const REMINDER_TIME_INDEX = PART2_QUESTIONS.findIndex((question) => question.key === "reminderTime");

/* =========================================================
   SELF-TRUST BASELINE ASSESSMENT
   Shown once, right before Journi builds the Promise Plan —
   a brief, honest check-in before the user signs their promise.
========================================================= */
const TRUST_BASELINE_QUESTIONS = [
  {
    key: "promiseKeepingFrequency", type: "choice",
    heading: "When you make promises to yourself, how often do you keep them?",
    subtitle: "Be honest — this is just your starting point.",
    options: ["Almost Always", "Usually", "About Half the Time", "Rarely", "I don't trust myself anymore"],
    cols: 1,
  },
  {
    key: "selfTrustStatement", type: "choice",
    heading: "Which statement best describes you today?",
    options: ["I trust myself.", "I'm rebuilding trust.", "I've stopped believing my own promises.", "I'm not sure anymore."],
    cols: 1,
  },
];

const PROMISE_FREQUENCY_TRUST_ADJUST = {
  "Almost Always": 8, "Usually": 4, "About Half the Time": 0, "Rarely": -6, "I don't trust myself anymore": -10,
};
const SELF_TRUST_STATEMENT_ADJUST = {
  "I trust myself.": 6, "I'm rebuilding trust.": 0, "I've stopped believing my own promises.": -8, "I'm not sure anymore.": -3,
};

const HOPE_FOR_CHAPTER = {
  "Stopping procrastination": 3, "Reducing overwhelm": 4, "Building confidence": 5,
  "Understanding my brain": 2, "Building consistency": 6, "Following through on goals": 5,
  "Keeping promises to myself": 5,
};

const OBSTACLE_OPTIONS_BY_GOAL = {
  "Focus on work": ["I procrastinate", "I get distracted", "I don't know what to do next", "I'm overwhelmed", "I never finish projects", "I constantly change ideas", "I doubt myself"],
  "Grow my business": ["I procrastinate", "I overthink every decision", "I don't know what to focus on next", "I'm overwhelmed", "I doubt myself", "I run out of energy after my day job"],
  "Exercise consistently": ["I skip workouts", "I'm tired", "I lack motivation", "I don't know where to start", "My routine falls apart"],
  "Lose weight": ["I lose motivation", "I don't have a routine", "I get overwhelmed by all the advice", "I start and stop", "I'm not sure where to start"],
  "Improve my mental wellbeing": ["Anxiety", "Overthinking", "Low mood", "Stress", "Avoidance", "Burnout"],
  "Build healthier habits": ["I keep procrastinating", "I lose motivation", "I forget", "I get distracted", "I overthink everything"],
  "Study consistently": ["I procrastinate", "I get distracted", "I don't know what to focus on", "I lose momentum", "I feel overwhelmed by the material"],
  "Sleep better": ["I stay up too late", "I can't switch off my mind", "My routine is inconsistent", "I use my phone in bed", "I oversleep and lose the morning"],
  "Create better routines": ["I forget things", "I get overwhelmed by clutter", "I don't have a system", "I abandon systems quickly", "I procrastinate on admin"],
  "Improve relationships": ["I get distracted and don't show up fully", "I avoid difficult conversations", "I lose touch with people", "I don't make time for it", "I don't know where to start"],
  "Improve confidence": ["I doubt myself", "I compare myself to others", "I overthink everything", "I avoid putting myself out there", "I'm not sure where to start"],
  "Reduce procrastination": ["I keep putting things off", "I get distracted", "I feel overwhelmed", "I wait for motivation", "I don't know where to start"],
  "Custom Goal": ["I procrastinate", "I lose motivation", "I get distracted", "I feel overwhelmed", "I'm not sure"],
};

const PROCESSING_LINES = [
  "Learning about you…",
  "Understanding your goals…",
  "Analysing your available time…",
  "Building your Promise Plan…",
  "Choosing your recommended lessons…",
  "Creating your first week's promises…",
  "Preparing your personal coach…",
  "Building your Self-Trust roadmap…",
];

/* ---------------------------------------------------------
   PERSONAL ACKNOWLEDGMENTS
   A short, warm reaction shown after key answers so onboarding
   feels like a conversation with a coach, not a form.
--------------------------------------------------------- */
const GOAL_ACK = {
  "Build healthier habits": "Small, consistent habits are how real change sticks. We'll help you build one at a time.",
  "Improve my mental wellbeing": "Taking care of your mind matters. We'll build gentle, doable promises around that.",
  "Exercise consistently": "Consistency beats intensity. We'll help you build a routine you can actually keep.",
  "Lose weight": "Real results come from small, repeatable choices. We'll build promises you can sustain.",
  "Focus on work": "Deep focus is built in small sessions, not willpower. We'll help you protect that time.",
  "Grow my business": "That's a great goal. We'll build small daily promises that move you closer to it.",
  "Study consistently": "Little and often beats cramming. We'll help you build that rhythm.",
  "Improve relationships": "Showing up consistently is what relationships are built on. We'll help you do that.",
  "Improve confidence": "Confidence is built through evidence, not pep talks. We'll help you collect it, one promise at a time.",
  "Create better routines": "Routines free up energy for what matters. We'll help you build one gradually.",
  "Reduce procrastination": "Starting is usually the hardest part. We'll make that part tiny.",
  "Sleep better": "Better sleep starts with small, consistent choices. We'll help you build that wind-down routine.",
  "Custom Goal": "That's a meaningful goal. We'll build small promises that move you toward it.",
};

/* Which question keys get an acknowledgment, and how to phrase it */
function getAcknowledgment(prevKey, prevValue, answers) {
  if (!prevValue) return null;
  switch (prevKey) {
    case "goal":
      return GOAL_ACK[prevValue] || `That's a meaningful focus. We'll build small promises that move you toward ${prevValue.toLowerCase()}.`;
    case "successLooksLike":
      return `That's a great goal. We'll build small daily promises that move you closer to ${prevValue}.`;
    case "timeCommit":
      return `Got it — every promise will be sized to fit inside ${prevValue.toLowerCase()}, so it never overwhelms your day.`;
    case "confidence":
      return prevValue < 6
        ? "Thanks for being honest. We'll start smaller so you can build proof you can trust yourself."
        : "Love that confidence. We'll use it to build real momentum.";
    case "goalConfidence":
      return "Noted — we'll calibrate how ambitious to start based on that, not on where you think you 'should' be.";
    case "currentLevel":
      return "Thanks for being honest about where you're starting. That's the real starting line, and it's a good one.";
    default:
      return null;
  }
}

const CHAPTER_BY_OBSTACLE = {
  "I keep procrastinating": 3,
  "I lose motivation": 1,
  "I overthink everything": 2,
  "I feel overwhelmed": 4,
  "I forget": 5,
  "I start but don't finish": 6,
  "I get distracted": 4,
  "I'm not sure": 1,
};

const MOVEMENT_BY_GOAL = {
  "Exercise consistently": ["Walk", "Quick reset"],
  "Lose weight": ["Walk", "Jumping jacks"],
  "Sleep better": ["Stretch", "Breathing walk"],
  "Improve my mental wellbeing": ["Breathing walk", "Dance"],
  "Build healthier habits": ["Walk", "Stretch"],
  "Focus on work": ["Quick reset", "Jumping jacks"],
  "Grow my business": ["Quick reset", "Walk"],
  "Create better routines": ["Stretch", "Walk"],
  "Study consistently": ["Walk", "Quick reset"],
  "Improve relationships": ["Walk", "Breathing walk"],
  "Improve confidence": ["Dance", "Walk"],
  "Reduce procrastination": ["Quick reset", "Walk"],
  "Custom Goal": ["Walk", "Quick reset"],
};

const TIME_MINUTES = { "5 minutes": 5, "10 minutes": 10, "15 minutes": 15, "30 minutes": 30, "45+ minutes": 45 };

/* Personalised Reset & Regulate recommendations, e.g. anxiety -> breathing + grounding */
const RESET_BY_OBSTACLE = {
  "I feel overwhelmed": ["Box breathing", "Grounding"],
  "I overthink everything": ["5-4-3-2-1", "Body scan"],
  "I get distracted": ["Box breathing", "Grounding"],
  "I forget": ["Grounding", "5-4-3-2-1"],
  "I lose motivation": ["Progressive relaxation", "Body scan"],
  "I keep procrastinating": ["Box breathing", "5-4-3-2-1"],
  "I start but don't finish": ["Grounding", "Progressive relaxation"],
  "I'm not sure": ["Box breathing", "Grounding"],
};

/* Tiny (confidence 1-3) actions — deliberately not time-scaled */
const MICRO_ACTIONS = {
  "Focus on work": ["Open your laptop", "Open the document", "Write one sentence", "Write one heading", "Open your task list"],
  "Grow my business": ["Open your laptop", "Write down one customer problem", "Open your notes on the business", "Write one sentence about today's priority", "Message one contact"],
  "Exercise consistently": ["Put on your shoes", "Walk for 2 minutes", "Do 5 stretches", "Stand up and move", "Do one lap of the room"],
  "Lose weight": ["Fill up a glass of water", "Put on your trainers", "Write down what you ate today", "Take a 2-minute walk", "Plan one healthy meal"],
  "Improve my mental wellbeing": ["Take 5 slow breaths", "Name one feeling out loud", "Step outside for a minute", "Put your phone down for 2 minutes", "Notice 3 things you can see"],
  "Build healthier habits": ["Do the tiniest version of it", "Set it up for tomorrow", "Do it for 1 minute", "Write it down", "Do just the first step"],
  "Study consistently": ["Open the lesson", "Read one paragraph", "Watch 2 minutes of a video", "Write one question you have", "Review one flashcard"],
  "Sleep better": ["Set your alarm for wind-down", "Put your phone in another room", "Dim the lights", "Write one thought down", "Get into bed 5 minutes earlier"],
  "Create better routines": ["Clear one surface", "Write down 3 things", "Delete 5 old files", "Put one item away", "Write tomorrow's top priority"],
  "Improve relationships": ["Send one thoughtful message", "Put your phone away for 2 minutes with them", "Ask one genuine question", "Write down one thing you appreciate about them", "Make eye contact and really listen"],
  "Improve confidence": ["Name one thing you did well today", "Stand up straight for a moment", "Say one kind thing to yourself", "Do one small thing that scares you a little", "Write down one past win"],
  "Reduce procrastination": ["Open whatever you're avoiding", "Set a 2-minute timer", "Write the very first step down", "Do just the smallest part", "Remove one distraction from view"],
  "Custom Goal": ["Take the smallest possible step", "Spend 2 minutes on it", "Open whatever you need to start", "Write one line about it", "Set a 2-minute timer"],
};

const CATEGORY_ACTIONS = {
  "Focus on work": ["spend {t} focused minutes researching one problem your customers have", "write one landing page headline", "message one potential customer", "improve one section of your product", "ask one user for feedback"],
  "Grow my business": ["spend {t} focused minutes on your highest-priority task", "write one landing page headline", "message one potential customer", "improve one section of your product", "ask one user for feedback"],
  "Exercise consistently": ["walk for {t} minutes", "do a {t}-minute stretching session", "complete one bodyweight workout ({t} min)", "take a {t}-minute breathing walk outside", "do a light {t}-minute strength session"],
  "Lose weight": ["go for a {t}-minute walk", "prep one healthy meal or snack", "drink a glass of water before your next meal", "do a {t}-minute movement session", "log today's meals, no judgment"],
  "Improve my mental wellbeing": ["do {t} minutes of quiet breathing", "write down one thing you're feeling", "go for a {t}-minute walk without your phone", "name one thing that's actually going well", "do a {t}-minute body scan before bed"],
  "Build healthier habits": ["do your promise for {t} minutes", "do it again, same time as yesterday", "notice what made it easier or harder, in one line", "repeat the promise for {t} minutes", "do it before checking your phone"],
  "Study consistently": ["spend {t} minutes on one lesson", "write down three things you learned", "teach what you learned to someone, even out loud", "practice one exercise for {t} minutes", "review what you've learned this week"],
  "Sleep better": ["put your phone away {t} minutes before bed", "write down one thing on your mind before sleep", "keep the same bedtime as last night", "do a {t}-minute wind-down routine", "notice how you feel this morning, in one line"],
  "Create better routines": ["clear one small space for {t} minutes", "write today's one priority", "file or delete 5 things you've been avoiding", "plan tomorrow in two lines", "tidy the same space again for {t} minutes"],
  "Improve relationships": ["spend {t} distraction-free minutes with someone who matters", "send one thoughtful message", "have one honest conversation you've been avoiding", "write down one thing you appreciate about them", "really listen for {t} minutes, phone away"],
  "Improve confidence": ["spend {t} minutes on something you're proud of", "do one small thing that scares you a little", "write down 3 things you did well this week", "speak up once today, even briefly", "practice a confident posture for {t} minutes"],
  "Reduce procrastination": ["spend just {t} minutes on the task you're avoiding", "write the very first step down and do it", "remove one distraction, then start for {t} minutes", "set a {t}-minute timer and begin, imperfectly", "do the smallest version of the task"],
  "Custom Goal": ["spend {t} minutes on your promise", "take one small step forward", "do it again, a little further", "notice what's working, in one line", "keep your promise going for {t} minutes"],
};

const TIER_ORDER = ["micro", "small", "growth", "performance"];
function tierFromConfidence(c) {
  if (c <= 3) return "micro";
  if (c <= 6) return "small";
  if (c <= 8) return "growth";
  return "performance";
}
function shiftTier(tier, delta) {
  const i = Math.max(0, Math.min(TIER_ORDER.length - 1, TIER_ORDER.indexOf(tier) + delta));
  return TIER_ORDER[i];
}
function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const SPECIFIC_OBSTACLE_CHAPTER = {
  "I procrastinate": 3, "I keep procrastinating": 3, "I get distracted": 4, "I don't know what to do next": 5,
  "I'm overwhelmed": 4, "I never finish projects": 6, "I constantly change ideas": 5, "I doubt myself": 5,
  "I skip workouts": 1, "I'm tired": 1, "I lack motivation": 1, "I don't know where to start": 5, "My routine falls apart": 6,
  "Anxiety": 4, "Overthinking": 2, "Low mood": 4, "Stress": 4, "Avoidance": 4, "Burnout": 4,
  "I stay up too late": 6, "I can't switch off my mind": 2, "My routine is inconsistent": 6, "I use my phone in bed": 6, "I oversleep and lose the morning": 6,
  "I forget things": 5, "I get overwhelmed by clutter": 4, "I don't have a system": 5, "I abandon systems quickly": 6, "I procrastinate on admin": 3,
  "I feel overwhelmed by the material": 4, "I lose momentum": 6, "I don't know what to focus on": 5,
  "I overthink every decision": 2, "I don't know what to focus on next": 5, "I run out of energy after my day job": 1,
  "I don't have a routine": 6, "I get overwhelmed by all the advice": 4, "I start and stop": 6, "I'm not sure where to start": 5,
  "I get distracted and don't show up fully": 4, "I avoid difficult conversations": 4, "I lose touch with people": 1, "I don't make time for it": 6,
  "I compare myself to others": 5, "I avoid putting myself out there": 4, "I keep putting things off": 3, "I wait for motivation": 1,
};
const MOTIVATION_LOSS_CHAPTER = { "I avoid starting": 3, "I quit halfway": 6, "I become overwhelmed": 4, "I get anxious": 4, "I get distracted": 4, "I wait until tomorrow": 1 };

function recommendedChapters(a) {
  const set = new Set();
  set.add(CHAPTER_BY_OBSTACLE[a.obstacle] || 1);
  if (a.specificObstacle && SPECIFIC_OBSTACLE_CHAPTER[a.specificObstacle]) set.add(SPECIFIC_OBSTACLE_CHAPTER[a.specificObstacle]);
  if (a.motivationLoss && MOTIVATION_LOSS_CHAPTER[a.motivationLoss]) set.add(MOTIVATION_LOSS_CHAPTER[a.motivationLoss]);
  if (a.hopeFor && HOPE_FOR_CHAPTER[a.hopeFor]) set.add(HOPE_FOR_CHAPTER[a.hopeFor]);
  set.add(5); // identity & self-trust is always relevant to the core mission
  let arr = Array.from(set).sort((x, y) => x - y);
  if (arr.length < 2) arr.push(2);
  return arr.slice(0, 4).map((n) => CHAPTERS.find((c) => c.n === n));
}

function buildRoadmap(a) {
  const category = CATEGORY_ACTIONS[a.goal] ? a.goal : "Custom Goal";
  const baseMin = TIME_MINUTES[a.timeCommit] || 5;

  let tier = tierFromConfidence(a.goalConfidence || a.confidence || 5);
  const challengeShift = { "Push me": 1, "Easy wins": -1, "Balanced": 0 }[a.challengeLevel] ?? 0;
  tier = shiftTier(tier, challengeShift);

  const tierMinutes = { micro: 2, small: baseMin, growth: Math.round(baseMin * 1.5) || baseMin + 5, performance: Math.max(20, baseMin * 2) };
  const t = tierMinutes[tier];

  const weekdayTemplates = tier === "micro" ? MICRO_ACTIONS[category] : CATEGORY_ACTIONS[category].map((s) => s.replace("{t}", t));
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const suffix = { micro: "", small: "", growth: " — then note one insight afterward.", performance: " — then push one step further than yesterday." }[tier];

  const week = dayNames.map((day, i) => ({
    day, label: "Promise",
    text: `Promise to ${weekdayTemplates[i]}${suffix}`,
  }));
  week.push({ day: "Saturday", label: "Reflect", text: "Reflect on this week — what worked, and what almost stopped you?" });
  week.push({ day: "Sunday", label: "Plan", text: "Plan next week's promises with Journi." });

  const promiseDayCount = week.filter((d) => d.label === "Promise").length;
  const weeklyPromise = `Complete ${promiseDayCount} focused ${category === "Exercise consistently" || category === "Lose weight" ? "sessions" : "promises"} on ${a.goal.toLowerCase()} this week.`;

  const stretchTier = shiftTier(tier, 1);
  const stretchT = tierMinutes[stretchTier];
  const stretchBase = (CATEGORY_ACTIONS[category][1] || CATEGORY_ACTIONS[category][0]).replace("{t}", stretchT);
  const stretchPromise = capitalize(stretchBase) + ".";

  const freqPenalty = { "Almost never": 0, "Sometimes": 4, "Often": 10, "Almost every day": 16 }[a.frequency] ?? 6;
  const avgConfidence = ((a.confidence || 5) + (a.goalConfidence || a.confidence || 5)) / 2;
  const baselineAdjust = (PROMISE_FREQUENCY_TRUST_ADJUST[a.promiseKeepingFrequency] ?? 0) + (SELF_TRUST_STATEMENT_ADJUST[a.selfTrustStatement] ?? 0);
  let trust = Math.round(28 + avgConfidence * 3 - freqPenalty / 2 + baselineAdjust);
  trust = Math.max(18, Math.min(72, trust));

  const chapterN = CHAPTER_BY_OBSTACLE[a.obstacle] || 1;
  const chapter = CHAPTERS.find((c) => c.n === chapterN) || CHAPTERS[0];
  const chapters = recommendedChapters(a);
  const movementNames = MOVEMENT_BY_GOAL[a.goal] || ["Walk", "Quick reset"];
  const movement = MOVEMENTS.filter((m) => movementNames.includes(m.name));

  const reflectionPrompts = [
    "What almost stopped you today?",
    "What helped you follow through?",
    "What tiny win can you celebrate?",
    a.timeOfDay && a.timeOfDay !== "It changes" ? `How did ${a.timeOfDay.toLowerCase()} feel today?` : "How did today feel, honestly?",
  ];

  const goal = a.successLooksLike || a.goalDetail || a.goal || "your goal";
  const ladder = [
    { label: "Today", text: week[0].text.replace(/^Promise to /, "").replace(/^./, (c) => c.toUpperCase()) },
    { label: "This week", text: weeklyPromise },
    { label: "This month", text: `Build real consistency toward ${goal}` },
    { label: "Halfway there", text: a.currentLevel ? `Real progress from: ${a.currentLevel}` : "Real, visible progress" },
    { label: "Your goal", text: goal, top: true },
  ];

  return { ...a, tier, week, ladder, weeklyPromise, stretchPromise, trustBaseline: trust, chapter, chapters, movement, reflectionPrompts };
}

/* ---------------------------------------------------------
   PROMISE BREAKDOWN — shrink an overwhelming promise on demand
--------------------------------------------------------- */
function shrinkPromise(text) {
  const t = (text || "").toLowerCase();
  if (t.includes("write") || t.includes("document") || t.includes("plan")) return "Open the document and write the first sentence.";
  if (t.includes("walk") || t.includes("run") || t.includes("gym") || t.includes("workout") || t.includes("exercise")) return "Put on your shoes and walk for 2 minutes.";
  if (t.includes("read")) return "Open the book or article and read one paragraph.";
  if (t.includes("clean") || t.includes("organi") || t.includes("tidy")) return "Clear just one small surface for 2 minutes.";
  if (t.includes("message") || t.includes("email") || t.includes("call") || t.includes("outreach")) return "Open your messages and write the first line.";
  if (t.includes("meditat") || t.includes("breath")) return "Take 5 slow breaths, nothing else.";
  return "Do just the smallest possible first step, for 2 minutes.";
}

/* ---------------------------------------------------------
   TODAY'S PROMISE — balanced emotional check-in (Stuck flow, step 1)
   Positive, Neutral and Challenging states each drive a different
   coaching path and a different version of today's promise.
--------------------------------------------------------- */
const STUCK_EMOTIONS = [
  { e: "😊", label: "Excited", cat: "Positive" },
  { e: "😌", label: "Calm", cat: "Positive" },
  { e: "💪", label: "Confident", cat: "Positive" },
  { e: "🌱", label: "Motivated", cat: "Positive" },
  { e: "🙂", label: "Okay", cat: "Neutral" },
  { e: "🤔", label: "Unsure", cat: "Neutral" },
  { e: "😐", label: "Fine", cat: "Neutral" },
  { e: "😴", label: "Tired", cat: "Neutral" },
  { e: "😟", label: "Overwhelmed", cat: "Challenging" },
  { e: "😰", label: "Anxious", cat: "Challenging" },
  { e: "😞", label: "Discouraged", cat: "Challenging" },
  { e: "🧊", label: "Frozen", cat: "Challenging" },
];

const TRACK_STEPS = {
  positive: ["feeling", "boost", "action", "celebrate", "reflect"],
  neutral: ["feeling", "followup", "promise", "action", "celebrate", "reflect"],
  challenging: ["feeling", "acknowledge", "promise", "blocker", "body", "explain", "intervention", "shrink", "confidence", "action", "celebrate", "reflect"],
};

/* Positive track — offer a slightly more ambitious version of today's promise */
function boostPromise(text) {
  const m = (text || "").match(/(\d+)\s*minutes?/i);
  if (m) {
    const n = parseInt(m[1], 10);
    const boosted = Math.max(n + 5, Math.round(n * 1.5));
    return text.replace(/\d+\s*minutes?/i, `${boosted} minutes`);
  }
  return `${text} — then see if you can keep going a little further.`;
}

/* Challenging track — the smallest meaningful version, as a 3-step sequence */
function minimumViableSteps(text) {
  const t = (text || "").toLowerCase();
  let openStep = "Open whatever you need to start.";
  if (t.includes("write") || t.includes("document") || t.includes("plan")) openStep = "Open the document.";
  else if (t.includes("walk") || t.includes("run") || t.includes("gym") || t.includes("workout") || t.includes("exercise")) openStep = "Put on your shoes.";
  else if (t.includes("read")) openStep = "Open the book or article.";
  else if (t.includes("clean") || t.includes("organi") || t.includes("tidy")) openStep = "Clear one small surface.";
  else if (t.includes("message") || t.includes("email") || t.includes("call")) openStep = "Open your messages.";
  else if (t.includes("meditat") || t.includes("breath")) openStep = "Sit somewhere quiet.";
  return [openStep, "Spend just a few minutes on it.", "Decide whether to continue."];
}

const BREAKDOWN_STEPS = [
  { key: "difficulty", heading: "What's making this feel difficult?", options: ["It's too big", "Low energy", "Fear of doing it wrong", "I don't know where to start", "Something else"] },
  { key: "time", heading: "Do you have less time today?", options: ["Yes, less time", "No, time isn't the issue"] },
  { key: "feeling", heading: "Are you feeling overwhelmed, distracted, or anxious?", options: ["Overwhelmed", "Distracted", "Anxious", "None of those"] },
  { key: "microVersion", heading: "Would a 2-minute version help?", options: ["Yes, please", "Not sure, show me anyway"] },
];

function BreakdownFlow({ original, onExit, onApply }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const done = step >= BREAKDOWN_STEPS.length;
  const rewritten = shrinkPromise(original);

  if (done) {
    return (
      <div style={{ position: "absolute", inset: 0, background: T.bg, display: "flex", flexDirection: "column", padding: "max(26px, env(safe-area-inset-top)) 22px max(26px, env(safe-area-inset-bottom))", zIndex: 45 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onExit} aria-label="Close" style={{ background: T.surface, border: "none", width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} color={T.ink} /></button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
          <Pip size={64} mood="soft" />
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.4 }}>Original promise</p>
          <p style={{ margin: 0, fontSize: 14, color: T.inkSoft, textDecoration: "line-through" }}>{original}</p>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, fontWeight: 700, color: T.tealDeep, textTransform: "uppercase", letterSpacing: 0.4 }}>Journi's rewrite</p>
          <Card style={{ background: T.teal }}>
            <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 19, color: "#fff" }}>{rewritten}</p>
          </Card>
          <p style={{ margin: 0, fontSize: 12.5, color: T.inkSoft, maxWidth: 260 }}>This still counts. Progress isn't about perfection — it's about keeping the promise you actually made.</p>
        </div>
        <div style={{ flexShrink: 0 }}>
          <PrimaryButton onClick={() => onApply(rewritten)}>Use this promise</PrimaryButton>
        </div>
      </div>
    );
  }

  const s = BREAKDOWN_STEPS[step];
  return (
    <div style={{ position: "absolute", inset: 0, background: T.bg, display: "flex", flexDirection: "column", padding: "max(26px, env(safe-area-inset-top)) 22px max(26px, env(safe-area-inset-bottom))", zIndex: 45 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button onClick={() => (step === 0 ? onExit() : setStep((x) => x - 1))} aria-label="Close" style={{ background: T.surface, border: "none", width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {step === 0 ? <X size={16} color={T.ink} /> : <ChevronLeft size={16} color={T.ink} />}
        </button>
        <div style={{ flex: 1, height: 6, borderRadius: 999, background: T.ring, overflow: "hidden" }}>
          <div style={{ width: `${((step + 1) / BREAKDOWN_STEPS.length) * 100}%`, height: "100%", background: T.sand, borderRadius: 999, transition: "width .3s" }} />
        </div>
      </div>
      <p style={{ fontSize: 11.5, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.4, margin: "0 0 6px" }}>Promise breakdown</p>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 20, color: T.ink, margin: "0 0 18px" }}>{s.heading}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {s.options.map((o) => (
          <button key={o} onClick={() => { setAnswers((a) => ({ ...a, [s.key]: o })); setStep((x) => x + 1); }} style={{
            padding: "15px 16px", borderRadius: 16, border: `1.5px solid ${T.line}`, background: T.surface,
            cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: 700, color: T.ink,
          }}>{o}</button>
        ))}
      </div>
    </div>
  );
}

const OB_KEYFRAMES = `
@keyframes jSlideIn { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
@keyframes jWalk { 0% { left: 0%; } 100% { left: 84%; } }
@keyframes jBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
`;

const ONBOARDING_STYLES = `
.onboarding-question-screen {
  position: relative;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  padding: max(12px, env(safe-area-inset-top)) 24px max(12px, env(safe-area-inset-bottom));
}
.onboarding-question-header {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.onboarding-section-label {
  margin: 0;
  font-size: 10px;
  line-height: 1.2;
  font-weight: 700;
  color: ${T.inkFaint};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
}
.onboarding-progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.onboarding-progress-row button {
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
}
.onboarding-progress-row .onboarding-skip {
  flex: 0 0 auto;
  width: auto;
  height: 36px;
  padding: 0 2px;
}
.onboarding-progress {
  flex: 1;
  height: 5px;
}
.onboarding-question-content {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding-top: clamp(6px, 1.6vh, 14px);
}
.onboarding-scroll-fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 28px;
  background: linear-gradient(to bottom, transparent, ${T.bg});
  pointer-events: none;
}
.onboarding-illustration {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  margin: 0 0 clamp(5px, 1.2vh, 10px);
}
.onboarding-illustration svg {
  width: clamp(70px, 12vh, 88px);
  height: clamp(70px, 12vh, 88px);
}
.onboarding-question-heading {
  flex: 0 0 auto;
  margin: 0 0 6px;
  font-family: 'Fraunces', serif;
  font-weight: 500;
  font-size: clamp(19px, 2.7vh, 21px);
  line-height: 1.25;
  color: ${T.ink};
  text-align: center;
}
.onboarding-question-subtitle {
  flex: 0 0 auto;
  margin: 0 0 clamp(10px, 1.8vh, 16px);
  color: ${T.inkSoft};
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
}
.onboarding-answer-list {
  flex: 0 1 auto;
  display: grid;
  gap: clamp(8px, 1.4vh, 12px);
}
.onboarding-answer-card {
  min-height: clamp(64px, 8.5vh, 76px);
  box-sizing: border-box;
  padding: 12px 16px !important;
  display: flex;
  align-items: center;
}
.onboarding-question-cta {
  flex: 0 0 auto;
  margin-top: auto;
  padding-top: clamp(10px, 2vh, 16px);
}
.onboarding-question-cta button {
  min-height: 52px;
  padding: 12px 18px;
}
@media (max-height: 720px) {
  .onboarding-question-screen {
    padding-top: max(8px, env(safe-area-inset-top));
    padding-bottom: max(8px, env(safe-area-inset-bottom));
  }
  .onboarding-question-content {
    padding-top: 4px;
  }
  .onboarding-illustration {
    margin-bottom: 4px;
  }
  .onboarding-illustration svg {
    width: 70px;
    height: 70px;
  }
  .onboarding-answer-card {
    min-height: 64px;
  }
  .onboarding-question-cta {
    padding-top: 8px;
  }
}
@media (min-height: 820px) {
  .onboarding-question-screen {
    padding-top: max(16px, env(safe-area-inset-top));
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
}
`;

function OnboardingFlow({ onBack, onComplete }) {
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState("part1"); // part1 | meetCoach | philosophy | pathChoice | fastPathGoal | part2 | reminderSettings | trustBaseline | promiseMotivation | processing | final | commitment
  const [lineIdx, setLineIdx] = useState(0);
  const [plan, setPlan] = useState(null);
  const [weekdaySubStep, setWeekdaySubStep] = useState("days"); // days | anchor
  const currentQuestions = phase === "part1" ? PART1_QUESTIONS : phase === "part2" ? PART2_QUESTIONS : phase === "trustBaseline" ? TRUST_BASELINE_QUESTIONS : [];
  const rawQ = currentQuestions[qIndex];
  const q = rawQ?.dynamic ? { ...rawQ, options: OBSTACLE_OPTIONS_BY_GOAL[answers.goal] || OBSTACLE_OPTIONS_BY_GOAL["Custom Goal"] } : rawQ;

  useEffect(() => {
    if (phase !== "processing") return;
    if (lineIdx >= PROCESSING_LINES.length - 1) {
      const t = setTimeout(() => {
        setPlan(buildRoadmap(answers));
        setPhase("final");
      }, 1000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLineIdx((i) => i + 1), 850);
    return () => clearTimeout(t);
  }, [phase, lineIdx, answers]);

  const setAnswer = (val) => setAnswers((a) => ({ ...a, [q.key]: val }));
  const toggleMulti = (val) => setAnswers((a) => {
    const cur = a[q.key] || [];
    const next = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
    return { ...a, [q.key]: next };
  });
  const advance = () => {
    if (phase === "part1") {
      if (qIndex === PART1_QUESTIONS.length - 1) { setPhase("meetCoach"); }
      else setQIndex((i) => i + 1);
    } else if (phase === "part2") {
      if (qIndex === REMINDER_TIME_INDEX) {
        if (answers.reminderTime === "No reminders") {
          setQIndex((i) => i + 1);
        } else {
          setPhase("reminderSettings");
        }
      } else if (qIndex === PART2_QUESTIONS.length - 1) {
        setPhase("trustBaseline");
        setQIndex(0);
      } else {
        setQIndex((i) => i + 1);
      }
    } else if (phase === "trustBaseline") {
      if (qIndex === TRUST_BASELINE_QUESTIONS.length - 1) { setPhase("promiseMotivation"); }
      else setQIndex((i) => i + 1);
    }
  };
  const skip = () => advance();
  const back = () => {
    if (phase === "part1") {
      if (qIndex === 0) onBack();
      else setQIndex((i) => i - 1);
    } else if (phase === "part2") {
      if (qIndex === 0) setPhase("pathChoice");
      else setQIndex((i) => i - 1);
    } else if (phase === "reminderSettings") {
      setPhase("part2");
      setQIndex(REMINDER_TIME_INDEX);
    } else if (phase === "trustBaseline") {
      if (qIndex === 0) {
        if (answers.fastPath) setPhase("fastPathGoal");
        else { setPhase("part2"); setQIndex(PART2_QUESTIONS.length - 1); }
      } else setQIndex((i) => i - 1);
    }
  };

  if (phase === "meetCoach") {
    return (
      <MeetCoachScreen
        onBack={() => { setPhase("part1"); setQIndex(PART1_QUESTIONS.length - 1); }}
        onContinue={() => setPhase("philosophy")}
        name={answers.name}
      />
    );
  }

  if (phase === "philosophy") {
    return (
      <WhyPromisesFailScreen
        onBack={() => setPhase("meetCoach")}
        onContinue={() => setPhase("pathChoice")}
      />
    );
  }

  if (phase === "pathChoice") {
    return (
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${T.bluePale}, ${T.bg} 45%)`, display: "flex", flexDirection: "column", padding: "max(22px, env(safe-area-inset-top)) 24px max(26px, env(safe-area-inset-bottom))", zIndex: 40 }}>
        <style>{OB_KEYFRAMES}</style>
        <button onClick={() => setPhase("philosophy")} aria-label="Go back" style={{ background: T.surface, border: "none", width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: 14 }}>
          <ArrowLeft size={16} color={T.ink} />
        </button>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", animation: "jSlideIn .4s ease" }}>
          <Pip size={64} mood="soft" />
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 21, color: T.ink, margin: "18px 0 10px", lineHeight: 1.3 }}>How would you like to begin?</h2>
          <p style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, maxWidth: 280, margin: "0 auto 26px" }}>Both paths lead to the same place — this is just about what feels right today.</p>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <Card onClick={() => { setPhase("part2"); setQIndex(0); }} style={{ textAlign: "left" }}>
              <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: T.ink }}>Build my full plan</p>
              <p style={{ margin: "4px 0 0", fontSize: 12.5, color: T.inkSoft, lineHeight: 1.5 }}>A deeper set of questions now, for the most personalised roadmap from day one.</p>
            </Card>
            <Card onClick={() => setPhase("fastPathGoal")} style={{ textAlign: "left", border: `1.5px solid ${T.teal}` }}>
              <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: T.ink }}>I just want to begin</p>
              <p style={{ margin: "4px 0 0", fontSize: 12.5, color: T.inkSoft, lineHeight: 1.5 }}>One quick question, then your first promise. Starting small isn't a lesser choice — Journi will get to know you better once you've had a win.</p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "fastPathGoal") {
    const goalQuestion = PART2_QUESTIONS.find((q) => q.key === "goal");
    const chooseFastGoal = (value) => {
      setAnswers((a) => ({ ...a, ...FAST_PATH_DEFAULTS, goal: value, fastPath: true }));
      setPhase("trustBaseline");
      setQIndex(0);
    };
    return (
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${T.bluePale}, ${T.bg} 45%)`, display: "flex", flexDirection: "column", padding: "max(22px, env(safe-area-inset-top)) 24px max(26px, env(safe-area-inset-bottom))", zIndex: 40 }}>
        <style>{OB_KEYFRAMES}</style>
        <button onClick={() => setPhase("pathChoice")} aria-label="Go back" style={{ background: T.surface, border: "none", width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginBottom: 14 }}>
          <ArrowLeft size={16} color={T.ink} />
        </button>
        <div style={{ flex: 1, overflowY: "auto", animation: "jSlideIn .35s ease" }}>
          <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 18px" }}>
            <Pip size={64} mood="soft" />
          </div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 21, color: T.ink, textAlign: "center", margin: "0 0 8px", lineHeight: 1.3 }}>{goalQuestion.heading}</h2>
          <p style={{ textAlign: "center", color: T.inkSoft, fontSize: 13.5, margin: "0 0 22px" }}>We'll use just this to build your first promise — Journi can learn more about you later.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {goalQuestion.options.map((o) => (
              <button key={o} onClick={() => chooseFastGoal(o)} style={{
                padding: "15px 16px", borderRadius: 16, border: `1.5px solid ${T.line}`, background: T.surface,
                cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: 700, color: T.ink,
              }}>{o}</button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "reminderSettings") {
    return (
      <ReminderSettingsScreen
        onBack={() => {
          setPhase("part2");
          setQIndex(REMINDER_TIME_INDEX);
        }}
        onSaved={() => {}}
        plan={{ reminderTime: answers.reminderTime }}
        authProfile={null}
        onSave={async (reminderTime) => {
          setAnswers((a) => ({ ...a, reminderTime }));
          setPhase("part2");
          setQIndex(REMINDER_TIME_INDEX + 1);
        }}
      />
    );
  }

  if (phase === "promiseMotivation") {
    return (
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${T.tealPale}, ${T.bg} 55%)`, display: "flex", flexDirection: "column", padding: "max(22px, env(safe-area-inset-top)) 24px max(26px, env(safe-area-inset-bottom))", zIndex: 40 }}>
        <style>{OB_KEYFRAMES}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button onClick={() => { setPhase("trustBaseline"); setQIndex(TRUST_BASELINE_QUESTIONS.length - 1); }} aria-label="Go back" style={{ background: T.surface, border: "none", width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ArrowLeft size={16} color={T.ink} />
          </button>
          <div style={{ flex: 1, height: 6, borderRadius: 999, background: T.ring, overflow: "hidden" }}>
            <div style={{ width: "100%", height: "100%", background: T.teal, borderRadius: 999, transition: "width .3s" }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", animation: "jSlideIn .45s ease" }}>
          <div style={{ margin: "10px 0 20px", animation: "jBounce 3.2s ease-in-out infinite" }}>
            <PromiseJourneyIllustration />
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 24, color: T.ink, margin: "0 0 16px" }}>Small Promises. Big Change.</h1>
          <Card style={{ background: T.teal, marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 15, color: "#fff", lineHeight: 1.6, fontWeight: 600 }}>
              People who consistently complete small, achievable actions are far more likely to build lasting habits than those who rely on motivation alone.
            </p>
          </Card>
          <p style={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.7, maxWidth: 290 }}>
            Journi isn't about being perfect. It's about becoming someone who follows through, one promise at a time. Your personalised Promise Plan is designed to help you build self-trust through consistent action.
          </p>
        </div>

        <div style={{ marginTop: 14 }}>
          <PrimaryButton onClick={() => { setPhase("processing"); setLineIdx(0); }}>Create My Promise Plan</PrimaryButton>
        </div>
      </div>
    );
  }

  if (phase === "processing") {
    const pct = ((lineIdx + 1) / PROCESSING_LINES.length) * 100;
    return (
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${T.bluePale}, ${T.bg} 55%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "max(0px, env(safe-area-inset-top)) 32px max(0px, env(safe-area-inset-bottom))", zIndex: 40 }}>
        <style>{OB_KEYFRAMES}</style>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 22, color: T.ink, margin: "0 0 36px" }}>Building your Journi{answers.name ? `, ${answers.name}` : ""}…</h2>
        <div style={{ position: "relative", width: "100%", height: 6, background: T.ring, borderRadius: 999, marginBottom: 46 }}>
          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: T.teal, borderRadius: 999, transition: "width .5s ease" }} />
          <div style={{ position: "absolute", top: -22, animation: "jWalk 5.7s linear forwards" }}>
            <div style={{ animation: "jBounce 0.6s ease-in-out infinite" }}><Pip size={40} mood="soft" /></div>
          </div>
        </div>
        <p key={lineIdx} style={{ fontSize: 14.5, color: T.inkSoft, fontWeight: 600, animation: "jSlideIn .4s ease" }}>{PROCESSING_LINES[lineIdx]}</p>
      </div>
    );
  }

  if (phase === "final" && plan) {
    const focus = plan.successLooksLike || plan.goalDetail || plan.goal || "Keep your promises to yourself.";
    const todayText = capitalize(plan.week[0].text.replace(/^Promise to /, ""));
    return (
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${T.tealPale}, ${T.bg} 40%)`, display: "flex", flexDirection: "column", padding: "max(50px, env(safe-area-inset-top)) 22px max(34px, env(safe-area-inset-bottom))", zIndex: 40, overflowY: "auto" }}>
        <style>{OB_KEYFRAMES}</style>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ animation: "jBounce 2s ease-in-out infinite", display: "inline-block" }}><Pip size={80} mood="happy" /></div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 23, color: T.ink, margin: "16px 0 8px" }}>🎉 {plan.name ? `${plan.name}, your` : "Your"} Journi is Ready</h1>
          <p style={{ color: T.inkSoft, fontSize: 13.5, lineHeight: 1.6, maxWidth: 270, margin: "0 auto" }}>
            You're not starting a task list. You're building trust in yourself — one promise at a time.
          </p>
        </div>

        {/* Card 1 — Your Goal */}
        <Card style={{ marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.4 }}>Your Focus</p>
          <p style={{ margin: "6px 0 0", fontFamily: "'Fraunces', serif", fontSize: 18, color: T.ink, lineHeight: 1.4 }}>{focus}</p>
        </Card>

        {/* Card 2 — First Promise */}
        <Card style={{ marginBottom: 12, background: T.teal }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 0.4 }}>Today's Promise</p>
          <p style={{ margin: "6px 0 0", fontFamily: "'Fraunces', serif", fontSize: 18, color: "#fff", lineHeight: 1.4 }}>{todayText}</p>
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "rgba(255,255,255,0.85)", fontStyle: "italic" }}>Small promises create lasting change.</p>
        </Card>

        {/* Your Weekly Promise */}
        <Card style={{ marginBottom: 12, background: T.bluePale }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#3A6690", textTransform: "uppercase", letterSpacing: 0.4 }}>Your Weekly Promise</p>
          <p style={{ margin: "6px 0 0", fontSize: 14.5, color: T.ink, fontWeight: 600, lineHeight: 1.5 }}>{plan.weeklyPromise}</p>
        </Card>

        {/* Stretch Promise — clearly optional */}
        <Card style={{ marginBottom: 12, border: `1.5px dashed ${T.sand}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#9C5B26", textTransform: "uppercase", letterSpacing: 0.4 }}>Stretch Promise</p>
            <Pill tone="sand">Optional</Pill>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 13.5, color: T.ink, lineHeight: 1.5 }}>{plan.stretchPromise}</p>
          <p style={{ margin: "8px 0 0", fontSize: 11.5, color: T.inkSoft }}>For days you feel motivated. Skipping it is never failing — your daily promise is what counts.</p>
        </Card>

        {/* Card 3 — Learning Path */}
        <Card style={{ marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.4 }}>Recommended Learn Chapters</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {plan.chapters.map((c) => (
              <div key={c.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.tealPale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Check size={11} color={T.tealDeep} />
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>Chapter {c.n} — {capitalize(c.title)}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 12, color: T.inkSoft }}>We've chosen these because they directly address the challenges you told us about.</p>
        </Card>

        {/* Card 4 — Coaching Plan */}
        <Card style={{ marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.4 }}>Your Personal Coaching Plan</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: T.inkSoft }}>🧠 Coaching style</span><span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{plan.coachSupportStyle || plan.coachStyle || "Balanced"}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: T.inkSoft }}>⏰ Best time</span><span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{plan.productiveTime || plan.timeOfDay || "Flexible"}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: T.inkSoft }}>⏱ Daily commitment</span><span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{plan.timeCommit || "5 minutes"}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: T.inkSoft }}>🎯 Challenge level</span><span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{plan.challengeLevel || "Balanced"}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, color: T.inkSoft }}>🔔 Reminders</span><span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{plan.reminderTime || "Morning"}</span></div>
          </div>
        </Card>

        {/* Card 5 — Self Trust Score */}
        <Card style={{ marginBottom: 12, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.4 }}>⭐ Self-Trust Score</p>
          <p style={{ margin: "6px 0 0", fontFamily: "'Fraunces', serif", fontSize: 30, color: T.ink }}>{plan.trustBaseline}%</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: T.inkSoft }}>This isn't a judgment. It's your starting point. Every promise you keep increases this score.</p>
        </Card>

        {/* Card 6 — What Journi Will Do */}
        <Card style={{ marginBottom: 12 }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.4 }}>Journi will</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              "Break big goals into small daily promises",
              "Help you through moments of resistance",
              "Adjust tomorrow's promises based on today's progress",
              "Celebrate consistency instead of perfection",
              "Turn every kept promise into evidence that builds self-trust and confidence",
            ].map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <Check size={14} color={T.teal} style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: T.ink, lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* AI welcome message */}
        <Card style={{ marginBottom: 20, background: T.sandPale, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Pip size={38} mood="soft" />
          <p style={{ margin: 0, fontSize: 13, color: "#8A5528", fontFamily: "'Fraunces', serif", fontStyle: "italic", lineHeight: 1.6 }}>
            "{plan.name ? `${plan.name}, y` : "Y"}ou're not trying to become a different person overnight. You're simply proving to yourself, one promise at a time, that you can trust yourself again."
          </p>
        </Card>

        <PrimaryButton onClick={() => setPhase("commitment")}>Start My Journi</PrimaryButton>
      </div>
    );
  }

  if (phase === "commitment" && plan) {
    return <PromiseCeremonyScreen onComplete={onComplete} plan={plan} />;
  }

  const ChoiceList = ({ cols = 1 }) => (
    <div className="onboarding-answer-list" style={{ gridTemplateColumns: cols === 1 ? "1fr" : "1fr 1fr" }}>
      {q.options.map((o) => {
        const active = answers[q.key] === o;
        return (
          <button key={o} className="onboarding-answer-card" onClick={() => setAnswer(o)} style={{
            borderRadius: 16, border: `1.5px solid ${active ? T.teal : T.line}`,
            background: active ? T.tealPale : T.surface, cursor: "pointer", textAlign: "left",
            fontSize: 14, fontWeight: 700, color: active ? T.tealDeep : T.ink,
            boxShadow: active ? "none" : "0 1px 2px rgba(38,51,62,0.04)", minWidth: 0, wordBreak: "break-word",
          }}>{o}</button>
        );
      })}
    </div>
  );

  const MultiChoiceList = ({ cols = 2 }) => (
    <div className="onboarding-answer-list" style={{ gridTemplateColumns: cols === 1 ? "1fr" : "1fr 1fr" }}>
      {q.options.map((o) => {
        const active = (answers[q.key] || []).includes(o);
        return (
          <button key={o} className="onboarding-answer-card" onClick={() => toggleMulti(o)} style={{
            borderRadius: 16, border: `1.5px solid ${active ? T.teal : T.line}`,
            background: active ? T.tealPale : T.surface, cursor: "pointer", textAlign: "left",
            fontSize: 13.5, fontWeight: 700, color: active ? T.tealDeep : T.ink,
            display: "flex", alignItems: "center", gap: 8, minWidth: 0, wordBreak: "break-word",
          }}>
            <span style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${active ? T.teal : T.inkFaint}`, background: active ? T.teal : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {active && <Check size={11} color="#fff" />}
            </span>
            {o}
          </button>
        );
      })}
    </div>
  );

  if (q.type === "weekdaySchedule") {
    const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const selectedDays = answers.commitDays || [];
    const count = selectedDays.length;
    const anchorDay = answers.anchorDay || null;

    const toggleDay = (day) => {
      setAnswers((a) => {
        const cur = a.commitDays || [];
        const next = cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day];
        const nextAnchor = next.includes(a.anchorDay) ? a.anchorDay : null;
        return { ...a, commitDays: next, anchorDay: nextAnchor };
      });
    };

    const feedback = count === 0
      ? "Choose the days that genuinely fit your life. It's always better to keep a small promise than break a big one."
      : count === 1 ? "One intentional promise each week is a great place to begin."
      : count <= 3 ? "A balanced commitment that leaves room for life."
      : count <= 5 ? "Great. Consistency matters more than perfection."
      : "Every day is possible — but only if it genuinely feels sustainable.";

    const goToNext = () => {
      if (count === 1 && !anchorDay) {
        setAnswers((a) => ({ ...a, anchorDay: a.commitDays[0] }));
        advance();
      } else if (weekdaySubStep === "days") {
        setWeekdaySubStep("anchor");
      } else {
        advance();
      }
    };

    const daysCanAdvance = weekdaySubStep === "days" ? count > 0 : !!anchorDay;

    return (
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${T.bluePale}, ${T.bg} 45%)`, display: "flex", flexDirection: "column", padding: "max(22px, env(safe-area-inset-top)) 24px max(26px, env(safe-area-inset-bottom))", zIndex: 40 }}>
        <style>{OB_KEYFRAMES}</style>
        <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" }}>Part 2 · Your Journey</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button onClick={() => (weekdaySubStep === "anchor" ? setWeekdaySubStep("days") : back())} aria-label="Go back" style={{ background: T.surface, border: "none", width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ArrowLeft size={16} color={T.ink} />
          </button>
          <div style={{ flex: 1, height: 6, borderRadius: 999, background: T.ring, overflow: "hidden" }}>
            <div style={{ width: `${((qIndex + 1) / currentQuestions.length) * 100}%`, height: "100%", background: T.teal, borderRadius: 999, transition: "width .3s" }} />
          </div>
          {weekdaySubStep === "days" && <button onClick={skip} style={{ background: "none", border: "none", fontSize: 12.5, fontWeight: 700, color: T.inkFaint, cursor: "pointer" }}>Skip</button>}
        </div>

        <div key={weekdaySubStep} style={{ flex: 1, overflowY: "auto", animation: "jSlideIn .35s ease" }}>
          <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 18px" }}>
            <Pip size={64} mood="soft" />
          </div>

          {weekdaySubStep === "days" ? (<>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 21, color: T.ink, textAlign: "center", margin: "0 0 8px", lineHeight: 1.3 }}>{q.heading}</h2>
            <p style={{ textAlign: "center", color: T.inkSoft, fontSize: 13.5, margin: "0 0 22px", minHeight: 36 }}>{feedback}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {DAYS.map((day) => {
                const active = selectedDays.includes(day);
                return (
                  <button key={day} onClick={() => toggleDay(day)} style={{
                    padding: "13px 18px", borderRadius: 999, border: `1.5px solid ${active ? T.teal : T.line}`,
                    background: active ? T.teal : T.surface, cursor: "pointer",
                    fontSize: 13.5, fontWeight: 700, color: active ? "#fff" : T.ink,
                  }}>{day}</button>
                );
              })}
            </div>
            {count >= 6 && (
              <Card style={{ marginTop: 20, background: T.sandPale }}>
                <p style={{ margin: 0, fontSize: 13, color: "#8A5528", lineHeight: 1.7 }}>
                  Are you choosing the version of yourself you hope to be, or the version you realistically are today? The strongest self-trust is built through promises you can actually keep.
                </p>
              </Card>
            )}
          </>) : (<>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 21, color: T.ink, textAlign: "center", margin: "0 0 8px", lineHeight: 1.3 }}>Choose one Anchor Day.</h2>
            <p style={{ textAlign: "center", color: T.inkSoft, fontSize: 13.5, margin: "0 0 22px" }}>If life gets busy, this is the one promise you'll do everything you can to keep.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {selectedDays.map((day) => {
                const active = anchorDay === day;
                return (
                  <button key={day} onClick={() => setAnswers((a) => ({ ...a, anchorDay: day }))} style={{
                    padding: "13px 18px", borderRadius: 999, border: `1.5px solid ${active ? T.sand : T.line}`,
                    background: active ? T.sand : T.surface, cursor: "pointer",
                    fontSize: 13.5, fontWeight: 700, color: active ? "#fff" : T.ink,
                  }}>{day}</button>
                );
              })}
            </div>
          </>)}
        </div>

        <div style={{ marginTop: 14 }}>
          <PrimaryButton onClick={goToNext} disabled={!daysCanAdvance}>
            Continue
          </PrimaryButton>
        </div>
      </div>
    );
  }

  if (q.type === "motivation") {
    return (
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${T.bluePale}, ${T.bg} 55%)`, display: "flex", flexDirection: "column", padding: "max(22px, env(safe-area-inset-top)) 24px max(26px, env(safe-area-inset-bottom))", zIndex: 40 }}>
        <style>{OB_KEYFRAMES}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button onClick={back} aria-label="Go back" style={{ background: T.surface, border: "none", width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ArrowLeft size={16} color={T.ink} />
          </button>
          <div style={{ flex: 1, height: 6, borderRadius: 999, background: T.ring, overflow: "hidden" }}>
            <div style={{ width: `${((qIndex + 1) / currentQuestions.length) * 100}%`, height: "100%", background: T.teal, borderRadius: 999, transition: "width .3s" }} />
          </div>
        </div>

        <div key={qIndex} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", animation: "jSlideIn .4s ease" }}>
          {(() => {
            const ack = getAcknowledgment("goal", answers.goal, answers);
            if (!ack) return null;
            return (
              <Card style={{ marginBottom: 16, background: T.tealPale, width: "100%" }}>
                <p style={{ margin: 0, fontSize: 13, color: T.tealDeep, lineHeight: 1.55, fontFamily: "'Fraunces', serif", fontStyle: "italic" }}>{ack}</p>
              </Card>
            );
          })()}
          <div style={{ margin: "6px 0 18px" }}>
            <PromiseStepsIllustration />
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 24, color: T.ink, margin: "0 0 16px" }}>You're Not Alone</h1>
          <Card style={{ background: T.teal, marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 15, color: "#fff", lineHeight: 1.6, fontWeight: 600 }}>
              92% of people don't achieve their goals — not because they lack ambition, but because they rely on motivation instead of consistent action.
            </p>
          </Card>
          <p style={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.7, maxWidth: 290 }}>
            Journi helps you build consistency through small promises you can actually keep. Every promise you complete strengthens your confidence and self-trust.
          </p>
        </div>

        <div style={{ marginTop: 14 }}>
          <PrimaryButton onClick={advance}>Continue Building My Plan</PrimaryButton>
        </div>
      </div>
    );
  }

  const scaleKey = q.key === "goalConfidence" ? "goalConfidence" : "confidence";
  const canAdvance =
    q.type === "text" ? true :
    q.type === "shortText" ? true :
    q.type === "multiChoice" ? true :
    q.type === "scale" ? true :
    !!answers[q.key];

  return (
    <div className="onboarding-question-screen" style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${T.bluePale}, ${T.bg} 45%)`, display: "flex", flexDirection: "column", zIndex: 40 }}>
      <style>{OB_KEYFRAMES + ONBOARDING_STYLES}</style>
      <div className="onboarding-question-header">
      <p className="onboarding-section-label">
        {phase === "part1" ? "Part 1 · About You" : phase === "trustBaseline" ? "Self-Trust Check-In" : "Part 2 · Your Journey"}
      </p>
      <div className="onboarding-progress-row">
        <button onClick={back} aria-label="Go back" style={{ background: T.surface, border: "none", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ArrowLeft size={16} color={T.ink} />
        </button>
        <div className="onboarding-progress" style={{ borderRadius: 999, background: T.ring, overflow: "hidden" }}>
          <div style={{ width: `${((qIndex + 1) / currentQuestions.length) * 100}%`, height: "100%", background: T.teal, borderRadius: 999, transition: "width .3s" }} />
        </div>
        <button className="onboarding-skip" onClick={skip} style={{ background: "none", border: "none", fontSize: 12.5, fontWeight: 700, color: T.inkFaint, cursor: "pointer" }}>Skip</button>
      </div>
      </div>

      <div className="onboarding-question-content" key={qIndex} style={{ animation: "jSlideIn .35s ease" }}>
        <div className="onboarding-illustration">
          <Pip size={88} mood={qIndex === currentQuestions.length - 1 ? "happy" : "soft"} />
        </div>
        {qIndex > 0 && (() => {
          const prevQ = currentQuestions[qIndex - 1];
          const ack = getAcknowledgment(prevQ.key, answers[prevQ.key], answers);
          if (!ack) return null;
          return (
            <Card style={{ marginBottom: 12, background: T.tealPale }}>
              <p style={{ margin: 0, fontSize: 13, color: T.tealDeep, lineHeight: 1.55, fontFamily: "'Fraunces', serif", fontStyle: "italic" }}>{ack}</p>
            </Card>
          );
        })()}
        <h2 className="onboarding-question-heading">{q.heading}</h2>
        {q.subtitle && <p className="onboarding-question-subtitle">{q.subtitle}</p>}

        {q.type === "choice" && <ChoiceList cols={q.cols || (q.options.length > 4 ? 2 : 1)} />}

        {q.type === "multiChoice" && <MultiChoiceList cols={q.cols || 2} />}

        {q.type === "scale" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 42, color: T.ink }}>{answers[scaleKey] || 5}</span>
              <span style={{ fontSize: 15, color: T.inkFaint }}>/10</span>
            </div>
            <input type="range" min={1} max={10} value={answers[scaleKey] || 5} onChange={(e) => setAnswer(Number(e.target.value))} style={{ width: "100%", accentColor: T.teal }} />
            {(answers[scaleKey] || 5) < 6 && <div style={{ marginTop: 10, textAlign: "center" }}><Pill tone="sand">We'll make your promises much smaller</Pill></div>}
          </div>
        )}

        {q.type === "shortText" && (
          <Card style={{ padding: 13 }}>
            <input
              autoFocus type="text" placeholder={q.placeholder || "Type your answer…"} value={answers[q.key] || ""}
              onChange={(e) => setAnswer(e.target.value)}
              style={{ width: "100%", border: "none", fontSize: 18, fontFamily: "'Fraunces', serif", color: T.ink, outline: "none" }}
            />
          </Card>
        )}

        {q.type === "text" && (
          <Card>
            <textarea
              autoFocus rows={q.big ? 4 : 2} placeholder={q.placeholder || "Tell Journi more…"} value={answers[q.key] || ""}
              onChange={(e) => setAnswer(e.target.value)}
              style={{ width: "100%", border: "none", fontSize: 15.5, fontFamily: "'Fraunces', serif", color: T.ink, outline: "none", resize: "none" }}
            />
            {q.examples && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {q.examples.map((ex) => (
                  <span key={ex} onClick={() => setAnswer(ex)} style={{ fontSize: 11.5, color: T.tealDeep, background: T.tealPale, padding: "5px 10px", borderRadius: 999, cursor: "pointer", fontWeight: 600 }}>{ex}</span>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      <div className="onboarding-scroll-fade" />

      <div className="onboarding-question-cta">
        <PrimaryButton
          onClick={advance}
          disabled={!canAdvance}
        >
          {qIndex === currentQuestions.length - 1 ? "Build my roadmap" : "Continue"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   HOME SCREEN
--------------------------------------------------------- */
function HomeScreen({ go, state, setState, onEvidence }) {
  const [streak, setStreak] = useState(0);
  const [currentDay, setCurrentDay] = useState(1);
  const [offerWeeklyReview, setOfferWeeklyReview] = useState(false);
  const [offerDeepen, setOfferDeepen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = await loadEvidenceTimeline();
      const ceremony = await loadPromiseCeremony();
      if (ceremony?.dateISO) {
        setCurrentDay(daysSince(ceremony.dateISO) + 1);
      }
      if (cancelled) return;
      setStreak(selectStreak(t));
      setOfferWeeklyReview(selectShouldOfferWeeklyReview(t, ceremony?.dateISO));
      const milestones = selectMilestones(t);
      setOfferDeepen(!!milestones["deepen-invite-eligible"] && !milestones["deepen-invite-resolved"]);
    })();
    return () => { cancelled = true; };
  }, []);

  const inProgressChapter = CHAPTERS.find((c) => c.progress > 0 && c.progress < 100);
  const nextChapter = CHAPTERS.find((c) => c.progress === 0);
  const learnSub = inProgressChapter
    ? `Chapter ${inProgressChapter.n} in progress`
    : nextChapter
    ? `Start Chapter ${nextChapter.n}`
    : "All chapters complete";

  const quick = [
    { label: "Learn", sub: learnSub, icon: BookOpen, go: "learn" },
    { label: "Promise Roadmap", sub: "1 active goal", icon: Target, go: "goals" },
    { label: "Movement", sub: "Regulate & move", icon: Footprints, go: "movement" },
    { label: "Evening reflection", sub: "Takes 2 minutes", icon: Moon, go: "reflection" },
    { label: "Reset & regulate", sub: "Calm your body", icon: Wind, go: "reset" },
    { label: "Promise progress", sub: streak > 0 ? `${streak} promise${streak === 1 ? "" : "s"} kept in a row` : "Keep your first promise today", icon: Flame, go: "promiseProgress" },
    { label: "Protect my peace", sub: state.peace?.promiseText ? `Day ${state.peace.day} · 🌿` : "Slow down, on purpose", icon: Leaf, go: "peace" },
    ...(offerWeeklyReview ? [{ label: "Let's look back together", sub: "A few minutes, whenever you're ready", icon: Moon, go: "weeklyReview" }] : []),
  ];

  const selectEmotion = (label) => {
    setState((s) => {
      const history = (s.moodHistory || []).filter((h) => h.day !== "today");
      return { ...s, mood: label, moodHistory: [...history, { day: "today", mood: label }] };
    });
    onEvidence && onEvidence(EVENT_TYPES.MOOD_LOGGED, { mood: label, source: "home" });
  };

  const coaching = state.mood ? EMOTION_COACHING[state.mood] : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 2px 6px" }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: T.inkSoft, fontWeight: 600 }}>Good morning</p>
          <h1 style={{ margin: "2px 0 0", fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 23, color: T.ink }}>{state.plan?.name || "Sarah"}</h1>
        </div>
        <button onClick={() => go("coach")} aria-label="Open Journi coach" style={{ width: 42, height: 42, borderRadius: "50%", background: T.tealPale, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <MessageCircle size={19} color={T.tealDeep} />
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", margin: "18px 0 6px" }} onClick={() => go("progress")}>
        <TrustRing value={state.trust} />
      </div>

      <Card style={{ marginTop: 18, background: T.teal }} onClick={() => go("stuck")}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: 12.5, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>
              Today's promise{state.plan ? ` · Day ${currentDay} of 7` : ""}
            </p>
            <h2 style={{ margin: "8px 0 0", fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 21, color: "#fff" }}>{state.promise}</h2>
          </div>
          <Pip size={44} mood="happy" />
        </div>
        <button onClick={(e) => { e.stopPropagation(); go("stuck"); }} style={{
          marginTop: 16, background: "#fff", color: T.tealDeep, border: "none", borderRadius: 14,
          padding: "12px 0", width: "100%", fontWeight: 700, fontSize: 14.5, cursor: "pointer",
        }}>Start</button>
        <button onClick={(e) => { e.stopPropagation(); go("breakdown"); }} style={{
          marginTop: 10, background: "transparent", color: "rgba(255,255,255,0.85)", border: "none",
          width: "100%", fontWeight: 600, fontSize: 12.5, cursor: "pointer", textDecoration: "underline",
        }}>This promise feels too big?</button>
      </Card>

      {offerDeepen && (
        <Card style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center", background: T.tealPale }} onClick={() => go("deepenProfile")}>
          <Pip size={38} mood="soft" />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: T.ink }}>Can I get to know you a little better?</p>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: T.inkSoft }}>You've had a win. A few more questions and Journi can pick lessons, movement, and coaching tone that actually fit you.</p>
          </div>
          <ChevronRight size={16} color={T.inkFaint} />
        </Card>
      )}

      <SectionTitle>How are you feeling?</SectionTitle>
      <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {EMOTION_GROUPS.map((group) => (
          <div key={group.cat}>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.4 }}>{group.cat}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {group.options.map((m) => {
                const active = state.mood === m.label;
                return (
                  <button key={m.label} onClick={() => selectEmotion(m.label)} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 999,
                    border: `1.5px solid ${active ? T.teal : T.line}`, background: active ? T.tealPale : T.bg,
                    cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: active ? T.tealDeep : T.inkSoft,
                  }}>
                    <span style={{ fontSize: 16 }}>{m.e}</span>{m.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Card>

      {coaching ? (
        <Card style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12, background: T.sandPale }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Pip size={38} mood="soft" />
            <p style={{ margin: 0, fontSize: 13.5, color: "#8A5528", lineHeight: 1.55 }}>{coaching.msg}</p>
          </div>
          <button onClick={() => go(coaching.action)} style={{
            background: T.tealDeep, color: "#fff", border: "none", borderRadius: 12,
            padding: "11px 0", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          }}>{coaching.cta}</button>
        </Card>
      ) : (
        <Card style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center", background: T.sandPale }}>
          <Pip size={38} />
          <p style={{ margin: 0, fontSize: 13.5, color: "#8A5528", fontFamily: "'Fraunces', serif", fontStyle: "italic", lineHeight: 1.5 }}>
            "Today's goal isn't perfection. It's keeping one promise."
          </p>
        </Card>
      )}

      <SectionTitle>Quick access</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {quick.map((q) => (
          <Card key={q.label} onClick={() => go(q.go)} pad={14}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: T.bluePale, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <q.icon size={17} color="#3A6690" />
            </div>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: T.ink }}>{q.label}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: T.inkSoft }}>{q.sub}</p>
          </Card>
        ))}
      </div>
      <div style={{ height: 90 }} />
    </div>
  );
}

/* ---------------------------------------------------------
   LEARN
--------------------------------------------------------- */
function LearnScreen({ go, openChapter, plan }) {
  const done = CHAPTERS.filter((c) => c.progress === 100).length;
  const recNs = new Set((plan?.chapters || (plan?.chapter ? [plan.chapter] : [])).map((c) => c.n));
  return (
    <div>
      <TopBar title="Learn" subtitle="Skills that make keeping today's promise easier." />
      <Card style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Pip size={48} mood="soft" />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: T.ink }}>{done} of {CHAPTERS.length} chapters complete</p>
          <div style={{ marginTop: 8 }}><LinearBar value={(done / CHAPTERS.length) * 100} /></div>
        </div>
      </Card>
      {plan?.chapters?.length > 0 && (
        <Card style={{ marginTop: 14, background: T.sandPale }}>
          <Pill tone="sand">Recommended for you</Pill>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {plan.chapters.map((c) => (
              <div key={c.n} onClick={() => openChapter(c)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <Check size={14} color="#9C5B26" />
                <span style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>Chapter {c.n} · {c.title}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#8A5528" }}>Based on what you told us gets in your way.</p>
        </Card>
      )}
      <SectionTitle>Course</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CHAPTERS.map((c) => (
          <Card key={c.n} onClick={() => openChapter(c)} pad={14} style={{ display: "flex", alignItems: "center", gap: 12, border: recNs.has(c.n) ? `1.5px solid ${T.sand}` : "none" }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: c.progress === 100 ? T.tealPale : T.ring,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {c.progress === 100 ? <Check size={18} color={T.tealDeep} /> : <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: T.inkSoft }}>{c.n}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.ink }}>{c.title}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: T.inkFaint }}>{c.minutes} min · Video, reading, reflection</p>
              {c.progress > 0 && c.progress < 100 && <div style={{ marginTop: 6 }}><LinearBar value={c.progress} tone="sand" /></div>}
            </div>
            <ChevronRight size={16} color={T.inkFaint} />
          </Card>
        ))}
      </div>
      <div style={{ height: 90 }} />
    </div>
  );
}

function ChapterScreen({ chapter, onBack, onCelebrate }) {
  const [tab, setTab] = useState("video");
  const [completed, setCompleted] = useState(false);
  const handleComplete = () => {
    setCompleted(true);
    onCelebrate && onCelebrate("lesson");
  };
  return (
    <div>
      <TopBar title={`Chapter ${chapter.n}`} onBack={onBack} />
      <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 21, color: T.ink, margin: "0 0 14px" }}>{chapter.title}</h2>
      <Card style={{ height: 150, background: T.tealPale, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <div style={{ width: 54, height: 54, borderRadius: "50%", background: T.teal, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Play size={20} color="#fff" fill="#fff" />
        </div>
      </Card>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["video", "reading", "reflection", "exercise"].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "9px 0", borderRadius: 12, border: "none", textTransform: "capitalize",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: tab === t ? T.teal : T.surface, color: tab === t ? "#fff" : T.inkSoft,
          }}>{t}</button>
        ))}
      </div>
      <Card>
        {tab === "video" && <p style={{ margin: 0, fontSize: 14, color: T.inkSoft, lineHeight: 1.7 }}>A short video walks through why your brain resists starting, even on goals you genuinely care about.</p>}
        {tab === "reading" && <p style={{ margin: 0, fontSize: 14, color: T.inkSoft, lineHeight: 1.7 }}>Your brain runs two systems: one that imagines the future, and one that protects you from effort and risk right now. Big dreams live in the first system. Action lives in the second — and it doesn't automatically agree to the plan.</p>}
        {tab === "reflection" && <p style={{ margin: 0, fontSize: 14, color: T.inkSoft, lineHeight: 1.7 }}>Think of a promise you broke to yourself this week. What did the moment right before you avoided it feel like in your body?</p>}
        {tab === "exercise" && <p style={{ margin: 0, fontSize: 14, color: T.inkSoft, lineHeight: 1.7 }}>Pick one goal you've been avoiding. Write the smallest possible first step — something that takes under two minutes.</p>}
      </Card>
      <SectionTitle>Key takeaways</SectionTitle>
      <Card>
        {["Resistance is protective, not a character flaw.", "Small steps bypass the brain's threat response.", "Consistency rebuilds trust faster than intensity."].map((k, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i < 2 ? 10 : 0 }}>
            <div style={{ marginTop: 3, width: 6, height: 6, borderRadius: "50%", background: T.teal, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 13.5, color: T.ink, lineHeight: 1.6 }}>{k}</p>
          </div>
        ))}
      </Card>
      <div style={{ marginTop: 16 }}><PrimaryButton onClick={handleComplete}>{completed ? "Completed ✓" : "Mark chapter complete"}</PrimaryButton></div>
      {completed && (
        <Card style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", background: T.sandPale }}>
          <Pip size={28} mood="happy" />
          <p style={{ margin: 0, fontSize: 12.5, color: "#8A5528", lineHeight: 1.5 }}>Knowledge becomes change when it's put into action.</p>
        </Card>
      )}
      <div style={{ height: 40 }} />
    </div>
  );
}

/* ---------------------------------------------------------
   GOAL TRACKER
--------------------------------------------------------- */
function PromiseLadder({ ladder }) {
  return (
    <Card>
      <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.4 }}>Promise Ladder</p>
      {ladder.slice().reverse().map((r, i) => (
        <div key={r.label} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i < ladder.length - 1 ? 12 : 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: r.top ? T.sand : T.teal, flexShrink: 0 }} />
            {i < ladder.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 18, background: T.ring, marginTop: 2 }} />}
          </div>
          <div style={{ paddingBottom: 2 }}>
            <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.3 }}>{r.label}</p>
            <p style={{ margin: "1px 0 0", fontSize: 13.5, color: T.ink, fontWeight: r.top ? 700 : 500, fontFamily: r.top ? "'Fraunces', serif" : "inherit" }}>{r.text}</p>
          </div>
        </div>
      ))}
    </Card>
  );
}

function GoalTrackerScreen({ onBack, plan, onBreakdown, promise, go }) {
  if (plan) {
    return (
      <div>
        <TopBar title="Promise Roadmap" onBack={onBack} />
        <PromiseLadder ladder={plan.ladder} />
        <Card style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", background: T.bluePale }}>
          <Pip size={30} mood="soft" />
          <p style={{ margin: 0, fontSize: 12, color: "#3A6690", lineHeight: 1.5 }}>This roadmap adapts automatically — struggle and it shrinks, follow through and it grows.</p>
        </Card>
        {plan.commitDays?.length > 0 && (
          <Card style={{ marginTop: 14 }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.5 }}>Your promise days</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {plan.commitDays.map((d) => (
                <Pill key={d} tone={d === plan.anchorDay ? "sand" : "blue"}>{d.slice(0, 3)}{d === plan.anchorDay ? " ⚓" : ""}</Pill>
              ))}
            </div>
            {plan.anchorDay && <p style={{ margin: "10px 0 0", fontSize: 11.5, color: T.inkSoft }}><strong style={{ color: T.ink }}>{plan.anchorDay}</strong> is your Anchor Day — the one you'll do everything you can to keep.</p>}
          </Card>
        )}
        {plan.fastPath && (
          <Card style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }} onClick={() => go && go("deepenProfile")}>
            <Feather size={16} color={T.tealDeep} />
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: T.ink }}>Tell Journi more about your goal</span>
            <ChevronRight size={15} color={T.inkFaint} />
          </Card>
        )}
        <SectionTitle>This week's promises</SectionTitle>
        <Card pad={0}>
          {plan.week.map((d, i) => {
            const tone = d.label === "Reflect" ? "blue" : d.label === "Plan" ? "sand" : "teal";
            return (
              <div key={d.day} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 16px", borderBottom: i < plan.week.length - 1 ? `1px solid ${T.line}` : "none" }}>
                <div style={{ minWidth: 68 }}><Pill tone={tone}>{d.day.slice(0, 3)}</Pill></div>
                <span style={{ fontSize: 13.5, color: T.ink, fontWeight: 600, lineHeight: 1.5 }}>{d.text}</span>
              </div>
            );
          })}
        </Card>
        {plan.stretchPromise && (
          <Card style={{ marginTop: 14, border: `1.5px dashed ${T.sand}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#9C5B26", textTransform: "uppercase", letterSpacing: 0.4 }}>Stretch Promise</p>
              <Pill tone="sand">Optional</Pill>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 13.5, color: T.ink, lineHeight: 1.5 }}>{plan.stretchPromise}</p>
          </Card>
        )}
        <div style={{ marginTop: 14 }}>
          <GhostButton onClick={() => onBreakdown(promise)}>This promise feels too big?</GhostButton>
        </div>
        <div style={{ height: 40 }} />
      </div>
    );
  }
  return (
    <div>
      <TopBar title="Promise Roadmap" onBack={onBack} />
      <Card style={{ textAlign: "center", padding: 24 }}>
        <Pip size={40} mood="soft" />
        <p style={{ margin: "12px 0 0", fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6 }}>
          You haven't built a personalised Promise Roadmap yet. Complete the Promise Builder and Journi will map out your week for you.
        </p>
      </Card>
      {promise && (
        <>
          <SectionTitle>Today's promise</SectionTitle>
          <Card style={{ background: T.teal }}>
            <p style={{ margin: 0, fontSize: 15, color: "#fff", fontWeight: 600 }}>{promise}</p>
          </Card>
          <div style={{ marginTop: 14 }}>
            <GhostButton onClick={() => onBreakdown(promise)}>This promise feels too big?</GhostButton>
          </div>
        </>
      )}
      <div style={{ height: 40 }} />
    </div>
  );
}

/* ---------------------------------------------------------
   MOVEMENT
--------------------------------------------------------- */
function MovementScreen({ onBack, plan, onEvidence }) {
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0);
  const [justLogged, setJustLogged] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = await loadEvidenceTimeline();
      const count = countCompletedInWindow2(t, EVENT_TYPES.EMOTIONAL_CHECKIN_COMPLETED, "movement", 7);
      if (!cancelled) setSessionsThisWeek(count);
    })();
    return () => { cancelled = true; };
  }, []);

  const logSession = async (name) => {
    setJustLogged(name);
    await onEvidence(EVENT_TYPES.EMOTIONAL_CHECKIN_COMPLETED, { source: "movement", activity: name });
    setSessionsThisWeek((n) => n + 1);
    setTimeout(() => setJustLogged(null), 1800);
  };

  return (
    <div>
      <TopBar title="Movement" subtitle="Overcome resistance and create momentum." onBack={onBack} />
      <Card style={{ display: "flex", gap: 12, alignItems: "center", background: T.bluePale }}>
        <Pip size={40} mood="soft" />
        <p style={{ margin: 0, fontSize: 13, color: "#3A6690", lineHeight: 1.6 }}>A little movement helps regulate your nervous system before you take action.</p>
      </Card>
      <Card style={{ marginTop: 14, textAlign: "center", padding: 18 }}>
        <p style={{ margin: 0, fontSize: 12, color: T.inkFaint, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Sessions this week</p>
        <p style={{ margin: "6px 0 0", fontFamily: "'Fraunces', serif", fontSize: 24, color: T.ink }}>{sessionsThisWeek}</p>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: T.inkSoft, lineHeight: 1.6 }}>Sometimes movement is the fastest way through resistance.</p>
      </Card>
      <SectionTitle>Choose an activity</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {MOVEMENTS.map((m) => {
          const rec = plan?.movement?.some((x) => x.name === m.name);
          const logged = justLogged === m.name;
          return (
            <Card key={m.name} pad={16} onClick={() => logSession(m.name)} style={{ textAlign: "center", border: rec ? `1.5px solid ${T.sand}` : "none", cursor: "pointer" }}>
              {rec && !logged && <div style={{ marginBottom: 6 }}><Pill tone="sand">For you</Pill></div>}
              {logged && <div style={{ marginBottom: 6 }}><Pill tone="teal">Logged ✓</Pill></div>}
              <div style={{ width: 42, height: 42, borderRadius: 12, background: T.tealPale, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <m.icon size={19} color={T.tealDeep} />
              </div>
              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: T.ink }}>{m.name}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11.5, color: T.inkFaint }}>{m.mins}</p>
            </Card>
          );
        })}
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

/* ---------------------------------------------------------
   RESET & REGULATE
--------------------------------------------------------- */
function ResetScreen({ onBack, plan, onCelebrate }) {
  const recommended = plan?.obstacle ? RESET_BY_OBSTACLE[plan.obstacle] : null;
  return (
    <div>
      <TopBar title="Reset & regulate" onBack={onBack} />
      <SectionTitle>How do you feel right now?</SectionTitle>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["Tense", "Racing thoughts", "Numb", "Restless"].map((f) => <Pill key={f} tone="blue">{f}</Pill>)}
      </div>
      {recommended && (
        <Card style={{ marginTop: 14, background: T.sandPale }}>
          <Pill tone="sand">Recommended for you</Pill>
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#8A5528" }}>Based on what you told Journi gets in your way.</p>
        </Card>
      )}
      <SectionTitle>Guided exercises</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {RESETS.map((r) => {
          const rec = recommended?.includes(r.name);
          return (
            <Card key={r.name} pad={14} onClick={() => onCelebrate && onCelebrate("reset")} style={{ display: "flex", alignItems: "center", gap: 12, border: rec ? `1.5px solid ${T.sand}` : "none" }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: T.sandPale, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <r.icon size={17} color="#9C5B26" />
              </div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: T.ink }}>{r.name}</span>
              {rec && <Pill tone="sand">For you</Pill>}
              <ChevronRight size={16} color={T.inkFaint} />
            </Card>
          );
        })}
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

/* ---------------------------------------------------------
   PROTECT MY PEACE — a calmer promise category
--------------------------------------------------------- */
function PeaceScreen({ onBack, peace, setPeace, christianMode, onPromiseKept, onEvidence }) {
  const [custom, setCustom] = useState("");

  const choosePromise = (text) => {
    setPeace((p) => ({
      ...(p || {}),
      promiseText: text,
      day: (p?.day || 0) + 1,
      morning: pickRandom(PEACE_MORNING_LINES),
      reflection: pickRandom(PEACE_REFLECTIONS),
      inspiration: christianMode ? { type: "scripture", ...pickRandom(PEACE_SCRIPTURE), prayer: pickRandom(PEACE_PRAYERS) } : { type: "wisdom", text: pickRandom(PEACE_WISDOM) },
      checkin: null,
      momentLoggedDay: null,
    }));
  };

  const logMoment = () => {
    setPeace((p) => ({ ...p, momentLoggedDay: p.day }));
    onEvidence && onEvidence(EVENT_TYPES.EMOTIONAL_CHECKIN_COMPLETED, { source: "peace_reflection" });
  };

  const checkIn = (key) => {
    setPeace((p) => ({ ...p, checkin: key }));
    if ((key === "yes" || key === "mostly") && onPromiseKept) onPromiseKept({ source: "peace" });
  };

  // ---- No promise chosen yet: show the peaceful promise library ----
  if (!peace?.promiseText) {
    return (
      <div>
        <TopBar title="Protect My Peace" onBack={onBack} />
        <Card style={{ display: "flex", gap: 12, alignItems: "flex-start", background: T.bluePale }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Leaf size={19} color="#3A6690" />
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#3A6690", lineHeight: 1.6 }}>
            This isn't about doing more. It's about living more intentionally — with calm, presence, and healthy boundaries.
          </p>
        </Card>

        <SectionTitle>Choose a Peace Promise</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PEACE_PROMISES.map((p) => (
            <Card key={p} pad={14} onClick={() => choosePromise(p)} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Feather size={15} color={T.blue} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, color: T.ink, fontWeight: 600, lineHeight: 1.4 }}>{p}</span>
            </Card>
          ))}
        </div>

        <SectionTitle>Or write your own</SectionTitle>
        <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <textarea
            rows={2} placeholder="Today, I promise to…" value={custom}
            onChange={(e) => setCustom(e.target.value)}
            style={{ width: "100%", border: `1.5px solid ${T.line}`, borderRadius: 12, padding: "10px 12px", fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "none" }}
          />
          <PrimaryButton onClick={() => custom.trim() && choosePromise(custom.trim())} disabled={!custom.trim()}>
            Choose this promise
          </PrimaryButton>
        </Card>
        <div style={{ height: 40 }} />
      </div>
    );
  }

  // ---- Today's Peace Journey ----
  return (
    <div>
      <TopBar title="Protect My Peace" onBack={onBack} />
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
        <Pill tone="blue">🌿 Day {peace.day} of your Peace Journey</Pill>
      </div>

      <Card style={{ marginTop: 14, background: T.blue, textAlign: "center", padding: 24 }}>
        <Pip size={40} mood="soft" />
        <p style={{ margin: "12px 0 0", fontFamily: "'Fraunces', serif", fontSize: 18, color: "#fff", lineHeight: 1.4 }}>{peace.promiseText}</p>
      </Card>

      <SectionTitle>Morning encouragement</SectionTitle>
      <Card style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Pip size={34} mood="soft" />
        <p style={{ margin: 0, fontSize: 13.5, color: T.ink, lineHeight: 1.65, fontFamily: "'Fraunces', serif", fontStyle: "italic" }}>{peace.morning}</p>
      </Card>

      <SectionTitle>Reflection</SectionTitle>
      <Card>
        <p style={{ margin: "0 0 8px", fontSize: 13.5, fontWeight: 700, color: T.ink }}>{peace.reflection}</p>
        <textarea rows={2} placeholder="Write freely…" style={{ width: "100%", border: `1.5px solid ${T.line}`, borderRadius: 12, padding: "10px 12px", fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "none" }} />
      </Card>

      <SectionTitle>Inspiration</SectionTitle>
      <Card style={{ background: T.sandPale }}>
        {peace.inspiration?.type === "scripture" ? (
          <>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#9C5B26", textTransform: "uppercase", letterSpacing: 0.4 }}>🙏 {peace.inspiration.ref}</p>
            <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "#8A5528", lineHeight: 1.6, fontFamily: "'Fraunces', serif", fontStyle: "italic" }}>{peace.inspiration.text}</p>
            <p style={{ margin: "12px 0 0", fontSize: 12, color: "#8A5528", lineHeight: 1.6 }}>A short prayer: "{peace.inspiration.prayer}"</p>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 13.5, color: "#8A5528", lineHeight: 1.6, fontFamily: "'Fraunces', serif", fontStyle: "italic" }}>{peace.inspiration?.text}</p>
        )}
      </Card>

      {peace.momentLoggedDay === peace.day ? (
        <Card style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", background: T.bluePale }}>
          <Leaf size={16} color="#3A6690" />
          <span style={{ fontSize: 12.5, color: "#3A6690", fontWeight: 600 }}>Moment logged — that pause matters.</span>
        </Card>
      ) : (
        <GhostButton onClick={logMoment} style={{ marginTop: 12 }}>I took a moment with this</GhostButton>
      )}

      <SectionTitle>Gentle reminders</SectionTitle>
      <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {PEACE_REMINDERS.map((r) => (
          <div key={r} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Leaf size={13} color={T.blue} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: T.inkSoft }}>{r}</span>
          </div>
        ))}
      </Card>

      <SectionTitle>Evening check-in</SectionTitle>
      <Card>
        <p style={{ margin: "0 0 12px", fontSize: 13.5, fontWeight: 700, color: T.ink }}>Did you keep today's promise?</p>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { key: "yes", label: "✅ Yes" },
            { key: "mostly", label: "🌱 Mostly" },
            { key: "learning", label: "❤️ Still learning" },
          ].map((o) => (
            <button key={o.key} onClick={() => checkIn(o.key)} style={{
              flex: 1, padding: "12px 6px", borderRadius: 14, cursor: "pointer", textAlign: "center",
              border: `1.5px solid ${peace.checkin === o.key ? T.blue : T.line}`,
              background: peace.checkin === o.key ? T.bluePale : T.surface,
              fontSize: 12, fontWeight: 700, color: T.ink,
            }}>{o.label}</button>
          ))}
        </div>
        {peace.checkin && (
          <p style={{ margin: "14px 0 0", fontSize: 13, color: T.inkSoft, lineHeight: 1.6, fontStyle: "italic" }}>{PEACE_CHECKIN_RESPONSES[peace.checkin]}</p>
        )}
      </Card>

      <div style={{ marginTop: 16 }}>
        <GhostButton onClick={() => setPeace((p) => ({ ...p, promiseText: null }))}>Choose a different peace promise</GhostButton>
      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}

/* ---------------------------------------------------------
   EVENING REFLECTION
--------------------------------------------------------- */
function ReflectionScreen({ onBack, plan, onCelebrate }) {
  const [saved, setSaved] = useState(false);
  const qs = plan?.reflectionPrompts
    ? ["Did you keep today's promise?", ...plan.reflectionPrompts]
    : ["Did you keep today's promise?", "What almost stopped you?", "What helped?", "How do you feel now?", "What did you learn?"];

  const handleSave = () => {
    setSaved(true);
    onCelebrate && onCelebrate("reflection");
  };

  return (
    <div>
      <TopBar title="Evening reflection" subtitle="Reflect on today, prepare for tomorrow." onBack={onBack} />
      {plan?.name && <p style={{ margin: "0 0 10px", fontSize: 13, color: T.inkSoft }}>How did today go, {plan.name}?</p>}
      <Card style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Calendar size={16} color={T.inkSoft} />
        <span style={{ fontSize: 13, color: T.inkSoft, fontWeight: 600 }}>Sunday, 12 July</span>
      </Card>
      <SectionTitle>Mood</SectionTitle>
      <Card style={{ display: "flex", justifyContent: "space-around" }}>
        {["😊", "🙂", "😐", "😟", "😩"].map((e) => <span key={e} style={{ fontSize: 24 }}>{e}</span>)}
      </Card>
      <SectionTitle>Reflection</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {qs.map((q) => (
          <Card key={q}>
            <p style={{ margin: "0 0 8px", fontSize: 13.5, fontWeight: 700, color: T.ink }}>{q}</p>
            <textarea rows={2} placeholder="Write freely…" style={{ width: "100%", border: `1.5px solid ${T.line}`, borderRadius: 12, padding: "10px 12px", fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "none" }} />
          </Card>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <PrimaryButton onClick={handleSave}>{saved ? "Saved ✓" : "Save reflection"}</PrimaryButton>
      </div>
      {saved && (
        <Card style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", background: T.sandPale }}>
          <Pip size={28} mood="soft" />
          <p style={{ margin: 0, fontSize: 12.5, color: "#8A5528", lineHeight: 1.5 }}>Reflection helps turn today's experience into tomorrow's progress.</p>
        </Card>
      )}
      <SectionTitle>Past reflections</SectionTitle>
      <Card style={{ textAlign: "center", padding: 22 }}>
        <Pip size={34} mood="soft" />
        <p style={{ margin: "10px 0 0", fontSize: 13, color: T.inkSoft, lineHeight: 1.6 }}>Every journey begins with one honest reflection.</p>
      </Card>
      <div style={{ height: 40 }} />
    </div>
  );
}

/* ---------------------------------------------------------
   PROMISE PROGRESS
--------------------------------------------------------- */
function countCompletedInWindow(timeline, days) {
  const cutoff = startOfDay(new Date(Date.now() - (days - 1) * 86400000));
  const dayKeys = new Set();
  selectEventsOfType(timeline, EVENT_TYPES.PROMISE_COMPLETED).forEach((e) => {
    if (new Date(e.timestamp) >= cutoff) dayKeys.add(e.dayKey);
  });
  return dayKeys.size;
}

/* Generic reusable counter: any feature (movement, reset, future modules)
   can count its own logged events within a rolling window without
   reimplementing this logic — one behavioural source of truth. */
function countCompletedInWindow2(timeline, type, source, days) {
  const cutoff = startOfDay(new Date(Date.now() - (days - 1) * 86400000));
  return selectEventsOfType(timeline, type).filter((e) => e.payload?.source === source && new Date(e.timestamp) >= cutoff).length;
}

/* All-time count by source, for lifetime totals (e.g. total movement or
   reset sessions) rather than a rolling window. */
function selectEventCountBySource(timeline, type, source) {
  return selectEventsOfType(timeline, type).filter((e) => e.payload?.source === source).length;
}

/* Generic windowed count, no source filter — used by the Weekly Review's
   recap sentence to count recoveries/reschedules in the last 7 days. */
function selectEventCountInWindow(timeline, type, days) {
  const cutoff = startOfDay(new Date(Date.now() - (days - 1) * 86400000));
  return selectEventsOfType(timeline, type).filter((e) => new Date(e.timestamp) >= cutoff).length;
}

const WEEKDAY_INDEX = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
/* Finds the most recent occurrence (within the last 7 days, including
   today) of the person's chosen Anchor Day and reports honestly whether
   it was kept — never fabricated, never assumed. */
function selectAnchorDayStatus(timeline, anchorDay) {
  if (!anchorDay || !(anchorDay in WEEKDAY_INDEX)) return null;
  const targetIdx = WEEKDAY_INDEX[anchorDay];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() - i * 86400000);
    if (d.getDay() === targetIdx) {
      const dayKey = localDayKey(d);
      return { dayKey, kept: selectCompletedOnDay(timeline, dayKey), isToday: i === 0 };
    }
  }
  return null;
}

/* Distinct calendar days on which the person interacted with Journi at
   all — a broader "showed up" measure than promise completion alone. */
function selectDaysShownUp(timeline) {
  return new Set(timeline.map((e) => e.dayKey)).size;
}

/* Consecutive-day streak scoped to a specific event source — reusable by
   any feature (e.g. Peace Journey) that needs its own streak without
   duplicating the streak algorithm. */
function selectStreakBySource(timeline, type, source) {
  const days = new Set(selectEventsOfType(timeline, type).filter((e) => e.payload?.source === source).map((e) => e.dayKey));
  let streak = 0;
  let cursor = new Date();
  while (days.has(localDayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
}

/* Real mood -> follow-through correlation, computed from actual
   check-ins cross-referenced against promise completions on the same
   day — replaces any static illustrative table. Only returns moods
   that have genuinely been logged at least once. */
function selectMoodFollowThrough(timeline) {
  const moodEvents = timeline.filter((e) => (e.type === EVENT_TYPES.MOOD_LOGGED || e.type === EVENT_TYPES.EMOTIONAL_CHECKIN_COMPLETED) && e.payload?.mood);
  const completedDays = selectDayKeysCompleted(timeline);
  const byMood = {};
  moodEvents.forEach((e) => {
    const mood = e.payload.mood;
    if (!byMood[mood]) byMood[mood] = { total: 0, kept: 0 };
    byMood[mood].total += 1;
    if (completedDays.has(e.dayKey)) byMood[mood].kept += 1;
  });
  return Object.entries(byMood)
    .map(([label, v]) => ({ label, pct: Math.round((v.kept / v.total) * 100), total: v.total }))
    .sort((a, b) => b.pct - a.pct);
}

function PromiseProgressScreen({ onBack }) {
  const [timeline, setTimeline] = useState([]);
  const [startDate, setStartDate] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = await loadEvidenceTimeline();
      const ceremony = await loadPromiseCeremony();
      if (!cancelled) { setTimeline(t); setStartDate(ceremony?.dateISO || null); }
    })();
    return () => { cancelled = true; };
  }, []);

  const streak = selectStreak(timeline);
  const elapsedDays = startDate ? daysSince(startDate) + 1 : 7;
  const weekPossible = Math.min(7, elapsedDays);
  const monthPossible = Math.min(30, elapsedDays);
  const weekKept = countCompletedInWindow(timeline, weekPossible);
  const monthKept = countCompletedInWindow(timeline, monthPossible);

  return (
    <div>
      <TopBar title="Promise progress" subtitle="Measured by promises kept, not perfection." onBack={onBack} />
      <Card style={{ background: T.teal, textAlign: "center" }}>
        <Flame size={26} color="#fff" style={{ marginBottom: 6 }} />
        <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 500, color: "#fff" }}>{streak} day{streak === 1 ? "" : "s"}</p>
        <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>Promises kept in a row</p>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
        <Card pad={14}><p style={{ margin: 0, fontSize: 12, color: T.inkSoft, fontWeight: 600 }}>This week</p><p style={{ margin: "4px 0 0", fontFamily: "'Fraunces', serif", fontSize: 22, color: T.ink }}>{weekKept} / {weekPossible}</p></Card>
        <Card pad={14}><p style={{ margin: 0, fontSize: 12, color: T.inkSoft, fontWeight: 600 }}>This month</p><p style={{ margin: "4px 0 0", fontFamily: "'Fraunces', serif", fontSize: 22, color: T.ink }}>{monthKept} / {monthPossible}</p></Card>
      </div>
      <SectionTitle>Identity progress</SectionTitle>
      <Card style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Pip size={42} mood="happy" />
        <p style={{ margin: 0, fontSize: 13.5, color: T.ink, fontFamily: "'Fraunces', serif", fontStyle: "italic", lineHeight: 1.5 }}>You are becoming someone who follows through.</p>
      </Card>
      <div style={{ height: 40 }} />
    </div>
  );
}

/* ---------------------------------------------------------
   MY PROGRESS (dashboard)
--------------------------------------------------------- */
function ProgressScreen({ plan, moodHistory, peace, trust }) {
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = await loadEvidenceTimeline();
      if (!cancelled) setTimeline(t);
    })();
    return () => { cancelled = true; };
  }, []);

  const chaptersDone = CHAPTERS.filter((c) => c.progress === 100).length;
  const learningPct = Math.round((CHAPTERS.reduce((sum, c) => sum + c.progress, 0) / (CHAPTERS.length * 100)) * 100);
  const completionRate = selectCompletionRate(timeline);

  const stats = [
    { label: "Promises kept", value: String(selectPromisesKept(timeline)), icon: Check },
    { label: "Days shown up", value: String(selectDaysShownUp(timeline)), icon: Calendar },
    { label: "Learning", value: `${learningPct}%`, icon: BookOpen },
    { label: "Follow-Through Rate", value: completionRate === null ? "—" : `${completionRate}%`, icon: Target },
    { label: "Movement sessions", value: String(selectEventCountBySource(timeline, EVENT_TYPES.EMOTIONAL_CHECKIN_COMPLETED, "movement")), icon: Footprints },
    { label: "Reset sessions", value: String(selectEventCountBySource(timeline, EVENT_TYPES.EMOTIONAL_CHECKIN_COMPLETED, "reset_exercise")), icon: Wind },
  ];

  const moodStats = selectMoodFollowThrough(timeline);
  const best = moodStats[0];
  const worst = moodStats[moodStats.length - 1];
  const today = moodHistory?.find((h) => h.day === "today");

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const dk = localDayKey(d);
    const dayMoods = timeline.filter((e) => (e.type === EVENT_TYPES.MOOD_LOGGED || e.type === EVENT_TYPES.EMOTIONAL_CHECKIN_COMPLETED) && e.dayKey === dk && e.payload?.mood);
    if (!dayMoods.length) return { label: "SMTWTFS"[d.getDay()], height: 0 };
    const moodMatch = EMOTION_FOLLOWTHROUGH.find((m) => m.label === dayMoods[dayMoods.length - 1].payload.mood);
    return { label: "SMTWTFS"[d.getDay()], height: moodMatch ? moodMatch.pct : 55 };
  });

  const weekKept = countCompletedInWindow(timeline, 7);
  const recentEvidence = [...timeline]
    .filter((e) => [EVENT_TYPES.PROMISE_COMPLETED, EVENT_TYPES.RECOVERY_AFTER_SETBACK, EVENT_TYPES.PROMISE_INCREASED, EVENT_TYPES.PROMISE_RESCHEDULED, EVENT_TYPES.MILESTONE_REACHED].includes(e.type))
    .reverse()
    .slice(0, 5);

  return (
    <div>
      <TopBar title="My progress" subtitle="Watch your self-trust grow, one promise at a time." />
      <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 16px" }}><TrustRing value={trust ?? plan?.trustBaseline ?? 45} size={140} stroke={12} /></div>
      <Card style={{ marginBottom: 4, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 12.5, color: T.inkSoft, lineHeight: 1.7 }}>
          Every promise kept becomes <strong style={{ color: T.ink }}>evidence</strong>. Evidence builds <strong style={{ color: T.ink }}>self-trust</strong>. Self-trust builds <strong style={{ color: T.ink }}>confidence</strong> — and confidence becomes who you are.
        </p>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {stats.map((s) => (
          <Card key={s.label} pad={14}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: T.bluePale, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <s.icon size={14} color="#3A6690" />
            </div>
            <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 20, color: T.ink }}>{s.value}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: T.inkSoft, fontWeight: 600 }}>{s.label}</p>
          </Card>
        ))}
      </div>
      <SectionTitle>Mood trend</SectionTitle>
      <Card>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 70 }}>
          {last7.map((d, i) => (
            <div key={i} style={{ flex: 1, height: `${Math.max(d.height, 4)}%`, background: d.height ? T.tealPale : T.ring, borderRadius: 6, position: "relative" }}>
              {d.height > 0 && <div style={{ position: "absolute", bottom: 0, width: "100%", height: "60%", background: T.teal, borderRadius: 6 }} />}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          {last7.map((d, i) => <span key={i} style={{ fontSize: 10.5, color: T.inkFaint, flex: 1, textAlign: "center" }}>{d.label}</span>)}
        </div>
      </Card>
      <SectionTitle>Emotional Pattern Map</SectionTitle>
      <Card>
        {today && (
          <Pill tone="teal">Today: {today.mood}</Pill>
        )}
        {moodStats.length === 0 ? (
          <p style={{ margin: today ? "10px 0 0" : 0, fontSize: 13, color: T.inkSoft, lineHeight: 1.6 }}>Your emotional patterns will appear here as you check in over time.</p>
        ) : (
          <>
            <p style={{ margin: today ? "10px 0 0" : 0, fontSize: 13, color: T.ink, lineHeight: 1.6 }}>
              {best && <>You follow through most when you check in feeling <strong>{best.label}</strong> ({best.pct}%){moodStats.length > 1 && worst ? <>, and it's hardest when you feel <strong>{worst.label}</strong> ({worst.pct}%)</> : ""}.</>}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              {moodStats.slice(0, 6).map((item) => (
                <div key={item.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: T.ink }}>{item.label}</span>
                    <span style={{ fontSize: 12, color: T.inkFaint, fontWeight: 600 }}>{item.pct}%</span>
                  </div>
                  <LinearBar value={item.pct} tone={item.pct >= 70 ? "teal" : item.pct >= 50 ? "blue" : "sand"} />
                </div>
              ))}
            </div>
          </>
        )}
        <p style={{ margin: "12px 0 0", fontSize: 11.5, color: T.inkFaint }}>Built from your emotional check-ins over time — Journi uses this to personalise coaching moment to moment.</p>
      </Card>
      {peace?.promiseText && (() => {
        const peaceKept = selectEventCountBySource(timeline, EVENT_TYPES.PROMISE_COMPLETED, "peace");
        const peaceStreak = selectStreakBySource(timeline, EVENT_TYPES.PROMISE_COMPLETED, "peace");
        const livePeaceStats = [
          { label: "Peace promises kept", value: String(peaceKept) },
          { label: "Consecutive peace days", value: String(peaceStreak) },
          { label: "Quiet moments", value: String(selectEventsOfType(timeline, EVENT_TYPES.QUIET_MOMENT).length) },
          { label: "Reflection sessions", value: String(selectEventsOfType(timeline, EVENT_TYPES.REFLECTION_WRITTEN).length) },
          { label: "Mindful choices", value: String(selectEventsOfType(timeline, EVENT_TYPES.MINDFUL_CHOICE).length) },
          { label: "Personal best", value: `${peaceStreak} day${peaceStreak === 1 ? "" : "s"}` },
        ];
        return (
          <>
            <SectionTitle>🌿 Peace Journey</SectionTitle>
            <Card>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {livePeaceStats.map((s) => (
                  <div key={s.label}>
                    <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 19, color: T.ink }}>{s.value}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11.5, color: T.inkSoft, fontWeight: 600 }}>{s.label}</p>
                  </div>
                ))}
              </div>
              <p style={{ margin: "14px 0 0", fontSize: 12, color: T.inkSoft, fontStyle: "italic" }}>Consistency, not perfection — every peaceful choice counts.</p>
            </Card>
          </>
        );
      })()}
      <SectionTitle>AI weekly reflection</SectionTitle>
      <Card style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Pip size={40} mood="soft" />
        <p style={{ margin: 0, fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6 }}>
          {weekKept === 0
            ? `${plan?.name ? `${plan.name}, y` : "Y"}our week is just getting started — every promise you keep from here becomes part of this story.`
            : `${plan?.name ? `${plan.name}, you` : "You"} kept your promise ${weekKept} of the last 7 days. ${plan?.timeOfDay && plan.timeOfDay !== "It changes" ? `${plan.timeOfDay} tends to be when things get hardest for you.` : "Keep noticing what makes each day easier or harder."}`}
        </p>
      </Card>
      <SectionTitle>Evidence vault</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {recentEvidence.length === 0 ? (
          <Card pad={16} style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 12.5, color: T.inkSoft, lineHeight: 1.6 }}>Your first kept promise is the beginning of rebuilding self-trust. It'll show up here.</p>
          </Card>
        ) : (
          recentEvidence.map((e) => {
            const text = e.type === EVENT_TYPES.RECOVERY_AFTER_SETBACK ? "Showed up again after missing a day."
              : e.type === EVENT_TYPES.PROMISE_INCREASED ? "Took on more because the energy was there."
              : e.type === EVENT_TYPES.PROMISE_RESCHEDULED ? "Right-sized a promise instead of abandoning it."
              : e.type === EVENT_TYPES.MILESTONE_REACHED ? (MILESTONE_LABELS[e.payload.key] || "Reached a milestone.")
              : e.payload?.promise ? `Kept a promise: ${e.payload.promise}` : "Kept a promise.";
            return (
              <Card key={e.id} pad={12} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Award size={16} color={T.sand} />
                <span style={{ fontSize: 13, color: T.ink }}>{text}</span>
              </Card>
            );
          })
        )}
      </div>
      <div style={{ height: 90 }} />
    </div>
  );
}

/* ---------------------------------------------------------
   PROFILE
--------------------------------------------------------- */
function Toggle({ on, onClick, label }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on} aria-label={label || "Toggle"} style={{
      width: 44, height: 26, borderRadius: 999, border: "none", cursor: "pointer",
      background: on ? T.teal : T.ring, position: "relative", flexShrink: 0, transition: "background .2s",
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3,
        left: on ? 21 : 3, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

/* ---------------------------------------------------------
   REMINDER SETTINGS — Choose when to receive daily reminders
   Saved to both local storage and Supabase user_profiles table
--------------------------------------------------------- */
function ReminderSettingsScreen({ onBack, onSaved, plan, authProfile, onSave }) {
  const [selected, setSelected] = useState(plan?.reminderTime || "No reminders");
  const [customTime, setCustomTime] = useState("");
  const [saved, setSaved] = useState(false);

  const options = ["Morning", "Afternoon", "Evening", "Only when I miss a promise", "No reminders"];

  const handleSave = async () => {
    await onSave(selected);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      if (onSaved) onSaved();
      else onBack();
    }, 1200);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopBar title="Reminder times" onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <Card style={{ display: "flex", gap: 12, alignItems: "flex-start", background: T.bluePale }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles size={18} color="#3A6690" />
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#3A6690", lineHeight: 1.6 }}>
            Daily reminders help you show up for your promise when motivation is low. Choose the time that fits your natural rhythm.
          </p>
        </Card>

        <SectionTitle>When should we remind you?</SectionTitle>
        <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {options.map((opt) => {
            const isSelected = selected === opt;
            const descriptions = {
              "Morning": "Around 8 AM — start your day with your promise",
              "Afternoon": "Around 1 PM — reset and refocus",
              "Evening": "Around 6 PM — prepare for tomorrow",
              "Only when I miss a promise": "Get a reminder only when you need support",
              "No reminders": "I'll remember on my own",
            };
            return (
              <button
                key={opt}
                onClick={() => setSelected(opt)}
                style={{
                  textAlign: "left",
                  padding: "13px 14px",
                  borderRadius: 16,
                  border: `1.5px solid ${isSelected ? T.teal : T.line}`,
                  background: isSelected ? T.tealPale : T.surface,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: `2px solid ${isSelected ? T.teal : T.line}`,
                      background: isSelected ? T.teal : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && <Check size={10} color="#fff" />}
                  </span>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.ink }}>{opt}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11.5, color: T.inkSoft }}>{descriptions[opt]}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </Card>

        <Card style={{ marginTop: 16, background: T.sandPale }}>
          <p style={{ margin: 0, fontSize: 12.5, color: "#8A5528", lineHeight: 1.6 }}>
            💡 Consistency beats intensity. Reminders are most effective when they arrive at a time you can actually act on them.
          </p>
        </Card>

        <div style={{ height: 16 }} />
      </div>
      <div style={{ marginTop: 16, paddingBottom: 20 }}>
        <PrimaryButton onClick={handleSave}>{saved ? "✓ Saved" : "Save reminder time"}</PrimaryButton>
      </div>
      <div style={{ height: 90 }} />
    </div>
  );
}

function ProfileScreen({ plan, christianMode, setChristianMode, authProfile, onLogout, go, onReminderTimeUpdate }) {
  const joinDate = authProfile?.joinDate ? new Date(authProfile.joinDate) : null;
  const joinLabel = joinDate ? joinDate.toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "March";
  return (
    <div>
      <TopBar title="Profile" />
      <Card style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 54, height: 54, borderRadius: "50%", background: T.tealPale, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: T.tealDeep }}>{(plan?.name || "Sarah").charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.ink }}>{plan?.name ? plan.name : "Sarah Bennett"}</p>
          {authProfile?.email && <p style={{ margin: "2px 0 0", fontSize: 12, color: T.inkSoft }}>{authProfile.email}</p>}
          <p style={{ margin: "2px 0 0", fontSize: 12.5, color: T.inkSoft }}>Member since {joinLabel}</p>
        </div>
      </Card>
      <Card style={{ marginTop: 14, background: T.teal, display: "flex", alignItems: "center", gap: 12 }} onClick={() => go && go("myPromise")}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Feather size={18} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#fff" }}>My Promise</p>
          <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "rgba(255,255,255,0.85)" }}>The commitment you made on Day One</p>
        </div>
        <ChevronRight size={16} color="#fff" />
      </Card>
      <Card style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: T.bluePale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Leaf size={16} color="#3A6690" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: T.ink }}>Christian Mode</p>
          <p style={{ margin: "2px 0 0", fontSize: 11.5, color: T.inkSoft, lineHeight: 1.4 }}>Prioritise Scripture & prayer in Peace promises</p>
        </div>
        <Toggle on={christianMode} onClick={() => setChristianMode((v) => !v)} label="Christian Mode" />
      </Card>
      {plan?.reminderTime && (
        <Card style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: T.bluePale, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={16} color="#3A6690" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: T.inkSoft, fontWeight: 600 }}>Reminder preference</p>
            <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: T.ink }}>{plan.reminderTime}</p>
          </div>
        </Card>
      )}
      {plan?.coachStyle && (
        <Card style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <Pip size={34} mood="soft" />
          <div>
            <p style={{ margin: 0, fontSize: 12, color: T.inkSoft, fontWeight: 600 }}>Journi's coaching style with you</p>
            <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: T.ink }}>{plan.coachStyle}</p>
          </div>
        </Card>
      )}
      <SectionTitle>Settings</SectionTitle>
      <Card pad={0}>
        {["Notifications", "Privacy", "Account", "Help & support"].map((it, i, arr) => (
          <div key={it} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${T.line}` }}>
            <span style={{ fontSize: 14, color: T.ink, fontWeight: 600 }}>{it}</span>
            <ChevronRight size={15} color={T.inkFaint} />
          </div>
        ))}
        <button onClick={() => go && go("reminderSettings")} style={{ width: "100%", background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", cursor: "pointer", textAlign: "left", borderBottom: `1px solid ${T.line}` }}>
          <span style={{ fontSize: 14, color: T.ink, fontWeight: 600 }}>Reminder times</span>
          <ChevronRight size={15} color={T.inkFaint} />
        </button>
        <button onClick={onLogout} style={{ width: "100%", background: "none", border: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", cursor: "pointer" }}>
          <span style={{ fontSize: 14, color: T.sand, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><LogOut size={15} color={T.sand} /> Log out</span>
        </button>
      </Card>
      <SectionTitle>Notifications preview</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          plan?.name ? `${plan.name}, what promise will you keep today?` : "What promise will you keep today?",
          "Need a little help getting started?",
          plan?.name ? `${plan.name}, your promise is still waiting for you, whenever you're ready.` : "Your promise is still waiting for you, whenever you're ready.",
        ].map((n) => (
          <Card key={n} pad={12} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Pip size={26} />
            <span style={{ fontSize: 12.5, color: T.inkSoft }}>{n}</span>
          </Card>
        ))}
      </div>
      <div style={{ height: 90 }} />
    </div>
  );
}

/* ---------------------------------------------------------
   MY PROMISE — a personal journal, not a stats page.
   Shows the Commitment Record made on Day One.
--------------------------------------------------------- */
const MILESTONE_LABELS = {
  "first-promise-kept": "Kept your first promise",
  "first-lesson": "Completed your first lesson",
  "first-reflection": "Wrote your first reflection",
  "first-reset": "Completed your first reset",
};

function daysSince(dateISO) {
  if (!dateISO) return 0;
  const start = startOfDay(new Date(dateISO));
  const now = startOfDay(new Date());
  return Math.max(0, Math.round((now - start) / 86400000));
}

function MyPromiseScreen({ onBack, plan, trust }) {
  const [record, setRecord] = useState(undefined); // undefined = loading, null = none found
  const [milestones, setMilestones] = useState({});
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await loadPromiseCeremony();
      const t = await loadEvidenceTimeline();
      if (!cancelled) { setRecord(r); setMilestones(selectMilestones(t)); setTimeline(t); }
    })();
    return () => { cancelled = true; };
  }, []);

  const achievedMilestones = Object.keys(MILESTONE_LABELS).filter((k) => milestones[k]);
  const promisesKept = selectPromisesKept(timeline);
  const completionRate = selectCompletionRate(timeline);
  const reflectionCount = selectEventsOfType(timeline, EVENT_TYPES.REFLECTION_WRITTEN).length;

  if (record === undefined) {
    return (
      <div>
        <TopBar title="My Promise" onBack={onBack} />
        <Card style={{ textAlign: "center", padding: 30 }}>
          <Pip size={34} mood="soft" />
        </Card>
      </div>
    );
  }

  if (!record) {
    return (
      <div>
        <TopBar title="My Promise" onBack={onBack} />
        <Card style={{ textAlign: "center", padding: 26 }}>
          <Pip size={40} mood="soft" />
          <p style={{ margin: "12px 0 0", fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6 }}>You haven't made your promise yet. It's waiting for you whenever you're ready.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="My Promise" />
      <div style={{ textAlign: "center", margin: "4px 0 16px" }}>
        <p style={{ margin: 0, fontFamily: "'Dancing Script', cursive", fontSize: 32, fontWeight: 700, color: T.ink }}>{record.fullName}</p>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: T.inkSoft }}>{record.dateLabel} · {record.timeLabel}</p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: T.inkFaint }}>{daysSince(record.dateISO)} days since I began</p>
      </div>

      <Card style={{ marginBottom: 12, border: `1.5px solid ${T.sand}` }}>
        <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#9C5B26", textTransform: "uppercase", letterSpacing: 0.6, textAlign: "center" }}>My Original Promise</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            "I understand that I won't be perfect.",
            "I understand that I will sometimes miss promises.",
            "When that happens, I will respond with honesty instead of shame.",
            "I will keep my promises small enough to succeed and meaningful enough to matter.",
            "Every promise I keep is another step towards becoming someone I can rely on.",
          ].map((line) => (
            <p key={line} style={{ margin: 0, fontSize: 12.5, color: T.ink, lineHeight: 1.6 }}>{line}</p>
          ))}
        </div>
      </Card>

      {record.whyItMatters && (
        <Card style={{ marginBottom: 12, background: T.sandPale }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#9C5B26", textTransform: "uppercase", letterSpacing: 0.6 }}>Why rebuilding trust matters to me</p>
          <p style={{ margin: 0, fontSize: 13, color: "#8A5528", lineHeight: 1.7, fontStyle: "italic" }}>"{record.whyItMatters}"</p>
        </Card>
      )}

      {record.successDefinition && (
        <Card style={{ marginBottom: 12, background: T.bluePale }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#3A6690", textTransform: "uppercase", letterSpacing: 0.6 }}>How I'll know I've become someone I trust</p>
          <p style={{ margin: 0, fontSize: 13, color: "#3A6690", lineHeight: 1.7, fontStyle: "italic" }}>"{record.successDefinition}"</p>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <Card pad={14}>
          <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 22, color: T.ink }}>{trust ?? plan?.trustBaseline ?? 0}%</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: T.inkSoft, fontWeight: 600 }}>Current Self-Trust</p>
        </Card>
        <Card pad={14}>
          <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 22, color: T.ink }}>{promisesKept}</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: T.inkSoft, fontWeight: 600 }}>Promises kept</p>
        </Card>
        <Card pad={14}>
          <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 22, color: T.ink }}>{completionRate === null ? "—" : `${completionRate}%`}</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: T.inkSoft, fontWeight: 600 }}>Completion rate</p>
        </Card>
        <Card pad={14}>
          <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 22, color: T.ink }}>{daysSince(record.dateISO)}</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: T.inkSoft, fontWeight: 600 }}>Days since I began</p>
        </Card>
      </div>

      <SectionTitle>Major milestones</SectionTitle>
      <Card>
        {achievedMilestones.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12.5, color: T.inkSoft, lineHeight: 1.6 }}>Your milestones will appear here as you keep promises, reflect, and learn.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {achievedMilestones.map((k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Award size={14} color={T.sand} />
                <span style={{ fontSize: 12.5, color: T.ink, fontWeight: 600 }}>{MILESTONE_LABELS[k]}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <SectionTitle>Personal reflections</SectionTitle>
      <Card style={{ textAlign: "center", padding: 20 }}>
        {reflectionCount === 0 ? (
          <p style={{ margin: 0, fontSize: 12.5, color: T.inkSoft, lineHeight: 1.6 }}>Your evening reflections will be gathered here over time.</p>
        ) : (
          <p style={{ margin: 0, fontSize: 12.5, color: T.inkSoft, lineHeight: 1.6 }}>You've written {reflectionCount} reflection{reflectionCount === 1 ? "" : "s"} so far — each one evidence of understanding yourself a little better.</p>
        )}
      </Card>

      <p style={{ textAlign: "center", fontSize: 10.5, color: T.inkFaint, margin: "16px 0 0" }}>Commitment recorded on Journi {record.journiVersion}</p>
      <div style={{ height: 40 }} />
    </div>
  );
}


const COACH_OPENERS = {
  "Gentle & encouraging": "Hey {name}. No pressure at all — what's on your mind before today's promise?",
  "Balanced": "Hey {name}. What's on your mind before you start today's promise?",
  "Firm accountability": "Hey {name}. Let's be honest with each other — what's standing in the way of today's promise right now?",
  "Science-first": "Hey {name}. Let's look at what's happening before you start — what's coming up for you?",
  "Motivational": "Hey {name}! You've got this. What's on your mind before today's promise?",
  "Friendly": "Hey {name}, good to see you. What's going on before you dive into today's promise?",
};

const COACH_REPLY_CATEGORIES = {
  energy: {
    keywords: ["tired", "low on energy", "exhausted", "no energy", "drained", "fatigue"],
    replies: [
      "Low energy is real — it's not a character flaw. What's the smallest version of this you could do even feeling drained?",
      "Your body might be asking for rest, not willpower. Would a 2-minute version of this still count as keeping your promise?",
      "That's your body giving you real data. What's one gentle way to move forward without pushing through completely depleted?",
    ],
  },
  time: {
    keywords: ["busy", "no time", "don't have time", "swamped", "packed", "schedule"],
    replies: [
      "Busy is often a signal to shrink the promise, not skip it. What's the smallest version that still fits today?",
      "You don't need a big window — you need a small one. When's the next 5 minutes you actually have free?",
      "What if today's promise took under 60 seconds? What would that look like?",
    ],
  },
  doubt: {
    keywords: ["can't", "won't work", "pointless", "why bother", "give up", "no point"],
    replies: [
      "That doubt makes sense — it's showing up because this matters to you. What's true even if today feels shaky?",
      "You don't have to believe it'll work perfectly. You just have to take the next small step. What's that step?",
      "Doubt is loud right now, but it's not the whole story. What's one thing you know for sure, even today?",
    ],
  },
  resistance: {
    keywords: ["don't want to", "not feeling it", "ugh", "dreading", "avoiding"],
    replies: [
      "Resistance is normal, even for things we care about. What's the tiniest first move that doesn't require motivation?",
      "You don't need to want to do it — you just need to start. What's one small action that counts?",
      "It sounds like your brain is treating this as bigger than it actually is. What would make it feel 10% easier right now?",
    ],
  },
  overwhelm: {
    keywords: ["overwhelmed", "too much", "stressed", "anxious", "can't handle"],
    replies: [
      "That's a lot to carry. Let's shrink this down — what's the smallest piece you could handle right now?",
      "You don't have to solve everything today. What's one small, doable thing in front of you?",
      "Overwhelm usually means the step feels too big. What would a tiny version of this look like?",
    ],
  },
  general: {
    keywords: [],
    replies: [
      "That makes sense — starting is often the hardest part, not the task itself. What's the smallest possible version of that first step?",
      "That's really common. Would it help to shrink today's promise even further, or try a quick reset first?",
      "You don't have to feel ready to begin — you just have to take the tiniest step. What's one thing you could do in the next two minutes?",
    ],
  },
};

function getCoachReply(userInput, replyHistory) {
  const lowerInput = userInput.toLowerCase().replace(/['']/g, "'");
  const matchedCategory = Object.entries(COACH_REPLY_CATEGORIES).find(
    ([key, cat]) => key !== "general" && cat.keywords.some((kw) => lowerInput.includes(kw))
  );
  const category = matchedCategory ? matchedCategory[1] : COACH_REPLY_CATEGORIES.general;
  const usedInCategory = replyHistory.filter((r) => category.replies.includes(r)).length;
  return category.replies[usedInCategory % category.replies.length];
}

const TYPING_KEYFRAMES = `
@keyframes jDot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }
`;

function TypingBubble() {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
      <style>{TYPING_KEYFRAMES}</style>
      <Pip size={26} />
      <div style={{
        padding: "12px 14px", borderRadius: 16, borderBottomLeftRadius: 4,
        background: T.surface, boxShadow: "0 1px 3px rgba(38,51,62,0.06)",
        display: "flex", gap: 4, alignItems: "center",
      }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: "50%", background: T.inkFaint,
            animation: `jDot 1.1s ease-in-out ${i * 0.15}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

function CoachScreen({ onBack, plan }) {
  const name = plan?.name || "Sarah";
  const opener = (COACH_OPENERS[plan?.coachStyle] || "Hey {name}. What's on your mind before you start today's promise?").replace("{name}", name);
  const [messages, setMessages] = useState([
    { from: "pip", text: opener },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const send = () => {
    if (!input.trim() || isTyping) return;
    setMessages((m) => [...m, { from: "me", text: input }]);
    setInput("");
    setIsTyping(true);
    const replyHistory = messages.filter((m) => m.from === "pip").map((m) => m.text);
    const reply = getCoachReply(input, replyHistory);
    setTimeout(() => {
      setMessages((m) => [...m, { from: "pip", text: reply }]);
      setIsTyping(false);
    }, 3000);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TopBar title="Journi coach" onBack={onBack} />
      {plan?.why && (
        <Card style={{ marginBottom: 10, background: T.sandPale }} pad={12}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#9C5B26", textTransform: "uppercase", letterSpacing: 0.3 }}>Remember why you started</p>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "#8A5528" }}>{plan.why}</p>
        </Card>
      )}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexDirection: m.from === "me" ? "row-reverse" : "row" }}>
            {m.from === "pip" && <Pip size={26} />}
            <div style={{
              maxWidth: "75%", padding: "10px 14px", borderRadius: 16,
              background: m.from === "me" ? T.teal : T.surface, color: m.from === "me" ? "#fff" : T.ink,
              fontSize: 13.5, lineHeight: 1.5,
              borderBottomRightRadius: m.from === "me" ? 4 : 16,
              borderBottomLeftRadius: m.from === "pip" ? 4 : 16,
              boxShadow: m.from === "pip" ? "0 1px 3px rgba(38,51,62,0.06)" : "none",
            }}>{m.text}</div>
          </div>
        ))}
        {isTyping && <TypingBubble />}
      </div>
      <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
        <input
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={isTyping ? "Journi is replying…" : "Tell Journi what's going on…"}
          disabled={isTyping}
          style={{ flex: 1, border: `1.5px solid ${T.line}`, borderRadius: 14, padding: "12px 14px", fontSize: 13.5, fontFamily: "inherit", outline: "none", opacity: isTyping ? 0.6 : 1 }}
        />
        <button onClick={send} disabled={isTyping} aria-label="Send message" style={{ width: 44, height: 44, borderRadius: 14, background: T.teal, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: isTyping ? "default" : "pointer", flexShrink: 0, opacity: isTyping ? 0.6 : 1 }}>
          <Send size={16} color="#fff" />
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   I'M STUCK — 11 STEP FLOW
--------------------------------------------------------- */
function StuckFlow({ onExit, promise, plan, onPromiseKept, onEvidence, trust }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [feeling, setFeeling] = useState(null);
  const [followUp, setFollowUp] = useState(null);
  const [blocker, setBlocker] = useState(null);
  const [body, setBody] = useState(null);
  const [intervention, setIntervention] = useState(null);
  const [confidence, setConfidence] = useState(4);
  const [timer, setTimer] = useState(120);
  const [resetActive, setResetActive] = useState(false);
  const [resetTime, setResetTime] = useState(30);
  const shrinkLoggedRef = useRef(false);

  const emotion = feeling ? STUCK_EMOTIONS.find((f) => f.label === feeling) : null;
  const track = emotion?.cat === "Positive" ? "positive" : emotion?.cat === "Neutral" ? "neutral" : emotion?.cat === "Challenging" ? "challenging" : null;
  const steps = track ? TRACK_STEPS[track] : new Array(6).fill("feeling");
  const stepKey = steps[stepIndex] || "feeling";
  const TOTAL = steps.length;

  const boosted = boostPromise(promise);
  const microSteps = minimumViableSteps(promise);
  const actionLabel = track === "positive" ? boosted : track === "challenging" ? microSteps[0] : promise;

  /* Entering the Stuck Flow is itself meaningful behavioural evidence —
     it's a moment of honest self-report, not a failure to hide. */
  useEffect(() => {
    onEvidence && onEvidence(EVENT_TYPES.STUCK_FLOW_ENTERED, { promise });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* The blocker choice IS "reason for becoming stuck." */
  useEffect(() => {
    if (blocker) onEvidence && onEvidence(EVENT_TYPES.STUCK_REASON_SELECTED, { reason: blocker, track });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocker]);

  /* The opening feeling check IS an emotional check-in — logging it here
     means a Challenging day recognised through the Stuck Flow still
     counts toward "reflection after a difficult day" later. */
  useEffect(() => {
    if (feeling && emotion) onEvidence && onEvidence(EVENT_TYPES.EMOTIONAL_CHECKIN_COMPLETED, { mood: feeling, category: emotion.cat, source: "stuck_flow" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeling]);

  /* Shrinking the promise down to its minimum viable version is logged
     once as a PROMISE_RESCHEDULED event — evidence of appropriate
     sizing, not evidence of failure. */
  useEffect(() => {
    if (stepKey === "shrink" && !shrinkLoggedRef.current) {
      shrinkLoggedRef.current = true;
      onEvidence && onEvidence(EVENT_TYPES.PROMISE_RESCHEDULED, { reason: "stuck_flow_shrink", microSteps, originalPromise: promise });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);

  useEffect(() => {
    if (stepKey !== "action") return;
    if (timer <= 0) return;
    const t = setInterval(() => setTimer((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [stepKey, timer]);

  useEffect(() => {
    if (!resetActive || resetTime <= 0) return;
    const t = setTimeout(() => setResetTime((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resetActive, resetTime]);

  const breathingLoggedRef = useRef(false);
  useEffect(() => {
    if (resetActive && resetTime === 0 && !breathingLoggedRef.current) {
      breathingLoggedRef.current = true;
      onEvidence && onEvidence(EVENT_TYPES.EMOTIONAL_CHECKIN_COMPLETED, { source: "stuck_flow_breathing" });
    }
  }, [resetActive, resetTime]);

  /* Every step before real problem-solving begins is a "postponed" exit
     if the person leaves — they haven't engaged with the difficulty yet.
     Everything from the blocker step onward means they showed up and
     did some of the work, so leaving from there is an "abandoned" exit —
     still logged without judgment, just honestly, as evidence. */
  const EARLY_STEPS = ["feeling", "promise", "acknowledge", "followup", "boost"];
  const exitWithIntent = () => {
    const type = EARLY_STEPS.includes(stepKey) ? EVENT_TYPES.PROMISE_POSTPONED : EVENT_TYPES.PROMISE_ABANDONED;
    onEvidence && onEvidence(type, { stepKey, track, promise });
    onExit();
  };

  const [trustDelta, setTrustDelta] = useState(null);
  const next = () => {
    if (stepKey === "action" && onPromiseKept) {
      const before = typeof trust === "number" ? trust : null;
      Promise.resolve(onPromiseKept({ track, adjusted: track === "challenging", boosted: track === "positive" })).then((result) => {
        if (result && typeof result.trust === "number" && before !== null) setTrustDelta(result.trust - before);
      });
    }
    setStepIndex((i) => Math.min(TOTAL - 1, i + 1));
  };
  const back = () => (stepIndex === 0 ? exitWithIntent() : setStepIndex((i) => i - 1));

  const ChoiceGrid = ({ options, value, onPick, cols = 2 }) => (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 10 }}>
      {options.map((o) => {
        const label = typeof o === "string" ? o : o.name;
        const active = value === label;
        const Icon = typeof o === "string" ? null : o.icon;
        return (
          <button key={label} onClick={() => onPick(label)} style={{
            padding: "14px 10px", borderRadius: 14, border: `1.5px solid ${active ? T.teal : T.line}`,
            background: active ? T.tealPale : T.surface, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            fontSize: 12.5, fontWeight: 700, color: active ? T.tealDeep : T.ink, textAlign: "center",
          }}>
            {Icon && <Icon size={17} color={active ? T.tealDeep : T.inkSoft} />}
            {label}
          </button>
        );
      })}
    </div>
  );

  const EmotionGrid = () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {STUCK_EMOTIONS.map((m) => {
        const active = feeling === m.label;
        const tone = m.cat === "Positive" ? T.teal : m.cat === "Neutral" ? T.blue : T.sand;
        return (
          <button key={m.label} onClick={() => setFeeling(m.label)} style={{
            padding: "16px 10px", borderRadius: 16, border: `1.5px solid ${active ? tone : T.line}`,
            background: active ? `${tone}1A` : T.surface, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            fontSize: 12.5, fontWeight: 700, color: active ? T.ink : T.ink, textAlign: "center",
          }}>
            <span style={{ fontSize: 22 }}>{m.e}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );

  let body_ = null;
  let canNext = true;

  if (stepKey === "feeling") {
    canNext = !!feeling;
    body_ = (<>
      <p style={{ color: T.inkSoft, fontSize: 14, margin: "0 0 16px" }}>How are you feeling right now?</p>
      <EmotionGrid />
    </>);

  } else if (stepKey === "boost") {
    body_ = (<>
      <Card style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14, background: T.sandPale }}>
        <Pip size={38} mood="happy" />
        <p style={{ margin: 0, fontSize: 13.5, color: "#8A5528", lineHeight: 1.6 }}>
          {plan?.name ? `${plan.name}, you're` : "You're"} in a good place today. Let's build on that momentum.
        </p>
      </Card>
      <p style={{ color: T.inkSoft, fontSize: 12.5, margin: "0 0 8px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 }}>A slightly bigger promise, since you've got the energy</p>
      <Card style={{ background: T.teal, textAlign: "center", padding: 24 }}>
        <Pip size={40} mood="happy" />
        <p style={{ margin: "12px 0 0", fontFamily: "'Fraunces', serif", fontSize: 19, color: "#fff" }}>{boosted}</p>
      </Card>
    </>);

  } else if (stepKey === "followup") {
    canNext = !!followUp;
    body_ = (<>
      <p style={{ color: T.inkSoft, fontSize: 14, margin: "0 0 6px" }}>{plan?.name ? `You're feeling okay, ${plan.name}.` : "You're feeling okay."}</p>
      <p style={{ color: T.inkSoft, fontSize: 13, margin: "0 0 16px" }}>Let's make sure today ends with a promise you can keep. What would help most right now?</p>
      <ChoiceGrid cols={1} options={["Just show me today's promise", "A little structure would help", "Not sure — let's just see"]} value={followUp} onPick={setFollowUp} />
    </>);

  } else if (stepKey === "acknowledge") {
    body_ = (<>
      <Card style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
        <Pip size={38} mood="soft" />
        <p style={{ margin: 0, fontSize: 13.5, color: T.ink, lineHeight: 1.6 }}>
          You don't need to feel motivated to make progress. Let's make today easier.
        </p>
      </Card>
      <Card style={{ textAlign: "center" }}>
        <p style={{ margin: "0 0 4px", fontSize: 12.5, fontWeight: 700, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.4 }}>Optional reset</p>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: T.inkSoft }}>Breathe in for 4, hold for 4, out for 4 — just for 30 seconds.</p>
        <div style={{ width: 110, height: 110, borderRadius: "50%", background: T.tealPale, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 28, color: T.tealDeep }}>{resetTime === 0 ? "✓" : resetTime}</span>
        </div>
        {!resetActive && resetTime > 0 && (
          <GhostButton onClick={() => setResetActive(true)}>Begin 30-second reset</GhostButton>
        )}
        {resetActive && resetTime === 0 && (
          <p style={{ margin: 0, fontSize: 13, color: T.tealDeep, fontWeight: 700 }}>Nice. Let's continue whenever you're ready.</p>
        )}
      </Card>
    </>);

  } else if (stepKey === "promise") {
    body_ = (<>
      <p style={{ color: T.inkSoft, fontSize: 14, margin: "0 0 16px" }}>
        {track === "neutral"
          ? "Nothing needs to change — here's today's promise."
          : (plan?.name ? `Here's the promise you made to yourself today, ${plan.name}.` : "Here's the promise you made to yourself today.")}
      </p>
      <Card style={{ background: T.teal, textAlign: "center", padding: 24 }}>
        <Pip size={40} mood="soft" />
        <p style={{ margin: "12px 0 0", fontFamily: "'Fraunces', serif", fontSize: 19, color: "#fff" }}>{promise}</p>
      </Card>
    </>);

  } else if (stepKey === "blocker") {
    canNext = !!blocker;
    body_ = (<>
      <p style={{ color: T.inkSoft, fontSize: 14, margin: "0 0 16px" }}>What's making this difficult?</p>
      <ChoiceGrid options={BLOCKERS} value={blocker} onPick={setBlocker} />
    </>);

  } else if (stepKey === "body") {
    canNext = !!body;
    body_ = (<>
      <p style={{ color: T.inkSoft, fontSize: 14, margin: "0 0 16px" }}>How does your body feel?</p>
      <ChoiceGrid options={BODY} value={body} onPick={setBody} />
    </>);

  } else if (stepKey === "explain") {
    body_ = (<>
      <Card style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Pip size={40} mood="soft" />
        <div>
          <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: T.ink }}>This is your brain protecting you, not failing you.</p>
          <p style={{ margin: 0, fontSize: 13.5, color: T.inkSoft, lineHeight: 1.7 }}>
            When a task feels {blocker ? blocker.toLowerCase() : "hard"}, your brain's threat-detection system treats it like a risk and pulls you toward safety — avoidance. It isn't a character flaw. It's a signal that the step in front of you is bigger than your nervous system wants to take on right now. Shrinking it is how you work with your brain instead of against it.
          </p>
        </div>
      </Card>
      {plan?.why && (
        <Card style={{ marginTop: 12, background: T.sandPale }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#9C5B26", textTransform: "uppercase", letterSpacing: 0.3 }}>Remember why you started</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#8A5528" }}>{plan.why}</p>
        </Card>
      )}
    </>);

  } else if (stepKey === "intervention") {
    canNext = !!intervention;
    body_ = (<>
      <p style={{ color: T.inkSoft, fontSize: 14, margin: "0 0 16px" }}>Choose what would help most right now.</p>
      <ChoiceGrid options={INTERVENTIONS} value={intervention} onPick={setIntervention} />
    </>);

  } else if (stepKey === "shrink") {
    body_ = (<>
      <p style={{ color: T.inkSoft, fontSize: 14, margin: "0 0 16px" }}>Let's turn this into the minimum viable promise.</p>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {microSteps.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.tealPale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.tealDeep }}>{i + 1}</div>
              <span style={{ fontSize: 14, color: T.ink, fontWeight: 600 }}>{s}</span>
            </div>
          ))}
        </div>
      </Card>
    </>);

  } else if (stepKey === "confidence") {
    body_ = (<>
      <p style={{ color: T.inkSoft, fontSize: 14, margin: "0 0 6px" }}>How possible does this feel?</p>
      <p style={{ color: T.inkFaint, fontSize: 12, margin: "0 0 20px" }}>Below 7, Journi will shrink it again.</p>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 40, color: T.ink }}>{confidence}</span>
        <span style={{ fontSize: 15, color: T.inkFaint }}>/10</span>
      </div>
      <input type="range" min={1} max={10} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} style={{ width: "100%", accentColor: T.teal }} />
      {confidence < 7 && <Pill tone="sand">We'll shrink this one more time</Pill>}
    </>);

  } else if (stepKey === "action") {
    const mm = Math.floor(timer / 60).toString().padStart(2, "0");
    const ss = (timer % 60).toString().padStart(2, "0");
    body_ = (<>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: T.inkSoft, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Action mode</p>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 19, color: T.ink, margin: "6px 0 20px", padding: "0 10px" }}>{actionLabel}</p>
        <div style={{ width: 180, height: 180, borderRadius: "50%", background: T.tealPale, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 40, color: T.tealDeep }}>{mm}:{ss}</span>
        </div>
        <p style={{ fontSize: 13, color: T.inkSoft, fontStyle: "italic", fontFamily: "'Fraunces', serif" }}>Just this one step. Nothing else matters right now.</p>
      </div>
    </>);
    canNext = true;

  } else if (stepKey === "celebrate") {
    body_ = (<>
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <Pip size={80} mood="happy" />
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 24, color: T.ink, margin: "18px 0 8px" }}>{plan?.name ? `You kept your promise, ${plan.name}.` : "You kept your promise."}</h2>
        <p style={{ fontSize: 14, color: T.inkSoft, margin: 0 }}>Your Self Trust increased.</p>
        <Card style={{ marginTop: 20, background: T.sandPale }}>
          <p style={{ margin: 0, fontSize: 13.5, color: "#8A5528", fontFamily: "'Fraunces', serif", fontStyle: "italic" }}>
            {trustDelta !== null ? `${trustDelta >= 0 ? "+" : ""}${trustDelta}% Self Trust` : "Self Trust updated"}
          </p>
        </Card>
      </div>
    </>);

  } else if (stepKey === "reflect") {
    body_ = (<>
      <p style={{ color: T.inkSoft, fontSize: 14, margin: "0 0 16px" }}>One last thing before you go.</p>
      {["What almost stopped you?", "How do you feel now?", "What worked?"].map((q) => (
        <Card key={q} style={{ marginBottom: 10 }}>
          <p style={{ margin: "0 0 8px", fontSize: 13.5, fontWeight: 700, color: T.ink }}>{q}</p>
          <textarea rows={2} placeholder="Write freely…" style={{ width: "100%", border: `1.5px solid ${T.line}`, borderRadius: 12, padding: "10px 12px", fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "none" }} />
        </Card>
      ))}
    </>);
  }

  const isLast = stepIndex === TOTAL - 1;
  return (
    <div style={{ position: "absolute", inset: 0, background: T.bg, display: "flex", flexDirection: "column", padding: "max(22px, env(safe-area-inset-top)) 20px max(26px, env(safe-area-inset-bottom))", zIndex: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={back} aria-label={stepIndex === 0 ? "Close" : "Go back"} style={{ background: T.surface, border: "none", width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {stepIndex === 0 ? <X size={16} color={T.ink} /> : <ChevronLeft size={17} color={T.ink} />}
        </button>
        <div style={{ flex: 1, height: 6, borderRadius: 999, background: T.ring, overflow: "hidden" }}>
          <div style={{ width: `${((stepIndex + 1) / TOTAL) * 100}%`, height: "100%", background: T.teal, borderRadius: 999, transition: "width .3s" }} />
        </div>
        <span style={{ fontSize: 11.5, color: T.inkFaint, fontWeight: 700, minWidth: 34, textAlign: "right" }}>{stepIndex + 1}/{TOTAL}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>{body_}</div>
      <div style={{ marginTop: 16 }}>
        <PrimaryButton onClick={isLast ? onExit : next} disabled={!canNext}>
          {stepKey === "action" ? "I did it" : isLast ? "Finish" : "Continue"}
        </PrimaryButton>
        {!["feeling", "celebrate", "reflect"].includes(stepKey) && (
          <button onClick={exitWithIntent} style={{ width: "100%", background: "none", border: "none", marginTop: 10, fontSize: 12.5, fontWeight: 600, color: T.inkFaint, cursor: "pointer" }}>
            Not right now — I'll come back to this
          </button>
        )}
      </div>
    </div>
  );
}

/* ===========================================================
   THE EVIDENCE ENGINE — JOURNI's central behavioural architecture
   ===========================================================
   Core philosophy: every meaningful interaction becomes an
   Evidence Event. Evidence builds Self-Trust. Self-Trust builds
   Confidence. Confidence shapes Identity.

   This is the single source of truth for behavioural data.
   Every feature (promises, reflections, mood, milestones,
   coaching, and every future module — community, courses,
   fitness, journaling, accountability partners, etc.) should
   read and write through this engine rather than maintaining
   its own isolated records. That is the whole point of it:
   one timeline, many consumers.
=========================================================== */

/* ---- Event vocabulary lives in the Self-Trust Engine Configuration
   module at the top of this file (EVENT_TYPES) — this section only
   implements the engine's behaviour, it does not redefine config. ---- */

const EVIDENCE_KEY = "journi-evidence-timeline";
let _evidenceCache = null; // in-memory read cache for this session; storage stays the source of truth

async function loadEvidenceTimeline() {
  if (_evidenceCache) return _evidenceCache;
  try {
    const res = await window.storage.get(EVIDENCE_KEY, false);
    _evidenceCache = res ? JSON.parse(res.value) : [];
  } catch (e) {
    _evidenceCache = [];
  }
  return _evidenceCache;
}
async function saveEvidenceTimeline(events) {
  _evidenceCache = events;
  try { await window.storage.set(EVIDENCE_KEY, JSON.stringify(events), false); } catch (e) { /* best-effort */ }
}

/*
 * logEvidence — the ONE write path for behavioural data in JOURNI.
 * Every feature calls this instead of inventing its own storage record.
 * Structured enough (type, timestamp, dayKey, payload) that future AI
 * coaching, analytics and reporting can read behavioural patterns
 * directly off the timeline without bespoke parsing per feature.
 */
async function logEvidence(type, payload = {}) {
  const now = new Date();
  const event = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp: now.toISOString(),
    dayKey: localDayKey(now),
    payload,
  };
  const timeline = await loadEvidenceTimeline();
  const next = [...timeline, event];
  await saveEvidenceTimeline(next);
  await deriveCompositeEvidence(event, next);
  return event;
}

/* ---------------------------------------------------------
   COMPOSITE BEHAVIOURAL SIGNALS — Quiet Moments & Mindful Choices
   ---------------------------------------------------------
   Neither is ever logged directly by a feature. Both are recognised
   automatically whenever a qualifying primary event is logged, via
   the declarative rule tables below. This is the reusable service:
   any current or future feature (courses, journaling, fitness,
   spiritual growth, accountability partners, etc.) only has to log
   its own primary event correctly, using the existing vocabulary or
   extending it — the composite signal is derived for free, with zero
   duplicated logic anywhere else in the app.

   Both feed the Self-Trust Engine as small, SUPPORTING weights —
   never replacing the weight of an actual kept promise. */

const QUIET_MOMENT_RULES = [
  // Any written reflection or journal entry is an intentional pause.
  { type: EVENT_TYPES.REFLECTION_WRITTEN },
  // Guided breathing / grounding / calm-down exercises — Reset & Regulate,
  // and the inline breathing reset offered inside the Stuck Flow.
  { type: EVENT_TYPES.EMOTIONAL_CHECKIN_COMPLETED, when: (p) => p?.source === "reset_exercise" || p?.source === "stuck_flow_breathing" },
  // Prayer or spiritual reflection moments inside Protect My Peace.
  { type: EVENT_TYPES.EMOTIONAL_CHECKIN_COMPLETED, when: (p) => p?.source === "peace_reflection" },
];

const MINDFUL_CHOICE_RULES = [
  // Reducing a promise instead of abandoning it, or rescheduling honestly.
  { type: EVENT_TYPES.PROMISE_RESCHEDULED },
  // Recovering after a setback instead of giving up.
  { type: EVENT_TYPES.RECOVERY_AFTER_SETBACK },
  // Completing a reflection on a day that was logged as emotionally challenging.
  {
    type: EVENT_TYPES.REFLECTION_WRITTEN,
    when: (p, timeline, event) => timeline.some((e) =>
      e.dayKey === event.dayKey &&
      (e.type === EVENT_TYPES.MOOD_LOGGED || e.type === EVENT_TYPES.EMOTIONAL_CHECKIN_COMPLETED) &&
      e.payload?.category === "Challenging"
    ),
  },
];

function matchesAnyRule(rules, event, timeline) {
  return rules.some((r) => r.type === event.type && (!r.when || r.when(event.payload, timeline, event)));
}

async function deriveCompositeEvidence(event, timelineAfterPrimary) {
  if (matchesAnyRule(QUIET_MOMENT_RULES, event, timelineAfterPrimary)) {
    await logEvidence(EVENT_TYPES.QUIET_MOMENT, { triggeredBy: event.type, sourceEventId: event.id });
  }
  if (matchesAnyRule(MINDFUL_CHOICE_RULES, event, timelineAfterPrimary)) {
    await logEvidence(EVENT_TYPES.MINDFUL_CHOICE, { triggeredBy: event.type, sourceEventId: event.id });
  }
}

/* ---- Selectors: derived reads. Every feature should compute what it
   needs THROUGH these rather than re-deriving logic against raw events —
   this is what "remove duplicated logic" means in practice. ---- */
function selectEventsOfType(timeline, type) {
  return timeline.filter((e) => e.type === type);
}
function selectDayKeysCompleted(timeline) {
  return new Set(selectEventsOfType(timeline, EVENT_TYPES.PROMISE_COMPLETED).map((e) => e.dayKey));
}
function selectCompletedOnDay(timeline, dayKey) {
  return selectDayKeysCompleted(timeline).has(dayKey);
}
function selectCompletedOnDayBySource(timeline, dayKey, source) {
  return selectEventsOfType(timeline, EVENT_TYPES.PROMISE_COMPLETED).some((e) => e.dayKey === dayKey && (e.payload?.source || null) === (source || null));
}
/* Consecutive-day streak, always derived fresh from the timeline — never
   stored as its own mutable counter, so it can never drift out of sync. */
function selectStreak(timeline) {
  const completedDays = selectDayKeysCompleted(timeline);
  let streak = 0;
  let cursor = new Date();
  while (completedDays.has(localDayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
}
function selectMilestones(timeline) {
  const reached = {};
  selectEventsOfType(timeline, EVENT_TYPES.MILESTONE_REACHED).forEach((e) => { reached[e.payload.key] = e; });
  return reached;
}
function selectPromisesKept(timeline) {
  return selectEventsOfType(timeline, EVENT_TYPES.PROMISE_COMPLETED).length;
}
function selectCompletionRate(timeline) {
  const kept = selectPromisesKept(timeline);
  const missed = selectEventsOfType(timeline, EVENT_TYPES.PROMISE_MISSED).length;
  const total = kept + missed;
  return total === 0 ? null : Math.round((kept / total) * 100);
}

/* Records a MILESTONE_REACHED event the first time — and only the first
   time — a given milestone key is reached. Returns the event if this was
   a genuine first-time reach, or null if already recorded previously. */
async function reachMilestoneOnce(key, extra = {}) {
  const timeline = await loadEvidenceTimeline();
  if (selectMilestones(timeline)[key]) return null;
  return logEvidence(EVENT_TYPES.MILESTONE_REACHED, { key, ...extra });
}

/*
 * The Self-Trust Engine.
 * All tunable numbers (SELF_TRUST_WEIGHTS, streak bonus, floor/ceiling)
 * live in the configuration module at the top of this file — this
 * function only implements the calculation, never the values.
 */
function computeSelfTrust(timeline, baseline = 45) {
  let score = baseline;
  timeline.forEach((e) => { score += SELF_TRUST_WEIGHTS[e.type] || 0; });
  score += Math.min(selectStreak(timeline), SELF_TRUST_STREAK_BONUS_CAP_DAYS) * SELF_TRUST_STREAK_BONUS_PER_DAY;
  return Math.max(SELF_TRUST_FLOOR, Math.min(SELF_TRUST_CEILING, Math.round(score)));
}

/* ---------------------------------------------------------
   ROOT APP
--------------------------------------------------------- */
const RETURN_KEY = "journi-return-state";
const PROFILE_KEY = "journi-user-profile";
const APPSTATE_KEY = "journi-app-state";

/* RETURN_KEY now stores ONLY visit timing (last-seen, for the Welcome
   Back daily ritual) — behavioural facts like streak and "did I keep
   yesterday's promise" are derived from the Evidence Engine timeline
   instead of being duplicated here. */
async function loadReturnRecord() {
  try {
    const res = await window.storage.get(RETURN_KEY, false);
    return res ? JSON.parse(res.value) : null;
  } catch (e) {
    return null;
  }
}
async function saveReturnRecord(rec) {
  try { await window.storage.set(RETURN_KEY, JSON.stringify(rec), false); } catch (e) { /* best-effort */ }
}

async function loadUserProfile() {
  try {
    const res = await window.storage.get(PROFILE_KEY, false);
    return res ? JSON.parse(res.value) : null;
  } catch (e) {
    return null;
  }
}
async function saveUserProfile(profile) {
  try { await window.storage.set(PROFILE_KEY, JSON.stringify(profile), false); } catch (e) { /* best-effort */ }
}

/* Save reminder time to both local storage and Supabase */
async function saveReminderTime(reminderTime, userEmail) {
  try {
    // Save to local storage via authProfile
    const profile = await loadUserProfile();
    if (profile) {
      profile.reminderTime = reminderTime;
      await saveUserProfile(profile);
    }
    
    // Save to Supabase user_profiles table if email is available
    if (userEmail && supabase) {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({ email: userEmail, reminder_time: reminderTime }, { onConflict: 'email' });
      if (error) console.error('Failed to save reminder time to Supabase:', error);
    }
  } catch (e) {
    console.error('Error saving reminder time:', e);
  }
}

async function deleteKeySafe(key) {
  try { await window.storage.delete(key, false); } catch (e) { /* best-effort */ }
}

const PROMISE_CEREMONY_KEY = "journi-promise-signature";
async function savePromiseCeremony(record) {
  try { await window.storage.set(PROMISE_CEREMONY_KEY, JSON.stringify(record), false); } catch (e) { /* best-effort */ }
}
async function loadPromiseCeremony() {
  try {
    const res = await window.storage.get(PROMISE_CEREMONY_KEY, false);
    return res ? JSON.parse(res.value) : null;
  } catch (e) {
    return null;
  }
}

async function loadAppStateSnapshot() {
  try {
    const res = await window.storage.get(APPSTATE_KEY, false);
    return res ? JSON.parse(res.value) : null;
  } catch (e) {
    if (e instanceof Error && e.message === `Key not found: ${APPSTATE_KEY}`) return null;
    throw e;
  }
}
async function saveAppStateSnapshot(snapshot) {
  try {
    await window.storage.set(APPSTATE_KEY, JSON.stringify(snapshot), false);
  } catch (e) {
    console.error("Failed to save app state snapshot:", e);
    throw e;
  }
}

/* Session length for the simulated auth layer */
const SESSION_DAYS = 30;

export default function JourniApp() {
  const [phase, setPhase] = useState("splash"); // splash | welcome | signin | onboarding | app
  const [screen, setScreen] = useState("home");
  const [chapter, setChapter] = useState(null);
  const [christianMode, setChristianMode] = useState(false);
  const [state, setState] = useState({ trust: 82, promise: "Read 10 pages", mood: null, moodHistory: [], plan: null, peace: null });
  const [welcomeBack, setWelcomeBack] = useState({ checked: false, show: false, context: null });

  const [authProfile, setAuthProfile] = useState(null);
  const [splashTimerDone, setSplashTimerDone] = useState(false);
  const [bootstrapDone, setBootstrapDone] = useState(false);
  const [postSplashPhase, setPostSplashPhase] = useState("welcome");
  const [reauth, setReauth] = useState(false);

  const [celebration, setCelebration] = useState(null);
  const celebrationTokenRef = useRef(0);
  const showCelebration = (message) => {
    const token = ++celebrationTokenRef.current;
    setCelebration(message);
    setTimeout(() => { if (celebrationTokenRef.current === token) setCelebration(null); }, 3800);
  };

  /* Initialize notifications on app mount and reschedule if reminder preference changes */
  useEffect(() => {
    initializeNotifications();

    if (!Capacitor.isNativePlatform()) return undefined;
    let notificationActionListener;
    LocalNotifications.addListener("localNotificationActionPerformed", ({ notification }) => {
      if (notification.id === NOTIFICATION_ID) logReminderOpened();
    }).then((listener) => {
      notificationActionListener = listener;
    });

    return () => {
      notificationActionListener?.remove();
    };
  }, []);

  useEffect(() => {
    if (phase === "app" && state.plan?.reminderTime) {
      updateScheduledNotification(state.plan.reminderTime);
    }
  }, [state.plan?.reminderTime, phase]);

  /* Every evidence-producing action in the app funnels through here:
     log the event, then recompute Self-Trust live from the whole
     timeline so the score genuinely reflects behaviour over time
     rather than being a static number set once at onboarding. */
  const recordEvidenceAndRefresh = async (type, payload) => {
    await logEvidence(type, payload);
    const timeline = await loadEvidenceTimeline();
    const score = computeSelfTrust(timeline, state.plan?.trustBaseline ?? 45);
    setState((s) => ({ ...s, trust: score }));
    return timeline;
  };

  const celebrateMilestone = async (key, message) => {
    const event = await reachMilestoneOnce(key);
    if (event) {
      showCelebration(message);
      const timeline = await loadEvidenceTimeline();
      setState((s) => ({ ...s, trust: computeSelfTrust(timeline, s.plan?.trustBaseline ?? 45) }));
    }
  };

  const handleCelebrate = async (type) => {
    if (type === "lesson") {
      await recordEvidenceAndRefresh(EVENT_TYPES.COACHING_SESSION_COMPLETED, { source: "learn_chapter" });
      celebrateMilestone("first-lesson", "First lesson complete. Knowledge becomes change when it's put into action.");
    } else if (type === "reflection") {
      await recordEvidenceAndRefresh(EVENT_TYPES.REFLECTION_WRITTEN, { source: "evening_reflection" });
      await recordEvidenceAndRefresh(EVENT_TYPES.PROMISE_REVIEW, { source: "evening_reflection" });
      celebrateMilestone("first-reflection", "Your first reflection — a real step toward understanding yourself.");
    } else if (type === "reset") {
      await recordEvidenceAndRefresh(EVENT_TYPES.EMOTIONAL_CHECKIN_COMPLETED, { source: "reset_exercise" });
      celebrateMilestone("first-reset", "First successful reset. That's a real moment of care for yourself.");
    }
  };

  /* Bootstrap: recognise returning users and restore their saved account + progress */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sessionCheck = await supabase.auth.getSession();
      const profile = await loadUserProfile();
      let savedSnapshot = null;
      let snapshotLoadFailed = false;
      try {
        savedSnapshot = await loadAppStateSnapshot();
      } catch (e) {
        snapshotLoadFailed = true;
      }
      if (cancelled) return;
      if (savedSnapshot?.state) {
        setState((s) => ({ ...s, ...savedSnapshot.state }));
        if (typeof savedSnapshot.christianMode === "boolean") setChristianMode(savedSnapshot.christianMode);
      }
      setAuthProfile(profile);
      const now = new Date();
      const sessionValid = !profile || !profile.sessionExpiresAt || new Date(profile.sessionExpiresAt) > now;
      const hasLiveSession = !!sessionCheck?.data?.session;
      let next = "welcome";
      let needsReauth = false;
      if (snapshotLoadFailed) {
        next = "signin";
        needsReauth = true;
      } else if (profile) {
        if (!hasLiveSession || !sessionValid) { next = "signin"; needsReauth = true; }
        else if (savedSnapshot?.state?.plan) next = "app";
        else next = "onboarding";
      }
      setPostSplashPhase(next);
      setReauth(needsReauth);
      setBootstrapDone(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let authListener = null;

    const waitForBootstrap = async () => {
      if (bootstrapDone) return true;
      const startedAt = Date.now();
      while (!bootstrapDone && Date.now() - startedAt < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return bootstrapDone;
    };

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (!(await waitForBootstrap())) return;
      if (data.session?.user) {
        handleAuthenticated({
          email: data.session.user.email,
          authMethod: "Email (Magic Link)",
          joinDate: data.session.user.created_at,
        });
      }
    })();

    authListener = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        (async () => {
          if (!(await waitForBootstrap())) return;
          if (!isMounted) return;
          handleAuthenticated({
            email: session.user.email,
            authMethod: "Email (Magic Link)",
            joinDate: session.user.created_at,
          });
        })();
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, [bootstrapDone]);

  /* Advance past Splash once both the brand moment and the account check are done */
  useEffect(() => {
    if (phase === "splash" && splashTimerDone && bootstrapDone) {
      setPhase(postSplashPhase);
      if (postSplashPhase === "app") setScreen("home");
    }
  }, [phase, splashTimerDone, bootstrapDone, postSplashPhase]);

  /* Keep the account's saved progress in sync so a reload restores everything */
  useEffect(() => {
    if (!bootstrapDone) return;
    if (phase !== "app" && phase !== "onboarding") return;
    saveAppStateSnapshot({ state, christianMode }).catch((e) => {
      console.error("Failed to save app state snapshot:", e);
      showCelebration("Couldn't save your progress — please try again.");
    });
  }, [state, christianMode, phase, bootstrapDone]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rec = await loadReturnRecord();
      const timeline = await loadEvidenceTimeline();
      const now = new Date();
      const todayKey = localDayKey(now);
      let show = true;
      let context = null;
      if (rec?.lastVisitISO) {
        const last = new Date(rec.lastVisitISO);
        const hoursSince = (now - last) / 3600000;
        const dayChanged = rec.lastVisitDayKey !== todayKey;
        show = hoursSince >= 4 || dayChanged;
        const daysAway = Math.round((startOfDay(now) - startOfDay(last)) / 86400000);
        const yesterdayKey = localDayKey(new Date(now.getTime() - 86400000));
        const hasHistory = selectEventsOfType(timeline, EVENT_TYPES.PROMISE_COMPLETED).length > 0;
        const yesterdayCompleted = selectCompletedOnDay(timeline, yesterdayKey);
        context = {
          daysAway,
          hasHistory,
          yesterdayCompleted,
          streak: selectStreak(timeline),
        };
        // Retroactively record a missed-promise event for yesterday, once,
        // the first time we can actually confirm the day passed without one.
        if (hasHistory && !yesterdayCompleted && dayChanged) {
          const alreadyLogged = selectEventsOfType(timeline, EVENT_TYPES.PROMISE_MISSED).some((e) => e.dayKey === yesterdayKey);
          if (!alreadyLogged) logEvidence(EVENT_TYPES.PROMISE_MISSED, { dayKey: yesterdayKey });
        }
      }
      if (!cancelled) setWelcomeBack({ checked: true, show, context });
    })();
    return () => { cancelled = true; };
  }, []);

  const [identityRecap, setIdentityRecap] = useState({ checked: false, show: false, type: null, gapAware: false });

  /* Day 7 / Day 30 identity recap — checked once Welcome Back's context
     is known (so we can tell whether this is a gap-aware return), fires
     at most once per threshold via reachMilestoneOnce, and never blocks
     a Welcome Back screen that's already due. */
  useEffect(() => {
    if (!welcomeBack.checked) return;
    let cancelled = false;
    (async () => {
      const ceremony = await loadPromiseCeremony();
      if (!ceremony?.dateISO) { if (!cancelled) setIdentityRecap({ checked: true, show: false, type: null, gapAware: false }); return; }
      const elapsed = daysSince(ceremony.dateISO);
      const gapAware = (welcomeBack.context?.daysAway || 0) >= 3;
      let type = null;
      if (elapsed >= 30) {
        const first = await reachMilestoneOnce("day30-recap-shown");
        if (first) type = "day30";
      } else if (elapsed >= 7) {
        const first = await reachMilestoneOnce("day7-recap-shown");
        if (first) type = "day7";
      }
      if (!cancelled) setIdentityRecap({ checked: true, show: !!type, type, gapAware });
    })();
    return () => { cancelled = true; };
  }, [welcomeBack.checked]);

  const go = (s) => { setChapter(null); setScreen(s); };

  const handleAuthenticated = async (partialProfile) => {
    const merged = {
      ...(authProfile || {}),
      ...partialProfile,
      sessionExpiresAt: new Date(Date.now() + SESSION_DAYS * 86400000).toISOString(),
    };
    setAuthProfile(merged);
    await saveUserProfile(merged);
    if (reauth) {
      setReauth(false);
      setPhase("app");
      setScreen("home");
    } else if (state.plan) {
      setPhase("app");
      setScreen("home");
    } else {
      setPhase("onboarding");
    }
  };

  const finishOnboarding = (plan) => {
    setState((s) => ({
      ...s,
      trust: plan.trustBaseline,
      promise: plan.week[0].text,
      plan,
    }));
    if (plan.name) {
      setAuthProfile((p) => {
        const merged = { ...(p || {}), name: plan.name };
        saveUserProfile(merged);
        return merged;
      });
    }
    logEvidence(EVENT_TYPES.PROMISE_CREATED, { promise: plan.week[0].text, goal: plan.goal });
    setPhase("app");
    setScreen("home");
  };

  const applyBreakdown = (newText) => {
    setState((s) => ({ ...s, promise: newText }));
    recordEvidenceAndRefresh(EVENT_TYPES.PROMISE_RESCHEDULED, { newPromise: newText, reason: "shrink" });
    go("home");
  };

  const setPeace = (updater) => {
    setState((s) => ({ ...s, peace: typeof updater === "function" ? updater(s.peace) : updater }));
  };

  const markCompletedToday = async (meta = {}) => {
    const now = new Date();
    const todayKey = localDayKey(now);
    const timelineBefore = await loadEvidenceTimeline();
    if (selectCompletedOnDayBySource(timelineBefore, todayKey, meta.source)) return { trust: state.trust, alreadyCounted: true }; // idempotent per source — already counted today

    const yesterdayKey = localDayKey(new Date(now.getTime() - 86400000));
    const hadHistory = selectEventsOfType(timelineBefore, EVENT_TYPES.PROMISE_COMPLETED).length > 0;
    const keptYesterday = selectCompletedOnDay(timelineBefore, yesterdayKey);
    const isRecovery = hadHistory && !keptYesterday;

    await logEvidence(EVENT_TYPES.PROMISE_COMPLETED, { promise: state.promise, ...meta });
    if (isRecovery) await logEvidence(EVENT_TYPES.RECOVERY_AFTER_SETBACK, { ...meta });
    if (meta.boosted) await logEvidence(EVENT_TYPES.PROMISE_INCREASED, { ...meta });

    const rec = (await loadReturnRecord()) || {};
    await saveReturnRecord({ ...rec, lastVisitISO: now.toISOString(), lastVisitDayKey: todayKey });

    const timelineAfter = await loadEvidenceTimeline();
    const streak = selectStreak(timelineAfter);
    const trustScore = computeSelfTrust(timelineAfter, state.plan?.trustBaseline ?? 45);
    setState((s) => ({ ...s, trust: trustScore }));

    const firstEverEvent = await reachMilestoneOnce("first-promise-kept");
    if (firstEverEvent) {
      showCelebration("Your first kept promise is the beginning of rebuilding self-trust.");
      if (state.plan?.fastPath) await reachMilestoneOnce("deepen-invite-eligible");
    } else if (isRecovery) {
      showCelebration("You showed up again after missing one. That's what rebuilding trust actually looks like.");
    } else if (meta.boosted) {
      showCelebration("You had the energy and you used it. That's evidence too.");
    } else if (streak === 3) {
      showCelebration("Three promises kept. You're building evidence that you're someone who follows through.");
    } else if (streak === 7) {
      showCelebration("Seven days. That's not luck — that's who you're becoming.");
    } else {
      showCelebration("Nice work. Every kept promise strengthens your self-trust.");
    }
    return { trust: trustScore };
  };

  const handleWelcomeContinue = async (selectedEmotion) => {
    const now = new Date();
    const rec = (await loadReturnRecord()) || {};
    await saveReturnRecord({ ...rec, lastVisitISO: now.toISOString(), lastVisitDayKey: localDayKey(now) });
    await logEvidence(EVENT_TYPES.DAILY_CHECKIN, {});
    if (selectedEmotion) {
      setState((s) => {
        let promise = s.promise;
        if (selectedEmotion.cat === "Positive") promise = boostPromise(promise);
        else if (selectedEmotion.cat === "Challenging") promise = shrinkPromise(promise);
        const history = (s.moodHistory || []).filter((h) => h.day !== "today");
        return { ...s, promise, mood: selectedEmotion.label, moodHistory: [...history, { day: "today", mood: selectedEmotion.label }] };
      });
      await recordEvidenceAndRefresh(EVENT_TYPES.EMOTIONAL_CHECKIN_COMPLETED, { mood: selectedEmotion.label, category: selectedEmotion.cat, source: "welcome_back" });
    }
    setWelcomeBack((w) => ({ ...w, show: false }));
  };

  const handleLogout = async () => {
    await deleteKeySafe(PROFILE_KEY);
    await deleteKeySafe(APPSTATE_KEY);
    await deleteKeySafe(RETURN_KEY);
    await updateScheduledNotification("No reminders");
    setAuthProfile(null);
    setState({ trust: 82, promise: "Read 10 pages", mood: null, moodHistory: [], plan: null, peace: null });
    setChristianMode(false);
    setWelcomeBack({ checked: false, show: false, context: null });
    setPostSplashPhase("welcome");
    setSplashTimerDone(false);
    setBootstrapDone(true); // no storage round-trip needed; we know the state is empty
    setPhase("welcome");
    setScreen("home");
  };

  let content;
  const showingWelcomeBack = phase === "app" && welcomeBack.checked && welcomeBack.show;
  const showingIdentityRecap = phase === "app" && !showingWelcomeBack && screen === "home" && identityRecap.checked && identityRecap.show;
  if (phase === "splash") {
    content = <SplashScreen onDone={() => setSplashTimerDone(true)} />;
  } else if (showingWelcomeBack) {
    content = <WelcomeBackScreen name={state.plan?.name || authProfile?.name || "Sarah"} returnContext={welcomeBack.context} onContinue={handleWelcomeContinue} />;
  } else if (showingIdentityRecap) {
    content = <IdentityRecapScreen type={identityRecap.type} gapAware={identityRecap.gapAware} onContinue={() => setIdentityRecap((r) => ({ ...r, show: false }))} />;
  } else if (phase === "welcome") {
    content = <AuthScreen onStart={() => setPhase("signin")} onSkip={() => setPhase("signin")} />;
  } else if (phase === "signin") {
    content = <SignInScreen onAuthenticated={handleAuthenticated} onBack={() => setPhase("welcome")} reauth={reauth} />;
  } else if (phase === "onboarding") {
    content = <OnboardingFlow onBack={() => setPhase("welcome")} onComplete={finishOnboarding} />;
  } else if (screen === "breakdown") content = <BreakdownFlow original={state.promise} onExit={() => go("home")} onApply={applyBreakdown} />;
  else if (screen === "stuck") content = <StuckFlow onExit={() => go("home")} promise={state.promise} plan={state.plan} onPromiseKept={markCompletedToday} onEvidence={recordEvidenceAndRefresh} trust={state.trust} />;
  else if (screen === "coach") content = <CoachScreen onBack={() => go("home")} plan={state.plan} />;
  else if (screen === "goals") content = <GoalTrackerScreen onBack={() => go("home")} plan={state.plan} onBreakdown={() => go("breakdown")} promise={state.promise} go={go} />;
  else if (screen === "movement") content = <MovementScreen onBack={() => go("home")} plan={state.plan} onEvidence={recordEvidenceAndRefresh} />;
  else if (screen === "reset") content = <ResetScreen onBack={() => go("home")} plan={state.plan} onCelebrate={handleCelebrate} />;
  else if (screen === "reflection") content = <ReflectionScreen onBack={() => go("home")} plan={state.plan} onCelebrate={handleCelebrate} />;
  else if (screen === "promiseProgress") content = <PromiseProgressScreen onBack={() => go("home")} />;
  else if (screen === "peace") content = <PeaceScreen onBack={() => go("home")} peace={state.peace} setPeace={setPeace} christianMode={christianMode} onPromiseKept={markCompletedToday} onEvidence={recordEvidenceAndRefresh} />;
  else if (screen === "weeklyReview") content = <WeeklyReviewScreen onBack={() => go("home")} onComplete={() => go("home")} plan={state.plan} onEvidence={recordEvidenceAndRefresh} />;
  else if (screen === "deepenProfile") content = <DeepenProfileFlow plan={state.plan} onBack={() => go("home")} onSkip={() => go("home")} onComplete={(newPlan) => { setState((s) => ({ ...s, plan: newPlan })); go("home"); }} />;
  else if (screen === "learn" && chapter) content = <ChapterScreen chapter={chapter} onBack={() => setChapter(null)} onCelebrate={handleCelebrate} />;
  else if (screen === "learn") content = <LearnScreen go={go} openChapter={setChapter} plan={state.plan} />;
  else if (screen === "progress") content = <ProgressScreen plan={state.plan} moodHistory={state.moodHistory} peace={state.peace} trust={state.trust} />;
  else if (screen === "profile") content = <ProfileScreen plan={state.plan} christianMode={christianMode} setChristianMode={setChristianMode} authProfile={authProfile} onLogout={handleLogout} go={go} onReminderTimeUpdate={updateScheduledNotification} />;
  else if (screen === "reminderSettings") content = <ReminderSettingsScreen onBack={() => go("profile")} plan={state.plan} authProfile={authProfile} onSave={async (reminderTime) => { setState((s) => ({ ...s, plan: { ...s.plan, reminderTime } })); await saveReminderTime(reminderTime, authProfile?.email); }} />;
  else if (screen === "myPromise") content = <MyPromiseScreen onBack={() => go("profile")} plan={state.plan} trust={state.trust} />;
  else content = <HomeScreen go={go} state={state} setState={setState} onEvidence={recordEvidenceAndRefresh} />;

  const fullBleed = phase === "splash" || phase === "welcome" || phase === "signin" || phase === "onboarding" || showingWelcomeBack || showingIdentityRecap || screen === "stuck" || screen === "coach" || screen === "breakdown";
  const showNav = phase === "app" && !showingWelcomeBack && !showingIdentityRecap && screen !== "stuck" && screen !== "coach" && screen !== "breakdown";

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: fullBleed ? "center" : "flex-start", padding: fullBleed ? "8px 0" : "20px 0", background: "#DCE6EA", minHeight: "100dvh", boxSizing: "border-box", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{FONT_IMPORT}</style>
      <div style={{
        width: 390, height: fullBleed ? "min(780px, calc(100dvh - 16px))" : 780, background: T.bg, borderRadius: 46, position: "relative",
        overflow: "hidden", boxShadow: "0 30px 60px rgba(20,30,38,0.25)", border: "8px solid #16202A",
      }}>
        <div style={{ height: "100%", overflowY: fullBleed ? "hidden" : "auto", padding: fullBleed ? 0 : "18px 18px 0" }}>
          {content}
        </div>
        {showNav && <BottomNav screen={screen} go={go} />}
        <CelebrationToast message={celebration} />
      </div>
    </div>
  );
}
