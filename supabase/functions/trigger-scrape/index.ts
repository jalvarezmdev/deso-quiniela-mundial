import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") ?? "";
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") ?? ""; // e.g. "owner/repo"
const GITHUB_REF = Deno.env.get("GITHUB_REF") ?? "main";

const WORKFLOW_FILES: Record<string, string> = {
  all: "scrape-onefootball-all.yml",
  live: "scrape-onefootball-live.yml",
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED" }),
      { headers: { "content-type": "application/json", ...corsHeaders() }, status: 405 },
    );
  }

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing GITHUB_TOKEN or GITHUB_REPO env vars" }),
      { headers: { "content-type": "application/json", ...corsHeaders() }, status: 500 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const workflow = (body as Record<string, unknown>).workflow;

  if (workflow !== "all" && workflow !== "live") {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid workflow. Use "all" or "live".' }),
      { headers: { "content-type": "application/json", ...corsHeaders() }, status: 400 },
    );
  }

  const workflowFile = WORKFLOW_FILES[workflow];
  const url = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${workflowFile}/dispatches`;

  console.log(`[trigger] Triggering ${workflowFile} on ${GITHUB_REPO}...`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ ref: GITHUB_REF }),
  });

  if (response.status === 204) {
    console.log(`[trigger] Successfully triggered ${workflowFile}`);
    return new Response(
      JSON.stringify({ ok: true, workflow: workflowFile, message: "Scrape triggered" }),
      { headers: { "content-type": "application/json", ...corsHeaders() }, status: 200 },
    );
  }

  const errorText = await response.text();
  console.error(`[trigger] GitHub API error: ${response.status} ${errorText}`);

  return new Response(
    JSON.stringify({ ok: false, error: `GitHub API returned ${response.status}` }),
    { headers: { "content-type": "application/json", ...corsHeaders() }, status: 502 },
  );
});
