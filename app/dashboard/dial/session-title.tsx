"use client";

import { useState, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";

interface SessionTitleProps {
  sessionId: string;
  currentTitle: string;
  placeholder: string;
}

export function SessionTitle({ sessionId, currentTitle, placeholder }: SessionTitleProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = async (newTitle: string) => {
    const trimmed = newTitle.trim();
    if (trimmed === currentTitle) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await fetch("/api/dial/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId, title: trimmed || null }),
      });
      setTitle(trimmed);
    } catch {
      setTitle(currentTitle);
    }
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => save(title)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save(title);
          if (e.key === "Escape") { setTitle(currentTitle); setEditing(false); }
        }}
        onClick={(e) => e.preventDefault()}
        className="bg-white/10 text-white font-medium rounded px-1.5 py-0.5 text-sm outline-none ring-1 ring-amber-500/50 w-48"
        maxLength={60}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 group/title">
      <span className="text-white font-medium truncate">
        {title || placeholder}
      </span>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditing(true); }}
        className="opacity-0 group-hover/title:opacity-100 text-white/30 hover:text-white/60 transition-opacity"
        aria-label="Edit title"
      >
        <Pencil className={`w-3 h-3 ${saving ? "animate-pulse" : ""}`} />
      </button>
    </span>
  );
}
