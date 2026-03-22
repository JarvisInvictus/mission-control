#!/usr/bin/env node
/**
 * push.mjs — Runs on the Mac mini every 60s.
 * Reads OpenClaw state, POSTs to Vercel API which writes to Upstash Redis.
 */

import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const SESSIONS_FILE = "/Users/jarvisbot/.openclaw/agents/main/sessions/sessions.json";
const CONFIG_FILE = "/Users/jarvisbot/.openclaw/openclaw.json";
const BUSINESS_FILE = "/Users/jarvisbot/.openclaw/workspace/mission-control/data/business.json";
const OPENCLAW_BIN = "/opt/homebrew/bin/openclaw";
const GATEWAY_URL = "http://127.0.0.1:18789";

const PUSH_SECRET = process.env.PUSH_SECRET ?? "inv-mc-push-2026";
const VERCEL_URL = process.env.VERCEL_URL ?? "https://mission-control-gray-rho.vercel.app";

function getProcessUptime() {
  try {
    const uptime = execSync("sysctl -n kern.boottime 2>/dev/null").toString().trim();
    // kern.boottime returns { sec = 1234567890, ... }
    const match = uptime.match(/sec = (\d+)/);
    if (match) {
      const bootSec = parseInt(match[1], 10);
      const bootMs = bootSec * 1000;
      const nowMs = Date.now();
      const diffMs = nowMs - bootMs;
      const diffMin = Math.round(diffMs / 60000);
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      return `${hours}h ${mins}m`;
    }
  } catch {}
  return "—";
}

function readJsonFile(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function getGatewayHealth() {
  try {
    const res = execSync(`curl -s --max-time 3 "${GATEWAY_URL}/health" 2>/dev/null`);
    return JSON.parse(res.toString());
  } catch {
    return null;
  }
}

function getCronJobs() {
  try {
    const out = execSync(`${OPENCLAW_BIN} cron list --json 2>/dev/null`);
    const text = out.toString().trim();
    if (!text) return [];
    const parsed = JSON.parse(text);
    // May be an array or { crons: [...] } or { jobs: [...] }
    if (Array.isArray(parsed)) return parsed;
    if (parsed.crons && Array.isArray(parsed.crons)) return parsed.crons;
    if (parsed.jobs && Array.isArray(parsed.jobs)) return parsed.jobs;
    return [];
  } catch {
    return [];
  }
}

function getModelOverride() {
  try {
    const out = execSync(`${OPENCLAW_BIN} models active 2>/dev/null`);
    return out.toString().trim().split("\n")[0]?.replace(/\s+/g, " ") || null;
  } catch {
    return null;
  }
}

function getSubagents(sessions) {
  const subagents = [];
  if (!sessions) return subagents;

  for (const [key, val] of Object.entries(sessions)) {
    if (!key.startsWith("agent:main:subagent:")) continue;
    const session = val;
    subagents.push({
      id: key,
      task: session.task || session.description || "Subagent task",
      model: session.model || "unknown",
      status: session.active ? "active" : "completed",
      startedAt: session.createdAt || session.updatedAt || new Date().toISOString(),
      completedAt: session.active ? null : (session.updatedAt || new Date().toISOString()),
      parentSession: "agent:main:main",
    });
  }

  // Sort: active first, then by startedAt desc
  subagents.sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (a.status !== "active" && b.status === "active") return 1;
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });

  return subagents.slice(0, 10);
}

function buildPayload() {
  const sessions = readJsonFile(SESSIONS_FILE);
  const config = readJsonFile(CONFIG_FILE);
  const health = getGatewayHealth();
  const cronJobs = getCronJobs();

  // Find main session (agent:main:main)
  const mainSession = sessions?.["agent:main:main"];
  const lastActivity = mainSession?.updatedAt || new Date().toISOString();

  // Build cron entries with parsed labels
  const cron = cronJobs.map((job) => {
    let scheduleLabel = job.schedule || job.name || "Unknown";
    // Generate label from cron expression
    if (job.schedule) {
      if (job.schedule.startsWith("*/")) {
        const mins = job.schedule.match(/^\*\/(\d+)/)?.[1];
        scheduleLabel = `Every ${mins}m`;
      } else if (job.schedule === "0 * * * *") {
        scheduleLabel = "Hourly";
      } else if (job.schedule === "0 9 * * *") {
        scheduleLabel = "Daily at 09:00";
      } else if (job.schedule === "*/30 * * * *") {
        scheduleLabel = "Every 30 min";
      }
    }

    return {
      id: job.id || job.name || Math.random().toString(36),
      name: job.name || "Cron job",
      schedule: job.schedule || "",
      scheduleLabel,
      lastRun: job.lastRun || null,
      nextRun: job.nextRun || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      status: job.status || "ok",
    };
  });

  // Determine agent status from gateway health
  const agentStatus = health?.status === "live" || health?.ok === true ? "idle" : "alert";

  // Heartbeat: look for a heartbeat cron job to derive last/next run
  const heartbeatJob = cronJobs.find((j) => j.id === "heartbeat" || j.name?.toLowerCase().includes("heartbeat"));
  const heartbeatLast = heartbeatJob?.lastRun
    ? new Date(heartbeatJob.lastRun)
    : (mainSession?.updatedAt ? new Date(mainSession.updatedAt) : new Date());
  const heartbeatNext = new Date(heartbeatLast.getTime() + 30 * 60 * 1000);

  // Agent model: check config first, then sessions
  let model = config?.model || config?.defaults?.model || "anthropic/claude-sonnet-4-6";
  if (mainSession?.model) model = mainSession.model;

  // Subagents
  const subagents = getSubagents(sessions);

  const business = readJsonFile(BUSINESS_FILE);

  return {
    business: business || undefined,
    agent: {
      name: "Jarvis",
      status: agentStatus,
      model,
      session: "agent:main:main",
      lastActivity,
      uptime: getProcessUptime(),
    },
    heartbeat: {
      lastRun: heartbeatLast.toISOString(),
      nextRun: heartbeatNext.toISOString(),
      status: health?.ok === false ? "alert" : "ok",
      intervalMinutes: 30,
    },
    cron,
    subagents,
    pushedAt: new Date().toISOString(),
  };
}

async function push() {
  const payload = buildPayload();
  const url = `${VERCEL_URL}/api/push`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PUSH_SECRET}`,
      },
      body: JSON.stringify({ secret: PUSH_SECRET, data: payload }),
    });

    const json = await res.json();
    if (res.ok && json.ok) {
      console.log(`[${new Date().toISOString()}] Push OK — pushedAt: ${payload.pushedAt}`);
    } else {
      console.error(`[${new Date().toISOString()}] Push FAILED:`, json);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Push ERROR:`, err.message);
  }
}

push();
