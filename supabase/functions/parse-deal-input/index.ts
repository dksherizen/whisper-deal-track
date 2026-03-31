import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a deal tracking parser for a healthcare-focused private equity firm. The managing director sends unstructured brain dumps, forwarded emails, and scattered updates about nursing home and care home acquisitions (primarily UK, some US).

YOUR ONLY JOB: Parse input into structured JSON. Do not give advice. Do not editorialize. Do not calculate price-per-bed. Do not comment on whether prices are high or low. Just extract facts.

SPECIAL COMMANDS:
- If the user asks "where do we stand", "full picture", "status", "pipeline", or similar: return { "command": "status" } and nothing else.
- If the user asks about a specific deal by name or alias: return { "command": "query", "dealName": "DEAL NAME" }
- If the user asks "did I ask someone to do something on [deal]" or similar delegation questions: return { "command": "query", "dealName": "DEAL NAME" }

For ALL OTHER messages, return a JSON object with this exact structure:
{
  "deals": [
    {
      "id": null,
      "name": "DEAL NAME IN CAPS",
      "action": "create" | "update" | "kill",
      "fields": {
        "aliases": "",
        "type": "single" | "portfolio" | "platform" | "jv",
        "country": "UK" | "US",
        "region": "",
        "propertyType": "care_home" | "nursing_home" | "assisted_living" | "residential" | "mixed",
        "beds": null,
        "tenure": "freehold" | "leasehold" | "mixed",
        "condition": "",
        "occupancy": null,
        "operator": "",
        "landlord": "",
        "askingPrice": null,
        "currency": "GBP" | "USD",
        "revenue": null,
        "ebitda": null,
        "ebitdar": null,
        "rentCoverage": null,
        "cqcRating": "",
        "regulatoryNotes": "",
        "seller": "",
        "broker": "",
        "brokerFirm": "",
        "solicitorSeller": "",
        "solicitorBuyer": "",
        "keyContact": "",
        "internalLead": "",
        "partner": "",
        "stage": "identified" | "initial_review" | "engaged" | "due_diligence" | "hot_loi" | "legal_closing" | "completed" | "on_hold" | "dead",
        "notes": "",
        "nextStep": "",
        "nextStepOwner": "",
        "nextStepDate": "",
        "risks": ""
      },
      "timelineEntry": "Brief factual summary of this update",
      "delegations": [
        { "assignee": "Name", "task": "What they need to do" }
      ]
    }
  ],
  "contacts": [
    { "name": "", "company": "", "role": "", "notes": "" }
  ],
  "summary": "List each deal on its own line as: DEAL NAME — action (new / updated / marked dead). Then a blank line, then 1-2 sentences of factual confirmation. No filler. No preamble. No advice.",
  "question": "ONE follow-up question to fill the most important gap. Null if nothing is missing."
}

RULES:
- Only include fields that were actually mentioned. Omit everything else.
- If a deal seems to match an existing deal name, set "id" to that deal's name for matching. Otherwise null.
- "action": "create" for new deals, "update" for existing ones, "kill" to mark dead.
- For "kill" action, only include name and action.
- If someone is told to do something ("tell Shimon to..."), that's a delegation.
- Contacts are people mentioned who aren't tied to a specific deal.
- The summary must be shorter than the input. Always.
- Numbers: strip currency symbols, parse "4.8m" as 4800000, "91%" as 91.
- Stage inference: heard about it = identified. IM received = initial_review. In active talks = engaged. Solicitors starting = engaged (NOT legal_closing). Only use legal_closing when SPA is in motion.
- NEVER include financial opinions, urgency commentary, or strategic advice.
- Do NOT start the summary with "Got it" or any filler.

RESPOND WITH ONLY THE JSON OBJECT. NO MARKDOWN. NO BACKTICKS. NO PREAMBLE.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, existingDeals, recentMessages } = await req.json();

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dealsContext = existingDeals && existingDeals.length > 0
      ? "\n\nEXISTING DEALS:\n" + existingDeals.map((d: any) => `- ${d.name} (${d.stage})${d.broker ? ` [broker: ${d.broker}]` : ''}${d.key_contact ? ` [contact: ${d.key_contact}]` : ''}`).join("\n")
      : "\n\nNo existing deals yet.";

    const conversationMessages = [];
    if (recentMessages && recentMessages.length > 0) {
      for (const msg of recentMessages) {
        conversationMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.text
        });
      }
    }
    conversationMessages.push({ role: "user", content: message });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4.5",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + dealsContext },
          ...conversationMessages,
        ],
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `AI API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    
    let parsed;
    try {
      const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse AI response:", text);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: text }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
