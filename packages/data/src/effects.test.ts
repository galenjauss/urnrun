import { describe, expect, it } from "vitest";
import { deriveEffects } from "./effects";

describe("deriveEffects", () => {
  it("maps property keys to effect tags", () => {
    expect(deriveEffects(["StunDuration", "AbilityCooldown"])).toEqual(["stun"]);
    expect(deriveEffects(["SilenceDuration", "SlowPercent", "HealAmount"])).toEqual([
      "heal",
      "silence",
      "slow",
    ]);
    expect(deriveEffects(["ImmobilizeDuration", "BarrierAmount", "InvisDuration"])).toEqual([
      "barrier",
      "immobilize",
      "invisibility",
    ]);
  });

  it("returns an empty list for generic properties", () => {
    expect(deriveEffects(["AbilityCooldown", "AbilityCastRange"])).toEqual([]);
  });

  it("ignores look-alike and self/resistance keys", () => {
    expect(
      deriveEffects([
        "BonusHealth",
        "MaxHealthDamage",
        "HealAmpReceivePenaltyPercent",
        "SlowResistance",
        "ChannelSlowPercent",
        "ReduceStunOnEnemyHitPercent",
        "StunDurationSelf",
        "BonusDamageVsBarrier",
      ]),
    ).toEqual([]);
  });

  it("dedupes", () => {
    expect(deriveEffects(["StunDuration", "StunRadius"])).toEqual(["stun"]);
  });
});
