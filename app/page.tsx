"use client";

import React, { useState } from "react";

export default function Page() {
  const [word, setWord] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [example, setExample] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setExample(null);
    const w = word.trim();
    if (!w) {
      setStatus("Please enter a word");
      return;
    }

    setStatus("Generating example with Gemini...");
    try {
      const res = await fetch("/api/ai/generate-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: [w] }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `status:${res.status}`);
      }

      const data = await res.json();
      // Try several common shapes for the response
      const gen =
        data?.examples?.[0]?.sentence || data?.example || data?.text || data?.generated || null;

      if (!gen) {
        setStatus("No example returned from AI");
        return;
      }

      setExample(gen);
      setStatus("Example generated — review below, then Save to persist to DB.");
    } catch (err: any) {
      console.error(err);
      setStatus(`Generation failed: ${err?.message ?? String(err)}`);
    }
  }

  async function handleSave() {
    if (!word || !example) {
      setStatus("Nothing to save. Enter a word and generate an example first.");
      return;
    }

    setSaving(true);
    setStatus("Saving to database...");
    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: word.trim(),
          language: "en",
          meaning: null,
          // backend may accept examples as nested or separate - we send a helpful payload
          examples: [
            {
              sentence: example,
            },
          ],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `status:${res.status}`);
      }

      const created = await res.json();
      setStatus("Saved successfully. You can start learning now.");

      // If the API returned the created row with id, offer a link to learning view
      const id = created?.id || created?.data?.id || null;
      if (id) {
        setStatus("Saved successfully. Open study view.");
        // Try to open a learning route if it exists
        // If your app has /learn/[id] or /study?wordId=, adjust accordingly
        // window.location.href = `/learn/${id}`;
      }
    } catch (err: any) {
      console.error(err);
      setStatus(`Save failed: ${err?.message ?? String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, -apple-system,Segoe UI, Roboto, 'Helvetica Neue', Arial" }}>
      <h1>Vocab App — Quick Add (Dev)</h1>
      <p>Flow: User → Word input → Gemini generate → Save to DB → Learn</p>

      <form onSubmit={handleGenerate} style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Word
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Enter a word (e.g. example)"
            style={{ display: "block", width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" style={{ padding: "8px 12px" }}>
            Generate Example
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!example || saving}
            style={{ padding: "8px 12px" }}
          >
            {saving ? "Saving..." : "Save & Start Learning"}
          </button>
        </div>
      </form>

      <section style={{ marginTop: 20 }}>
        <h2>Generated Example</h2>
        <div style={{ minHeight: 80, padding: 12, border: "1px solid #ddd", borderRadius: 6 }}>
          {example ? (
            <p>{example}</p>
          ) : (
            <p style={{ color: "#666" }}>No example yet — generate one.</p>
          )}
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Status</h2>
        <div style={{ minHeight: 24 }}>{status}</div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2>Notes for integrators</h2>
        <ul>
          <li>/api/ai/generate-sentence should accept POST {{ words: [string] }} and return a JSON containing an example at data.examples[0].sentence or example/text.</li>
          <li>/api/words should accept POST to create a word row. Response handling in this page is tolerant to several shapes (created row or {{ data: row }}).</li>
          <li>After saving, consider redirecting users to your learning flow (e.g. /learn/[id]) — this page leaves that step manual intentionally.</li>
        </ul>
      </section>
    </main>
  );
}
