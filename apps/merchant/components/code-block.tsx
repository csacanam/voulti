"use client"

import { useState, type ReactNode } from "react"
import { Copy, Check } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"

/**
 * A code block that is readable and that copies exactly what it shows.
 *
 * No highlighting library. Four snippets do not justify shipping a tokenizer
 * with a grammar engine, and the two rules that matter here — never mangle the
 * text, and copy the original string rather than the rendered DOM — are easier
 * to guarantee in thirty lines than to verify in a dependency.
 *
 * Highlighting is deliberately shallow: strings, comments, numbers, keywords.
 * It exists so the eye can find the URL inside a curl and the key inside a
 * JSON, not to be correct about JavaScript.
 */

type Lang = "bash" | "json" | "js"

// One alternation per language, ordered so the greedy cases (strings, comments)
// win before anything can match inside them.
const PATTERNS: Record<Lang, RegExp> = {
  // Long flags before short ones, or `--data` highlights as `-d` plus junk.
  bash: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(#.*$)|(\b(?:curl|https?):\/\/[^\s"']+|\bcurl\b)|(\s--?[A-Za-z-]+)/gm,
  json: /("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(\b-?\d+(?:\.\d+)?\b)|(\b(?:true|false|null)\b)/g,
  js: /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b(?:import|from|function|const|let|return|if|res|req|await|async|new)\b)|(\b(?:true|false|null|undefined)\b)|(\b-?\d+(?:\.\d+)?\b)/gm,
}

const CLASSES: Record<Lang, string[]> = {
  //           strings              comments            command/url          flags
  bash: ["text-emerald-500", "text-muted-foreground", "text-violet-500", "text-sky-500"],
  //           keys                 strings             numbers              literals
  json: ["text-sky-500", "text-emerald-500", "text-amber-500", "text-violet-500"],
  //           comments             strings             keywords             literals            numbers
  js: ["text-muted-foreground", "text-emerald-500", "text-violet-500", "text-amber-500", "text-amber-500"],
}

function highlight(code: string, lang: Lang): ReactNode[] {
  const pattern = PATTERNS[lang]
  const classes = CLASSES[lang]
  const out: ReactNode[] = []
  let last = 0
  let key = 0

  pattern.lastIndex = 0
  for (let m = pattern.exec(code); m !== null; m = pattern.exec(code)) {
    if (m.index > last) out.push(code.slice(last, m.index))

    // Which alternation group matched decides the colour.
    const groupIndex = m.slice(1).findIndex((g) => g !== undefined)
    const cls = classes[groupIndex] ?? ""
    out.push(
      <span key={key++} className={cls}>
        {m[0]}
      </span>
    )

    last = m.index + m[0].length
    // A zero-length match would spin forever.
    if (m[0].length === 0) pattern.lastIndex++
  }

  if (last < code.length) out.push(code.slice(last))
  return out
}

export function CodeBlock({
  code,
  lang = "bash",
  label,
}: {
  code: string
  lang?: Lang
  label?: string
}) {
  const [copied, setCopied] = useState(false)
  const { t } = useLanguage()

  return (
    <div>
      {label && <p className="text-xs text-muted-foreground mb-1.5">{label}</p>}
      <div className="relative group">
        {/* overflow-x-auto, not wrapping: a broken curl line reads as two
            commands. The block scrolls, the page never does. */}
        <pre className="p-3 pr-11 bg-muted rounded-lg text-xs overflow-x-auto font-mono leading-relaxed">
          <code>{highlight(code, lang)}</code>
        </pre>
        <button
          // Copies `code`, the original string — never the rendered spans.
          onClick={() => {
            navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 border border-border text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t.code.copy}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  )
}
