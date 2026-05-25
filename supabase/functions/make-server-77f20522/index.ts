// ─── KV Store (merged inline) ────────────────────────────────────────────────
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const kvClient = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const TABLE = "kv_store_77f20522";

async function kvSet(key: string, value: any): Promise<void> {
  const { error } = await kvClient().from(TABLE).upsert({ key, value });
  if (error) throw new Error(error.message);
}
async function kvGet(key: string): Promise<any> {
  const { data, error } = await kvClient().from(TABLE).select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value;
}
async function kvDel(key: string): Promise<void> {
  const { error } = await kvClient().from(TABLE).delete().eq("key", key);
  if (error) throw new Error(error.message);
}
async function kvGetByPrefix(prefix: string): Promise<any[]> {
  const { data, error } = await kvClient().from(TABLE).select("key, value").like("key", prefix + "%");
  if (error) throw new Error(error.message);
  return data?.map((d: any) => d.value) ?? [];
}

// ─── Server ───────────────────────────────────────────────────────────────────
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";

const app = new Hono();
const P = "/make-server-77f20522";

app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

const CRITERIA = [
  { id: "viability",       name: "Viabilidade do modelo de negócio" },
  { id: "innovation",      name: "Potencial de inovação" },
  { id: "market",          name: "Tamanho do mercado" },
  { id: "competitiveness", name: "Competitividade do setor" },
  { id: "execution",       name: "Execução do time" },
  { id: "presentation",    name: "Qualidade da apresentação" },
];

app.get(`${P}/health`, (c) => c.json({ status: "ok" }));

// ─── TEAMS ───────────────────────────────────────────────────────────────────
app.get(`${P}/teams`, async (c) => {
  const teams = await kvGetByPrefix("team:");
  return c.json({ teams: teams.map((t: any) => ({ teamName: t.teamName, description: t.description || "", logo: t.logo || "" })) });
});
app.post(`${P}/teams`, async (c) => {
  const { teamName, description, logo } = await c.req.json();
  if (!teamName?.trim()) return c.json({ error: "teamName obrigatório" }, 400);
  const existing = await kvGet(`team:${teamName}`);
  if (existing) return c.json({ error: "Equipe já existe" }, 409);
  await kvSet(`team:${teamName}`, { teamName, description: description || "", logo: logo || "", createdAt: new Date().toISOString() });
  return c.json({ success: true });
});
app.put(`${P}/teams/:teamName`, async (c: any) => {
  const teamName = decodeURIComponent(c.req.param("teamName"));
  const existing = await kvGet(`team:${teamName}`);
  if (!existing) return c.json({ error: "Equipe não encontrada" }, 404);
  const { description, logo } = await c.req.json();
  await kvSet(`team:${teamName}`, { ...existing, description: description ?? existing.description, logo: logo ?? existing.logo });
  return c.json({ success: true });
});
app.delete(`${P}/teams/:teamName`, async (c) => {
  const teamName = decodeURIComponent(c.req.param("teamName"));
  await kvDel(`team:${teamName}`);
  return c.json({ success: true });
});

// ─── EVALUATORS ──────────────────────────────────────────────────────────────
app.get(`${P}/evaluators`, async (c) => {
  const evaluators = await kvGetByPrefix("evaluator:");
  return c.json({ evaluators: evaluators.map((e: any) => ({ username: e.username, name: e.name })) });
});
app.post(`${P}/evaluators/login`, async (c) => {
  const { username, password } = await c.req.json();
  if (!username || !password) return c.json({ error: "Campos obrigatórios" }, 400);
  const evaluator = await kvGet(`evaluator:${username}`);
  if (!evaluator || evaluator.password !== password) {
    return c.json({ error: "Usuário ou senha inválidos" }, 401);
  }
  return c.json({ success: true, evaluator: { username: evaluator.username, name: evaluator.name, finalized: evaluator.finalized || false } });
});
app.post(`${P}/evaluators`, async (c) => {
  const { username, password, name } = await c.req.json();
  if (!username?.trim() || !password?.trim() || !name?.trim()) {
    return c.json({ error: "username, password e name são obrigatórios" }, 400);
  }
  const existing = await kvGet(`evaluator:${username.trim()}`);
  if (existing) return c.json({ error: "Usuário já existe" }, 409);
  await kvSet(`evaluator:${username.trim()}`, {
    username: username.trim(), password, name: name.trim(),
    createdAt: new Date().toISOString(),
  });
  return c.json({ success: true });
});
app.delete(`${P}/evaluators/:username`, async (c) => {
  const username = decodeURIComponent(c.req.param("username"));
  await kvDel(`evaluator:${username}`);
  return c.json({ success: true });
});

app.post(`${P}/evaluators/:username/finalize`, async (c: any) => {
  const username = decodeURIComponent(c.req.param("username"));
  const evaluator = await kvGet(`evaluator:${username}`);
  if (!evaluator) return c.json({ error: "Avaliador não encontrado" }, 404);
  await kvSet(`evaluator:${username}`, { ...evaluator, finalized: true });
  return c.json({ success: true });
});

// ─── EVALUATIONS ─────────────────────────────────────────────────────────────
app.post(`${P}/evaluations`, async (c) => {
  const { evaluatorUsername, evaluatorName, teamName, scores, comments } = await c.req.json();
  if (!evaluatorUsername || !teamName || !scores) {
    return c.json({ error: "Campos obrigatórios ausentes" }, 400);
  }
  const evaluation = {
    evaluatorUsername, evaluatorName, teamName, scores,
    comments: comments || "", timestamp: new Date().toISOString(),
  };
  await kvSet(`evaluation:${evaluatorUsername}:${teamName}`, evaluation);
  return c.json({ success: true, evaluation });
});
app.get(`${P}/evaluations`, async (c) => {
  const evaluations = await kvGetByPrefix("evaluation:");
  return c.json({ evaluations });
});
app.get(`${P}/evaluations/by-evaluator/:username`, async (c) => {
  const username = decodeURIComponent(c.req.param("username"));
  const evaluations = await kvGetByPrefix(`evaluation:${username}:`);
  return c.json({ evaluations });
});

// ─── RANKING ─────────────────────────────────────────────────────────────────
app.get(`${P}/ranking`, async (c) => {
  const [evaluations, teamsData] = await Promise.all([
    kvGetByPrefix("evaluation:"),
    kvGetByPrefix("team:"),
  ]);
  const teams: string[] = teamsData.map((t: any) => t.teamName);
  const teamStats: Record<string, any> = {};
  teams.forEach((team) => {
    teamStats[team] = { teamName: team, totalScore: 0, count: 0, scoresByCriteria: {}, evaluators: [] };
    CRITERIA.forEach((cr) => { teamStats[team].scoresByCriteria[cr.id] = { total: 0, count: 0 }; });
  });
  evaluations.forEach((ev: any) => {
    const { teamName, scores, evaluatorUsername, evaluatorName } = ev;
    if (!teamStats[teamName]) return;
    teamStats[teamName].count++;
    teamStats[teamName].evaluators.push({ evaluatorUsername, evaluatorName, scores, comments: ev.comments, timestamp: ev.timestamp });
    Object.entries(scores).forEach(([cId, score]) => {
      teamStats[teamName].totalScore += score as number;
      if (teamStats[teamName].scoresByCriteria[cId]) {
        teamStats[teamName].scoresByCriteria[cId].total += score as number;
        teamStats[teamName].scoresByCriteria[cId].count++;
      }
    });
  });
  const ranking = Object.values(teamStats).map((stat: any) => ({
    teamName: stat.teamName,
    averageScore: stat.count > 0 ? stat.totalScore / (stat.count * CRITERIA.length) : 0,
    evaluationCount: stat.count,
    criteriaAverages: Object.entries(stat.scoresByCriteria).reduce((acc: any, [id, data]: any) => {
      acc[id] = data.count > 0 ? data.total / data.count : 0; return acc;
    }, {}),
    evaluators: stat.evaluators,
  })).sort((a: any, b: any) => b.averageScore - a.averageScore);
  return c.json({ ranking });
});

Deno.serve(app.fetch);
