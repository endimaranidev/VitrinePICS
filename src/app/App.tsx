import { BrowserRouter, Routes, Route, useNavigate } from "react-router";
import { useState, useEffect, useCallback, type FormEvent } from "react";
import * as Slider from "@radix-ui/react-slider";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Legend,
} from "recharts";
import {
  Trophy, ChevronRight, CheckCircle2, Users, Star, TrendingUp,
  Lock, Plus, Trash2, Edit2, UserPlus, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { projectId, publicAnonKey } from "/utils/supabase/info";

// ─── Coordinator credentials (hardcoded) ─────────────────────────────────────
const COORD_USERNAME = "coordenador";
const COORD_PASSWORD = "pics2025";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-77f20522`;
const API_HEADERS = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${publicAnonKey}`,
};

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Scores {
  viability: number;
  innovation: number;
  market: number;
  competitiveness: number;
  execution: number;
  presentation: number;
}

interface EvaluationRecord {
  evaluatorUsername: string;
  evaluatorName: string;
  teamName: string;
  scores: Scores;
  comments: string;
  timestamp: string;
}

interface RankingItem {
  teamName: string;
  averageScore: number;
  evaluationCount: number;
  criteriaAverages: Scores;
  evaluators: EvaluationRecord[];
}

interface EvaluatorInfo {
  username: string;
  name: string;
  finalized?: boolean;
}

interface Team {
  teamName: string;
  description?: string;
  logo?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CRITERIA = [
  { id: "viability",       name: "Viabilidade do modelo de negócio" },
  { id: "innovation",      name: "Potencial de inovação" },
  { id: "market",          name: "Tamanho do mercado" },
  { id: "competitiveness", name: "Competitividade do setor" },
  { id: "execution",       name: "Execução do time" },
  { id: "presentation",    name: "Qualidade da apresentação" },
];

const DEFAULT_SCORES: Scores = {
  viability: 5, innovation: 5, market: 5,
  competitiveness: 5, execution: 5, presentation: 5,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resizeImage(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function scoreColor(s: number) {
  if (s >= 8) return "bg-green-500";
  if (s >= 6) return "bg-yellow-500";
  if (s >= 4) return "bg-orange-500";
  return "bg-red-500";
}

function scoreColorText(s: number) {
  if (s >= 8) return "text-green-600";
  if (s >= 6) return "text-yellow-600";
  if (s >= 4) return "text-orange-600";
  return "text-red-600";
}

function avgScores(scores: Scores) {
  const vals = Object.values(scores) as number[];
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ─── ScoreSlider ─────────────────────────────────────────────────────────────

function ScoreSlider({
  label, value, onChange, disabled,
}: {
  label: string; value: number; onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className={`text-xl font-bold ${scoreColorText(value)}`}>{value.toFixed(1)}</span>
      </div>
      <Slider.Root
        className={`relative flex items-center select-none w-full h-5 ${disabled ? "opacity-60 pointer-events-none" : ""}`}
        value={[value]}
        onValueChange={disabled ? undefined : (v) => onChange(v[0])}
        max={10} min={0} step={0.5}
        disabled={disabled}
      >
        <Slider.Track className="bg-gray-200 relative grow rounded-full h-2">
          <Slider.Range className={`absolute ${scoreColor(value)} rounded-full h-full transition-colors`} />
        </Slider.Track>
        <Slider.Thumb
          className={`block w-5 h-5 ${scoreColor(value)} rounded-full shadow-lg hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-transform`}
          aria-label={label}
        />
      </Slider.Root>
      <div className="flex justify-between text-xs text-gray-500">
        <span>0</span><span>5</span><span>10</span>
      </div>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────

function Home() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mb-6">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Vitrine do PICS</h1>
          <p className="text-xl text-gray-600">Sistema de Avaliação de Pitches</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate("/evaluator")}
            className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-500"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 mx-auto group-hover:bg-blue-200 transition-colors">
              <Star className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Avaliador</h2>
            <p className="text-gray-600 mb-4">Avaliar equipes e atribuir notas</p>
            <div className="flex items-center justify-center text-blue-600 font-semibold">
              Acessar
              <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button
            onClick={() => navigate("/coordinator")}
            className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-purple-500"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4 mx-auto group-hover:bg-purple-200 transition-colors">
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Coordenação</h2>
            <p className="text-gray-600 mb-4">Gerenciar equipes, avaliadores e resultados</p>
            <div className="flex items-center justify-center text-purple-600 font-semibold">
              Acessar
              <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EvaluatorView ────────────────────────────────────────────────────────────

function EvaluatorView() {
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [evaluator, setEvaluator] = useState<EvaluatorInfo | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [myEvaluations, setMyEvaluations] = useState<Record<string, EvaluationRecord>>({});

  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [scores, setScores] = useState<Scores>(DEFAULT_SCORES);
  const [comments, setComments] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const navigate = useNavigate();

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/teams`, { headers: API_HEADERS });
      const data = await res.json();
      setTeams(data.teams || []);
    } catch {
      toast.error("Erro ao carregar equipes.");
    }
  }, []);

  const fetchMyEvaluations = useCallback(async (uname: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/evaluations/by-evaluator/${encodeURIComponent(uname)}`,
        { headers: API_HEADERS },
      );
      const data = await res.json();
      const map: Record<string, EvaluationRecord> = {};
      (data.evaluations || []).forEach((ev: EvaluationRecord) => {
        map[ev.teamName] = ev;
      });
      setMyEvaluations(map);
    } catch { /* silent */ }
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await fetch(`${API_BASE}/evaluators/login`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword }),
      });
      if (!res.ok) {
        toast.error("Usuário ou senha inválidos.");
        return;
      }
      const data = await res.json();
      setEvaluator(data.evaluator);
      toast.success(`Bem-vindo(a), ${data.evaluator.name}!`);
      await Promise.all([fetchTeams(), fetchMyEvaluations(data.evaluator.username)]);
    } catch {
      toast.error("Erro ao conectar. Tente novamente.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSelectTeam = (team: string) => {
    setSelectedTeam(team);
    const existing = myEvaluations[team];
    if (existing) {
      setScores(existing.scores);
      setComments(existing.comments);
    } else {
      setScores(DEFAULT_SCORES);
      setComments("");
    }
  };

  const handleSubmit = async () => {
    if (!selectedTeam || !evaluator) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/evaluations`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({
          evaluatorUsername: evaluator.username,
          evaluatorName: evaluator.name,
          teamName: selectedTeam,
          scores,
          comments,
        }),
      });
      if (!res.ok) throw new Error();
      const saved: EvaluationRecord = {
        evaluatorUsername: evaluator.username,
        evaluatorName: evaluator.name,
        teamName: selectedTeam,
        scores,
        comments,
        timestamp: new Date().toISOString(),
      };
      setMyEvaluations((prev) => ({ ...prev, [selectedTeam]: saved }));
      setShowSuccess(true);
      toast.success("Avaliação registrada com sucesso!");
    } catch {
      toast.error("Erro ao salvar avaliação. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowSuccess(false);
    setSelectedTeam(null);
    setScores(DEFAULT_SCORES);
    setComments("");
  };

  const handleFinalize = async () => {
    if (!evaluator) return;
    setFinalizing(true);
    try {
      const res = await fetch(
        `${API_BASE}/evaluators/${encodeURIComponent(evaluator.username)}/finalize`,
        { method: "POST", headers: API_HEADERS },
      );
      if (!res.ok) throw new Error();
      setEvaluator({ ...evaluator, finalized: true });
      setShowFinalizeConfirm(false);
      toast.success("Avaliações finalizadas. Edições não são mais permitidas.");
    } catch {
      toast.error("Erro ao finalizar avaliações.");
    } finally {
      setFinalizing(false);
    }
  };

  // ── Login ──
  if (!evaluator) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Identificação</h2>
            <p className="text-gray-600">Entre com suas credenciais para avaliar</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuário</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Nome de usuário"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Senha"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-60"
            >
              {loginLoading ? "Verificando..." : "Entrar"}
            </button>
            <button type="button" onClick={() => navigate("/")} className="w-full text-gray-600 py-2 hover:text-gray-900">
              Voltar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Avaliação Registrada!</h2>
          <p className="text-gray-600 mb-2">
            Equipe: <span className="font-semibold">{selectedTeam}</span>
          </p>
          <p className="text-gray-500 text-sm mb-8">Sua avaliação foi salva com sucesso</p>
          <div className="space-y-3">
            <button
              onClick={resetForm}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Avaliar Outra Equipe
            </button>
            <button onClick={() => navigate("/")} className="w-full text-gray-600 py-2 hover:text-gray-900">
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Team selection ──
  if (!selectedTeam) {
    const evaluatedCount = Object.keys(myEvaluations).length;
    const isFinalized = !!evaluator.finalized;
    return (
      <>
        {showFinalizeConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <Lock className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Finalizar Avaliações?</h2>
                <p className="text-gray-600">
                  Após confirmar, você não poderá mais editar ou adicionar avaliações. Esta ação é irreversível.
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-60"
                >
                  {finalizing ? "Finalizando..." : "Confirmar Finalização"}
                </button>
                <button
                  onClick={() => setShowFinalizeConfirm(false)}
                  disabled={finalizing}
                  className="w-full text-gray-600 py-2 hover:text-gray-900 disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">Selecione a Equipe</h1>
                <p className="text-gray-600">
                  Avaliador: <span className="font-semibold">{evaluator.name}</span>
                  {evaluatedCount > 0 && (
                    <span className="ml-3 text-green-600 font-medium">
                      · {evaluatedCount} avaliada(s)
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!isFinalized && evaluatedCount > 0 && (
                  <button
                    onClick={() => setShowFinalizeConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-semibold hover:bg-red-100 transition-all"
                  >
                    <Lock className="w-4 h-4" /> Finalizar Avaliações
                  </button>
                )}
                <button onClick={() => navigate("/")} className="px-4 py-2 text-gray-600 hover:text-gray-900">
                  Sair
                </button>
              </div>
            </div>

            {isFinalized && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 mb-6 font-medium">
                <Lock className="w-5 h-5 shrink-0" />
                Suas avaliações foram finalizadas e não podem mais ser editadas.
              </div>
            )}

            {teams.length === 0 ? (
              <div className="bg-white rounded-xl p-10 text-center text-gray-500 shadow">
                Nenhuma equipe cadastrada. Aguarde o coordenador.
              </div>
            ) : (
              <>
                {!isFinalized && evaluatedCount > 0 && (
                  <p className="text-sm text-blue-600 mb-4 font-medium">
                    Equipes já avaliadas aparecem destacadas. Clique para editar as notas.
                  </p>
                )}
                {isFinalized && evaluatedCount > 0 && (
                  <p className="text-sm text-gray-500 mb-4 font-medium">
                    Clique em uma equipe para visualizar sua avaliação.
                  </p>
                )}
                <div className="grid md:grid-cols-2 gap-4">
                  {teams.map((team) => {
                    const done = !!myEvaluations[team.teamName];
                    return (
                      <button
                        key={team.teamName}
                        onClick={() => handleSelectTeam(team.teamName)}
                        disabled={isFinalized && !done}
                        className={`group bg-white rounded-xl p-6 shadow-md transition-all border-2 text-left ${
                          isFinalized && !done
                            ? "border-transparent opacity-50 cursor-not-allowed"
                            : done
                              ? "border-green-400 hover:shadow-xl hover:border-green-500"
                              : "border-transparent hover:shadow-xl hover:border-blue-500"
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-2">
                          {team.logo ? (
                            <img
                              src={team.logo}
                              alt={team.teamName}
                              className="w-12 h-12 rounded-lg object-cover shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                              <span className="text-blue-600 font-bold text-lg">{team.teamName[0]}</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between">
                              <h3 className="text-xl font-bold text-gray-900">{team.teamName}</h3>
                              {done && (
                                <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium whitespace-nowrap ml-2">
                                  <CheckCircle2 className="w-3 h-3" /> Avaliado
                                </span>
                              )}
                            </div>
                            {team.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{team.description}</p>
                            )}
                          </div>
                        </div>
                        {done && (
                          <p className={`text-sm mb-2 font-semibold ${scoreColorText(avgScores(myEvaluations[team.teamName].scores))}`}>
                            Média: {avgScores(myEvaluations[team.teamName].scores).toFixed(1)}
                          </p>
                        )}
                        <div className={`flex items-center font-semibold ${done ? "text-green-600" : "text-blue-600"}`}>
                          {done ? (
                            isFinalized
                              ? <><Lock className="w-4 h-4 mr-1" /> Visualizar</>
                              : <><Edit2 className="w-4 h-4 mr-1" /> Editar notas</>
                          ) : (
                            <>Avaliar <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" /></>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  // ── Evaluation form ──
  const isEditing = !!myEvaluations[selectedTeam];
  const isFinalized = !!evaluator.finalized;
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => setSelectedTeam(null)}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
          >
            ← Voltar às equipes
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-gray-900">
              {isFinalized ? "Visualizando" : isEditing ? "Editando" : "Avaliando"}: {selectedTeam}
            </h1>
            {isFinalized ? (
              <span className="flex items-center gap-1 bg-red-100 text-red-700 text-sm px-3 py-1 rounded-full font-medium">
                <Lock className="w-3 h-3" /> Finalizado
              </span>
            ) : isEditing && (
              <span className="bg-amber-100 text-amber-700 text-sm px-3 py-1 rounded-full font-medium">
                Edição
              </span>
            )}
          </div>
          <p className="text-gray-600 mt-1">
            {isFinalized ? "Avaliação encerrada — somente visualização." : "Atribua notas de 0 a 10 para cada critério"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {CRITERIA.map((cr) => (
            <ScoreSlider
              key={cr.id}
              label={cr.name}
              value={scores[cr.id as keyof Scores]}
              onChange={(v) => setScores({ ...scores, [cr.id]: v })}
              disabled={isFinalized}
            />
          ))}

          <div className="pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comentários (opcional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none disabled:bg-gray-50 disabled:text-gray-500"
              rows={3}
              placeholder="Observações adicionais..."
              disabled={isFinalized}
            />
          </div>

          <div className="pt-4">
            {isFinalized ? (
              <div className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-500 py-4 rounded-lg font-semibold text-lg">
                <Lock className="w-5 h-5" /> Avaliações Finalizadas
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-60"
              >
                {submitting ? "Salvando..." : isEditing ? "Atualizar Avaliação" : "Salvar Avaliação"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CoordinatorView ──────────────────────────────────────────────────────────

type CoordTab = "dashboard" | "teams" | "evaluators" | "byEvaluator";

function CoordinatorView() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<CoordTab>("dashboard");
  const navigate = useNavigate();

  // Dashboard
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [rankingLoading, setRankingLoading] = useState(true);

  // Teams
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [newTeamLogo, setNewTeamLogo] = useState("");
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: "", logo: "" });

  // Evaluators
  const [evaluators, setEvaluators] = useState<EvaluatorInfo[]>([]);
  const [evalLoading, setEvalLoading] = useState(false);
  const [newEval, setNewEval] = useState({ name: "", username: "", password: "" });

  // Per-evaluator
  const [allEvaluations, setAllEvaluations] = useState<EvaluationRecord[]>([]);
  const [expandedEvaluator, setExpandedEvaluator] = useState<string | null>(null);

  // ── Fetchers ──

  const fetchRanking = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/ranking`, { headers: API_HEADERS });
      const data = await res.json();
      setRanking(data.ranking || []);
    } catch { /* silent */ } finally {
      setRankingLoading(false);
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    setTeamsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/teams`, { headers: API_HEADERS });
      const data = await res.json();
      setTeams(data.teams || []);
    } catch {
      toast.error("Erro ao carregar equipes.");
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  const fetchEvaluators = useCallback(async () => {
    setEvalLoading(true);
    try {
      const res = await fetch(`${API_BASE}/evaluators`, { headers: API_HEADERS });
      const data = await res.json();
      setEvaluators(data.evaluators || []);
    } catch {
      toast.error("Erro ao carregar avaliadores.");
    } finally {
      setEvalLoading(false);
    }
  }, []);

  const fetchAllEvaluations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/evaluations`, { headers: API_HEADERS });
      const data = await res.json();
      setAllEvaluations(data.evaluations || []);
    } catch {
      toast.error("Erro ao carregar avaliações.");
    }
  }, []);

  // Auto-refresh ranking every 5s when on dashboard
  useEffect(() => {
    if (!isLoggedIn) return;
    fetchRanking();
    const interval = setInterval(fetchRanking, 5000);
    return () => clearInterval(interval);
  }, [isLoggedIn, fetchRanking]);

  // Fetch tab-specific data on tab change
  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeTab === "teams") fetchTeams();
    if (activeTab === "evaluators") fetchEvaluators();
    if (activeTab === "byEvaluator") { fetchAllEvaluations(); fetchEvaluators(); }
  }, [isLoggedIn, activeTab, fetchTeams, fetchEvaluators, fetchAllEvaluations]);

  const handleCoordLogin = (e: FormEvent) => {
    e.preventDefault();
    if (username === COORD_USERNAME && password === COORD_PASSWORD) {
      setIsLoggedIn(true);
      toast.success("Acesso autorizado!");
    } else {
      toast.error("Usuário ou senha inválidos.");
    }
  };

  // ── Team actions ──

  const handleAddTeam = async (e: FormEvent) => {
    e.preventDefault();
    const name = newTeamName.trim();
    if (!name) return;
    try {
      const res = await fetch(`${API_BASE}/teams`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({ teamName: name, description: newTeamDescription.trim(), logo: newTeamLogo.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao adicionar equipe.");
        return;
      }
      setNewTeamName("");
      setNewTeamDescription("");
      setNewTeamLogo("");
      toast.success(`Equipe "${name}" adicionada!`);
      fetchTeams();
    } catch {
      toast.error("Erro ao adicionar equipe.");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTeam) return;
    try {
      const res = await fetch(`${API_BASE}/teams/${encodeURIComponent(editingTeam)}`, {
        method: "PUT",
        headers: API_HEADERS,
        body: JSON.stringify({ description: editForm.description, logo: editForm.logo }),
      });
      if (!res.ok) throw new Error();
      setEditingTeam(null);
      toast.success("Equipe atualizada!");
      fetchTeams();
    } catch {
      toast.error("Erro ao atualizar equipe.");
    }
  };

  const handleRemoveTeam = async (teamName: string) => {
    try {
      await fetch(`${API_BASE}/teams/${encodeURIComponent(teamName)}`, {
        method: "DELETE",
        headers: API_HEADERS,
      });
      toast.success(`Equipe "${teamName}" removida.`);
      fetchTeams();
    } catch {
      toast.error("Erro ao remover equipe.");
    }
  };

  // ── Evaluator actions ──

  const handleAddEvaluator = async (e: FormEvent) => {
    e.preventDefault();
    const { name, username: uname, password: pwd } = newEval;
    if (!name.trim() || !uname.trim() || !pwd.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/evaluators`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({ name: name.trim(), username: uname.trim(), password: pwd }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao cadastrar avaliador.");
        return;
      }
      setNewEval({ name: "", username: "", password: "" });
      toast.success(`Avaliador "${name.trim()}" cadastrado!`);
      fetchEvaluators();
    } catch {
      toast.error("Erro ao cadastrar avaliador.");
    }
  };

  const handleRemoveEvaluator = async (uname: string) => {
    try {
      await fetch(`${API_BASE}/evaluators/${encodeURIComponent(uname)}`, {
        method: "DELETE",
        headers: API_HEADERS,
      });
      toast.success("Avaliador removido.");
      fetchEvaluators();
    } catch {
      toast.error("Erro ao remover avaliador.");
    }
  };

  // ── Login screen ──
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
              <Lock className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Coordenação</h2>
            <p className="text-gray-600">Acesso restrito — informe suas credenciais</p>
          </div>
          <form onSubmit={handleCoordLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Nome de usuário"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Senha"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Entrar
            </button>
            <button type="button" onClick={() => navigate("/")} className="w-full text-gray-600 py-2 hover:text-gray-900">
              Voltar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Tab: Teams ──
  const teamsTab = (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Cadastrar Nova Equipe</h2>
        <form onSubmit={handleAddTeam} className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              placeholder="Nome da equipe"
              required
            />
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do projeto</label>
              <input
                type="text"
                value={newTeamDescription}
                onChange={(e) => setNewTeamDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Breve descrição do projeto..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo da equipe</label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) setNewTeamLogo(await resizeImage(file));
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-purple-100 file:text-purple-700 file:font-medium cursor-pointer"
              />
              {newTeamLogo && (
                <img src={newTeamLogo} alt="preview" className="mt-2 w-14 h-14 rounded-lg object-cover border border-gray-200" />
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Equipes Cadastradas ({teams.length})
        </h2>
        {teamsLoading ? (
          <p className="text-gray-500 text-center py-6">Carregando...</p>
        ) : teams.length === 0 ? (
          <p className="text-gray-500 text-center py-6">Nenhuma equipe cadastrada ainda.</p>
        ) : (
          <ul className="space-y-3">
            {teams.map((team) => (
              <li key={team.teamName} className="bg-gray-50 rounded-xl overflow-hidden">
                {editingTeam === team.teamName ? (
                  <div className="p-4 space-y-3">
                    <p className="font-bold text-gray-900">{team.teamName}</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                        <input
                          type="text"
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                          placeholder="Breve descrição do projeto..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Logo da equipe</label>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) setEditForm({ ...editForm, logo: await resizeImage(file) });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-purple-100 file:text-purple-700 file:text-xs file:font-medium cursor-pointer"
                        />
                        {editForm.logo && (
                          <img src={editForm.logo} alt="preview" className="mt-2 w-12 h-12 rounded-lg object-cover border border-gray-200" />
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditingTeam(null)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between p-4 gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {team.logo ? (
                        <img
                          src={team.logo}
                          alt={team.teamName}
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                          <span className="text-purple-600 font-bold text-lg">{team.teamName[0]}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800">{team.teamName}</p>
                        {team.description && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{team.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setEditingTeam(team.teamName); setEditForm({ description: team.description || "", logo: team.logo || "" }); }}
                        className="flex items-center gap-1 px-3 py-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        <Edit2 className="w-4 h-4" /> Editar
                      </button>
                      <button
                        onClick={() => handleRemoveTeam(team.teamName)}
                        className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" /> Remover
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  // ── Tab: Evaluators ──
  const evaluatorsTab = (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Cadastrar Avaliador</h2>
        <form onSubmit={handleAddEvaluator} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome completo</label>
              <input
                type="text"
                value={newEval.name}
                onChange={(e) => setNewEval({ ...newEval, name: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Ex: Maria Silva"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuário</label>
              <input
                type="text"
                value={newEval.username}
                onChange={(e) => setNewEval({ ...newEval, username: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Ex: maria.silva"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <input
                type="password"
                value={newEval.password}
                onChange={(e) => setNewEval({ ...newEval, password: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="Senha"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Cadastrar Avaliador
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Avaliadores Cadastrados ({evaluators.length})
        </h2>
        {evalLoading ? (
          <p className="text-gray-500 text-center py-6">Carregando...</p>
        ) : evaluators.length === 0 ? (
          <p className="text-gray-500 text-center py-6">Nenhum avaliador cadastrado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {evaluators.map((ev) => (
              <li key={ev.username} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-800">{ev.name}</p>
                  <p className="text-sm text-gray-500">@{ev.username}</p>
                </div>
                <button
                  onClick={() => handleRemoveEvaluator(ev.username)}
                  className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" /> Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  // ── Tab: By Evaluator ──
  const byEvaluatorMap: Record<string, EvaluationRecord[]> = {};
  allEvaluations.forEach((ev) => {
    if (!byEvaluatorMap[ev.evaluatorUsername]) byEvaluatorMap[ev.evaluatorUsername] = [];
    byEvaluatorMap[ev.evaluatorUsername].push(ev);
  });

  const byEvaluatorTab = (
    <div className="space-y-4">
      {Object.keys(byEvaluatorMap).length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center text-gray-500">
          Nenhuma avaliação registrada ainda.
        </div>
      ) : (
        Object.entries(byEvaluatorMap).map(([uname, evals]) => {
          const evInfo = evaluators.find((e) => e.username === uname);
          const displayName = evInfo?.name || uname;
          const isExpanded = expandedEvaluator === uname;
          return (
            <div key={uname} className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <button
                onClick={() => setExpandedEvaluator(isExpanded ? null : uname)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">{displayName}</p>
                    <p className="text-sm text-gray-500">
                      @{uname} · {evals.length} equipe(s) avaliada(s)
                    </p>
                  </div>
                </div>
                {isExpanded
                  ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
                  : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {evals.map((ev) => (
                    <div key={ev.teamName} className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-gray-800 text-lg">{ev.teamName}</h3>
                        <span className={`text-lg font-bold ${scoreColorText(avgScores(ev.scores))}`}>
                          Média: {avgScores(ev.scores).toFixed(1)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {CRITERIA.map((cr) => (
                          <div key={cr.id} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">{cr.name}</p>
                            <p className={`text-base font-bold ${scoreColorText(ev.scores[cr.id as keyof Scores])}`}>
                              {ev.scores[cr.id as keyof Scores].toFixed(1)}
                            </p>
                          </div>
                        ))}
                      </div>
                      {ev.comments && (
                        <p className="text-sm text-gray-600 mt-3 italic border-l-2 border-gray-200 pl-3">
                          "{ev.comments}"
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(ev.timestamp).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  // ── Tab: Dashboard ──
  const top3 = ranking.slice(0, 3);
  const chartData = ranking.map((item) => ({
    name: item.teamName,
    nota: parseFloat(item.averageScore.toFixed(2)),
  }));
  const radarData = CRITERIA.map((cr) => {
    const dp: Record<string, any> = { criterion: cr.name.split(" ")[0] };
    ranking.slice(0, 5).forEach((team) => {
      dp[team.teamName] = team.criteriaAverages[cr.id as keyof Scores] || 0;
    });
    return dp;
  });

  const dashboardTab = rankingLoading ? (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600" />
    </div>
  ) : (
    <div className="space-y-6">
      {/* Podium top 3 */}
      {top3.length > 0 && (
        <div className="grid md:grid-cols-3 gap-6">
          {top3.map((item, index) => (
            <div
              key={item.teamName}
              className={`bg-gradient-to-br ${
                index === 0 ? "from-yellow-400 to-yellow-600"
                : index === 1 ? "from-gray-300 to-gray-500"
                : "from-orange-400 to-orange-600"
              } rounded-2xl shadow-xl p-6 text-white`}
            >
              <div className="flex items-center justify-between mb-4">
                <Trophy className="w-10 h-10" />
                <span className="text-5xl font-bold">{index + 1}º</span>
              </div>
              <h3 className="text-2xl font-bold mb-2">{item.teamName}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{item.averageScore.toFixed(2)}</span>
                <span className="text-lg opacity-90">/ 10</span>
              </div>
              <p className="mt-2 opacity-90">{item.evaluationCount} avaliações</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Ranking Geral</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 10]} />
              <YAxis dataKey="name" type="category" width={110} />
              <Tooltip />
              <Bar dataKey="nota" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Desempenho por Critério (Top 5)</h2>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="criterion" />
              <PolarRadiusAxis angle={90} domain={[0, 10]} />
              {ranking.slice(0, 5).map((team, index) => (
                <Radar
                  key={team.teamName}
                  name={team.teamName}
                  dataKey={team.teamName}
                  stroke={["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"][index]}
                  fill={["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"][index]}
                  fillOpacity={0.2}
                />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Estatísticas Gerais</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-semibold mb-1">Total de Equipes</p>
            <p className="text-3xl font-bold text-blue-900">{ranking.length}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-semibold mb-1">Total de Avaliações</p>
            <p className="text-3xl font-bold text-purple-900">
              {ranking.reduce((s, i) => s + i.evaluationCount, 0)}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-semibold mb-1">Média Geral</p>
            <p className="text-3xl font-bold text-green-900">
              {ranking.length > 0
                ? (ranking.reduce((s, i) => s + i.averageScore, 0) / ranking.length).toFixed(2)
                : "0.00"}
            </p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-yellow-600 font-semibold mb-1">Maior Nota</p>
            <p className="text-3xl font-bold text-yellow-900">
              {ranking.length > 0 ? ranking[0].averageScore.toFixed(2) : "0.00"}
            </p>
          </div>
        </div>
      </div>

      {/* Full ranking table */}
      {ranking.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Ranking Completo</h2>
          <div className="space-y-3">
            {ranking.map((item, index) => (
              <div
                key={item.teamName}
                className={`rounded-xl p-5 ${index < 3 ? "border-2 border-yellow-300 bg-yellow-50/30" : "bg-gray-50"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                      index === 0 ? "bg-yellow-100 text-yellow-700"
                      : index === 1 ? "bg-gray-100 text-gray-700"
                      : index === 2 ? "bg-orange-100 text-orange-700"
                      : "bg-blue-50 text-blue-700"
                    }`}>
                      {index + 1}º
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{item.teamName}</p>
                      <p className="text-sm text-gray-500">{item.evaluationCount} avaliações</p>
                    </div>
                  </div>
                  <span className={`text-3xl font-bold ${scoreColorText(item.averageScore)}`}>
                    {item.averageScore.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {CRITERIA.map((cr) => (
                    <div key={cr.id} className="bg-white rounded-lg p-2">
                      <p className="text-xs text-gray-500">{cr.name}</p>
                      <p className={`text-sm font-bold ${scoreColorText(item.criteriaAverages[cr.id as keyof Scores] || 0)}`}>
                        {(item.criteriaAverages[cr.id as keyof Scores] || 0).toFixed(1)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── Tab definitions ──
  const TABS: { id: CoordTab; label: string }[] = [
    { id: "dashboard",    label: "Dashboard" },
    { id: "teams",        label: "Equipes" },
    { id: "evaluators",   label: "Avaliadores" },
    { id: "byEvaluator",  label: "Por Avaliador" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Dashboard de Coordenação</h1>
            <p className="text-gray-600">
              {activeTab === "dashboard" ? "Resultados em tempo real · Atualiza a cada 5s" : ""}
            </p>
          </div>
          <button onClick={() => navigate("/")} className="px-4 py-2 text-gray-600 hover:text-gray-900">
            Voltar
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-8 bg-white rounded-xl p-1 shadow-sm w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                activeTab === tab.id
                  ? "bg-purple-600 text-white shadow"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "dashboard"   && dashboardTab}
        {activeTab === "teams"       && teamsTab}
        {activeTab === "evaluators"  && evaluatorsTab}
        {activeTab === "byEvaluator" && byEvaluatorTab}
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/"           element={<Home />} />
        <Route path="/evaluator"  element={<EvaluatorView />} />
        <Route path="/coordinator" element={<CoordinatorView />} />
      </Routes>
    </BrowserRouter>
  );
}
