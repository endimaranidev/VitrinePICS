import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

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
  const teams = await kv.getByPrefix("team:");
  return c.json({ teams: teams.map((t: any) => t.teamName) });
});

app.post(`${P}/teams`, async (c) => {
  const { teamName } = await c.req.json();
  if (!teamName?.trim()) return c.json({ error: "teamName obrigatório" }, 400);
  const existing = await kv.get(`team:${teamName}`);
  if (existing) return c.json({ error: "Equipe já existe" }, 409);
  await kv.set(`team:${teamName}`, { teamName, createdAt: new Date().toISOString() });
  return c.json({ success: true });
});

app.delete(`${P}/teams/:teamName`, async (c) => {
  const teamName = decodeURIComponent(c.req.param("teamName"));
  await kv.del(`team:${teamName}`);
  return c.json({ success: true });
});

// ─── EVALUATORS ──────────────────────────────────────────────────────────────

app.get(`${P}/evaluators`, async (c) => {
  const evaluators = await kv.getByPrefix("evaluator:");
  return c.json({ evaluators: evaluators.map((e: any) => ({ username: e.username, name: e.name })) });
});

// Login must be registered before :username to avoid conflict on POST
app.post(`${P}/evaluators/login`, async (c) => {
  const { username, password } = await c.req.json();
  if (!username || !password) return c.json({ error: "Campos obrigatórios" }, 400);
  const evaluator = await kv.get(`evaluator:${username}`);
  if (!evaluator || evaluator.password !== password) {
    return c.json({ error: "Usuário ou senha inválidos" }, 401);
  }
  return c.json({ success: true, evaluator: { username: evaluator.username, name: evaluator.name } });
});

app.post(`${P}/evaluators`, async (c) => {
  const { username, password, name } = await c.req.json();
  if (!username?.trim() || !password?.trim() || !name?.trim()) {
    return c.json({ error: "username, password e name são obrigatórios" }, 400);
  }
  const existing = await kv.get(`evaluator:${username.trim()}`);
  if (existing) return c.json({ error: "Usuário já existe" }, 409);
  await kv.set(`evaluator:${username.trim()}`, {
    username: username.trim(),
    password,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  });
  return c.json({ success: true });
});

app.delete(`${P}/evaluators/:username`, async (c) => {
  const username = decodeURIComponent(c.req.param("username"));
  await kv.del(`evaluator:${username}`);
  return c.json({ success: true });
});

// ─── EVALUATIONS ─────────────────────────────────────────────────────────────

app.post(`${P}/evaluations`, async (c) => {
  const { evaluatorUsername, evaluatorName, teamName, scores, comments } = await c.req.json();
  if (!evaluatorUsername || !teamName || !scores) {
    return c.json({ error: "Campos obrigatórios ausentes" }, 400);
  }
  const evaluation = {
    evaluatorUsername,
    evaluatorName,
    teamName,
    scores,
    comments: comments || "",
    timestamp: new Date().toISOString(),
  };
  await kv.set(`evaluation:${evaluatorUsername}:${teamName}`, evaluation);
  return c.json({ success: true, evaluation });
});

app.get(`${P}/evaluations`, async (c) => {
  const evaluations = await kv.getByPrefix("evaluation:");
  return c.json({ evaluations });
});

app.get(`${P}/evaluations/by-evaluator/:username`, async (c) => {
  const username = decodeURIComponent(c.req.param("username"));
  const evaluations = await kv.getByPrefix(`evaluation:${username}:`);
  return c.json({ evaluations });
});

// ─── RANKING ─────────────────────────────────────────────────────────────────

app.get(`${P}/ranking`, async (c) => {
  const [evaluations, teamsData] = await Promise.all([
    kv.getByPrefix("evaluation:"),
    kv.getByPrefix("team:"),
  ]);

  const teams: string[] = teamsData.map((t: any) => t.teamName);
  const teamStats: Record<string, any> = {};

  teams.forEach((team) => {
    teamStats[team] = {
      teamName: team,
      totalScore: 0,
      count: 0,
      scoresByCriteria: {},
      evaluators: [],
    };
    CRITERIA.forEach((cr) => {
      teamStats[team].scoresByCriteria[cr.id] = { total: 0, count: 0 };
    });
  });

  evaluations.forEach((ev: any) => {
    const { teamName, scores, evaluatorUsername, evaluatorName } = ev;
    if (!teamStats[teamName]) return;
    teamStats[teamName].count++;
    teamStats[teamName].evaluators.push({
      evaluatorUsername,
      evaluatorName,
      scores,
      comments: ev.comments,
      timestamp: ev.timestamp,
    });
    Object.entries(scores).forEach(([cId, score]) => {
      teamStats[teamName].totalScore += score as number;
      if (teamStats[teamName].scoresByCriteria[cId]) {
        teamStats[teamName].scoresByCriteria[cId].total += score as number;
        teamStats[teamName].scoresByCriteria[cId].count++;
      }
    });
  });

  const ranking = Object.values(teamStats)
    .map((stat: any) => ({
      teamName: stat.teamName,
      averageScore: stat.count > 0 ? stat.totalScore / (stat.count * CRITERIA.length) : 0,
      evaluationCount: stat.count,
      criteriaAverages: Object.entries(stat.scoresByCriteria).reduce((acc: any, [id, data]: any) => {
        acc[id] = data.count > 0 ? data.total / data.count : 0;
        return acc;
      }, {}),
      evaluators: stat.evaluators,
    }))
    .sort((a: any, b: any) => b.averageScore - a.averageScore);

  return c.json({ ranking });
});

Deno.serve(app.fetch);
