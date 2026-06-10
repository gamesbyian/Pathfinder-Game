// AI-assisted theme color suggestions via Gemini API proxy.
// No APP references — stateless async functions only.

import { isValidHexColor } from './theme-normalizer.js';

export function parseGeminiSuggestionsText(text) {
    const parseCandidates = [];
    if (typeof text === 'string' && text.trim()) {
        parseCandidates.push(text);
        const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fencedMatch?.[1]) parseCandidates.push(fencedMatch[1]);
    }

    let parsed = null;
    let parseError = null;
    for (const candidateText of parseCandidates) {
        try {
            parsed = JSON.parse(candidateText);
            parseError = null;
            break;
        } catch (err) {
            parseError = err;
        }
    }
    if (!parsed) return { colors: null, error: parseError ? `Invalid JSON response: ${parseError.message}` : 'No JSON response text returned.' };

    if (!Array.isArray(parsed.suggestions)) return { colors: null, error: 'Invalid schema: suggestions must be an array.' };
    const normalized = [];
    for (const raw of parsed.suggestions) {
        const color = typeof raw === 'string' ? raw.trim() : '';
        if (isValidHexColor(color)) normalized.push(color.toUpperCase());
    }
    const unique = Array.from(new Set(normalized));
    if (unique.length < 6) return { colors: null, error: 'Invalid schema: need 6 valid #RRGGBB colors.' };
    return { colors: unique.slice(0, 6), error: null };
}

export async function fetchGeminiThemeColors(themeName, themeObj) {
    const systemPrompt = "You are a professional UI/UX color palette specialist. Your goal is to analyze the provided Pathfinder game theme and suggest exactly 6 new hex colors that expand the existing palette while maintaining visual consistency and accessibility.";
    const userPrompt = `Theme Name: ${themeName}\nCurrent Colors: ${JSON.stringify(themeObj)}\n\nSuggest 6 complementary hex colors in #RRGGBB format.`;
    const prompt = `${systemPrompt}\n\n${userPrompt}`;
    const payload = {
        prompt,
        model: 'gemini-2.5-flash',
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'OBJECT',
                properties: {
                    suggestions: {
                        type: 'ARRAY',
                        items: { type: 'STRING', pattern: '^#[0-9A-Fa-f]{6}$' },
                        minItems: 6,
                        maxItems: 6,
                    },
                },
                required: ['suggestions'],
            },
        },
    };

    const delays = [1000, 2000, 4000, 8000, 16000];
    let lastError = null;
    for (let i = 0; i < 6; i++) {
        try {
            const res = await fetch('./api/gemini_color_suggest.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const body = await res.json().catch(() => ({}));

            if (res.status === 429) {
                lastError = `Rate limited (${res.status}).`;
                throw new Error('Rate Limit');
            }
            if (!res.ok) {
                const apiMessage = body?.error || `HTTP ${res.status}`;
                return { colors: null, error: `Suggestion API error: ${apiMessage}` };
            }
            if (!body?.ok) return { colors: null, error: body?.error || 'Unable to generate suggestions.' };

            const parsed = parseGeminiSuggestionsText(body?.text);
            if (parsed.colors) return { colors: parsed.colors, error: null };
            lastError = parsed.error;
        } catch (err) {
            if (err.message !== 'Rate Limit') lastError = err?.message || 'Unknown request failure.';
        }
        if (i < delays.length) await new Promise(r => setTimeout(r, delays[i]));
    }
    return { colors: null, error: lastError || 'Unable to generate suggestions.' };
}
