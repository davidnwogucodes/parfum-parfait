import botConfig from '@/lib/bot-config.json';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

/** Build the full system prompt from bot-config.json + live business snapshot. */
function buildSystemPrompt(businessContext) {
  const { identity, capabilities, actions, conversationRules } = botConfig;

  return `IDENTITY & SCOPE
You are ${identity.name} for "${identity.store}".
Personality: ${identity.personality}
Scope rule: ${identity.scope}

⚠️ CRITICAL: ${identity.critical}

YOUR CAPABILITIES
${capabilities.map((c, i) => `${i + 1}. ${c}`).join('\n')}

AVAILABLE ACTIONS
You can trigger real changes in the store database. When the owner requests a change, embed action markers in your reply using this exact format:
  ${actions.format}
Place all action markers at the very end of your message, after your conversational text.
Important: ${actions.note}

Action list:
${actions.available
    .map(
      (a) =>
        `• ${a.name} — ${a.when}\n  Params: ${JSON.stringify(a.params)}${a.example ? `\n  Example: ${a.example}` : ''}`
    )
    .join('\n\n')}

CONVERSATION RULES
${conversationRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

LIVE BUSINESS DATA (as of ${new Date().toUTCString()})
${JSON.stringify(businessContext, null, 2)}`;
}

/**
 * Send a message to the AI with full conversation history and business context.
 * @param {string} userMessage
 * @param {object} businessContext - live snapshot built from JSONBin data
 * @param {Array}  history - prior [{role, content}] turns for this chat
 * @returns {Promise<string>} raw AI reply (may contain action markers)
 */
export async function askAI(userMessage, businessContext, history = []) {
  const systemPrompt = buildSystemPrompt(businessContext);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://parfum-parfait.vercel.app',
        'X-Title': 'Parfum Parfait Bot',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: userMessage },
        ],
      }),
    });

    // Rate limited — wait and retry
    if (res.status === 429 && attempt < MAX_RETRIES) {
      console.warn(`OpenRouter rate limited, retrying (${attempt}/${MAX_RETRIES})...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      continue;
    }

    if (!res.ok) {
      const err = await res.text();
      console.error('OpenRouter error:', err);
      throw new Error(`OpenRouter responded with ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? '⚠️ No response from AI.';
  }

  throw new Error('OpenRouter rate limit exceeded after retries.');
}
