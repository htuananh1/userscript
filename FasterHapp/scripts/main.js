import { system, world } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { MSG } from "./messages.js";
import { clamp, formatTimeVN, lerp, normalizeXZ, vectorLength } from "./utils.js";

const serverState = {
  lastTickMs: Date.now(),
  tickDeltaMs: 50,
  stressScore: 0,
  tickCount: 0
};

const ghastState = new Map();
const riderState = new Map();

const pregenState = {
  job: null
};

world.beforeEvents.chatSend.subscribe((event) => {
  const message = event.message.trim();
  if (!message.startsWith("!pregen")) {
    return;
  }

  event.cancel = true;
  const player = event.sender;
  if (!player.hasTag(CONFIG.ADMIN_TAG)) {
    player.sendMessage(MSG.error(MSG.NO_PERMISSION));
    return;
  }

  const args = message.split(/\s+/).slice(1);
  const subcommand = (args[0] ?? "").toLowerCase();
  if (!subcommand || subcommand === "help") {
    player.sendMessage(MSG.info(MSG.HELP));
    return;
  }

  if (subcommand === "stop") {
    stopPregen(player);
    return;
  }

  if (subcommand === "status") {
    reportPregenStatus(player);
    return;
  }

  if (subcommand === "corridor") {
    startPregen(player, args.slice(1));
    return;
  }

  player.sendMessage(MSG.warn(MSG.HELP));
});

system.runInterval(() => {
  const now = Date.now();
  const dtMs = now - serverState.lastTickMs;
  serverState.lastTickMs = now;
  serverState.tickDeltaMs = dtMs;
  serverState.tickCount += 1;

  if (serverState.tickCount % CONFIG.STRESS_EVAL_INTERVAL_TICKS === 0) {
    updateStressScore(dtMs / 1000);
  }

  if (serverState.tickCount % CONFIG.MOVEMENT_EVAL_INTERVAL_TICKS === 0) {
    applySoftThrottle();
  }

  tickPregen();
}, 1);

function updateStressScore(dtSeconds) {
  const tickOver = (dtSeconds - CONFIG.TARGET_TICK_SECONDS) / CONFIG.TARGET_TICK_SECONDS;
  const sample = clamp(tickOver, 0, 1.5);
  serverState.stressScore = clamp(
    serverState.stressScore * (1 - CONFIG.STRESS_EMA_ALPHA) + sample * CONFIG.STRESS_EMA_ALPHA,
    0,
    1
  );
}

function applySoftThrottle() {
  const dimension = world.getDimension("overworld");
  const ghasts = dimension.getEntities({ type: "minecraft:happy_ghast" });

  for (const ghast of ghasts) {
    const rideable = ghast.getComponent("minecraft:rideable");
    if (!rideable) {
      ghastState.delete(ghast.id);
      continue;
    }

    const riders = rideable.getRiders();
    if (!riders || riders.length === 0) {
      ghastState.delete(ghast.id);
      continue;
    }

    for (const rider of riders) {
      riderState.set(rider.id, { lastSeenTick: serverState.tickCount });
    }

    const velocity = ghast.getVelocity();
    const speed = vectorLength(velocity);
    const state = ghastState.get(ghast.id) ?? {
      lastSpeed: speed,
      cooldownTicks: 0
    };

    const stressFactor = clamp(
      (serverState.stressScore - CONFIG.STRESS_THRESHOLD) / (1 - CONFIG.STRESS_THRESHOLD),
      0,
      1
    );

    if (stressFactor > 0 && state.cooldownTicks <= 0) {
      state.cooldownTicks = CONFIG.COOLDOWN_TICKS;
    }

    if (state.cooldownTicks > 0) {
      state.cooldownTicks -= 1;
    }

    if (state.cooldownTicks > 0 && speed > 0.001) {
      const maxSpeed = CONFIG.TARGET_SPEED_BPS + CONFIG.MAX_SPEED_BURST * (1 - stressFactor);
      const limitedSpeed = Math.min(speed, maxSpeed);
      const maxAccel = lerp(
        CONFIG.MAX_ACCEL_PER_TICK_NORMAL,
        CONFIG.MAX_ACCEL_PER_TICK_STRESSED,
        stressFactor
      );

      const speedDelta = limitedSpeed - state.lastSpeed;
      const targetSpeed =
        Math.abs(speedDelta) > maxAccel
          ? state.lastSpeed + Math.sign(speedDelta) * maxAccel
          : limitedSpeed;

      if (Math.abs(targetSpeed - speed) > 0.0001) {
        const scale = targetSpeed / speed;
        const desired = {
          x: velocity.x * scale,
          y: velocity.y * scale,
          z: velocity.z * scale
        };
        const impulse = {
          x: desired.x - velocity.x,
          y: desired.y - velocity.y,
          z: desired.z - velocity.z
        };
        ghast.applyImpulse(impulse);
      }

      state.lastSpeed = targetSpeed;
    } else {
      state.lastSpeed = speed;
    }

    ghastState.set(ghast.id, state);
  }
}

function startPregen(player, args) {
  if (pregenState.job) {
    player.sendMessage(MSG.warn(MSG.PREGEN_ALREADY_RUNNING));
    return;
  }

  const length = parseNumber(args[0], CONFIG.PREGEN.DEFAULT_LENGTH_BLOCKS);
  const width = parseNumber(args[1], CONFIG.PREGEN.DEFAULT_WIDTH_BLOCKS);
  const step = parseNumber(args[2], CONFIG.PREGEN.DEFAULT_STEP_BLOCKS);
  const maxPerTick = parseNumber(args[3], CONFIG.PREGEN.MAX_CHUNKS_PER_TICK);

  const direction = normalizeXZ(player.getViewDirection());
  const origin = {
    x: Math.floor(player.location.x),
    y: Math.floor(player.location.y),
    z: Math.floor(player.location.z)
  };

  const widthSteps = Math.max(1, Math.floor(width / step) + 1);
  const lengthSteps = Math.max(1, Math.floor(length / step) + 1);
  const total = widthSteps * lengthSteps;

  pregenState.job = {
    ownerName: player.name,
    ownerId: player.id,
    dimensionId: player.dimension.id,
    origin,
    direction,
    widthSteps,
    lengthSteps,
    widthCenterIndex: (widthSteps - 1) / 2,
    step,
    maxPerTick,
    index: 0,
    total,
    paused: false,
    lastLogPercent: -1,
    areaName: `fh_pregen_${player.name.replace(/\W/g, "").slice(0, 8)}`
  };

  player.sendMessage(MSG.info(MSG.PREGEN_START(length, width, step, maxPerTick)));
}

function stopPregen(player) {
  if (!pregenState.job) {
    player.sendMessage(MSG.warn(MSG.PREGEN_NONE));
    return;
  }

  const job = pregenState.job;
  removeTickingArea(job);
  pregenState.job = null;
  player.sendMessage(MSG.info(MSG.PREGEN_STOPPED));
}

function reportPregenStatus(player) {
  if (!pregenState.job) {
    player.sendMessage(MSG.warn(MSG.PREGEN_NONE));
    return;
  }

  const job = pregenState.job;
  const percent = Math.floor((job.index / job.total) * 100);
  player.sendMessage(MSG.info(MSG.PREGEN_STATUS(percent, job.index, job.total)));
}

function tickPregen() {
  const job = pregenState.job;
  if (!job) {
    return;
  }

  if (serverState.tickDeltaMs > CONFIG.PREGEN.PAUSE_TICK_DELTA_MS) {
    if (!job.paused) {
      job.paused = true;
      notifyOwner(job, MSG.warn(`${MSG.PREGEN_PAUSED} (${formatTimeVN()})`));
    }
    return;
  }

  if (job.paused) {
    job.paused = false;
    notifyOwner(job, MSG.info(`${MSG.PREGEN_RESUMED} (${formatTimeVN()})`));
  }

  for (let i = 0; i < job.maxPerTick && job.index < job.total; i += 1) {
    const position = getPregenPosition(job, job.index);
    pulseTickingArea(job, position);
    job.index += 1;
  }

  logProgress(job);

  if (job.index >= job.total) {
    notifyOwner(job, MSG.info(MSG.PREGEN_DONE));
    removeTickingArea(job);
    pregenState.job = null;
  }
}

function getPregenPosition(job, index) {
  const lengthIndex = Math.floor(index / job.widthSteps);
  const widthIndex = index % job.widthSteps;
  const forward = lengthIndex * job.step;
  const lateral = (widthIndex - job.widthCenterIndex) * job.step;
  const lateralDir = { x: -job.direction.z, y: 0, z: job.direction.x };

  return {
    x: job.origin.x + job.direction.x * forward + lateralDir.x * lateral,
    y: job.origin.y,
    z: job.origin.z + job.direction.z * forward + lateralDir.z * lateral
  };
}

function pulseTickingArea(job, position) {
  const dimension = world.getDimension(job.dimensionId);
  const x = Math.floor(position.x);
  const z = Math.floor(position.z);

  void dimension.runCommandAsync(`tickingarea remove ${job.areaName}`);
  void dimension.runCommandAsync(
    `tickingarea add circle ${x} 0 ${z} ${CONFIG.PREGEN.TICKING_RADIUS} ${job.areaName}`
  );

  dimension.getBlock({ x, y: CONFIG.PREGEN.SAMPLE_Y, z });
}

function removeTickingArea(job) {
  const dimension = world.getDimension(job.dimensionId);
  void dimension.runCommandAsync(`tickingarea remove ${job.areaName}`);
}

function logProgress(job) {
  const percent = Math.floor((job.index / job.total) * 100);
  if (percent <= job.lastLogPercent || percent % CONFIG.PREGEN.LOG_EVERY_PERCENT !== 0) {
    return;
  }

  job.lastLogPercent = percent;
  notifyOwner(job, MSG.info(MSG.PREGEN_STATUS(percent, job.index, job.total)));
}

function notifyOwner(job, message) {
  const player = world.getPlayers().find((candidate) => candidate.id === job.ownerId);
  if (player) {
    player.sendMessage(message);
  }
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
