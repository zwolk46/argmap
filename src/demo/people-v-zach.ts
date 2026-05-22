/**
 * People v. Zach — Grand Larceny in the Second Degree (NY Penal Law § 155.40).
 *
 * Demo frame built from a logical decomposition of NY PL § 155.40 (charge),
 * § 155.05(1) ("steals property"), § 155.00 (definitions), § 155.20 (value),
 * and § 155.15 (claim-of-right defense). It is shared between
 * `scripts/build-people-v-zach.ts` (the gap-finder validator) and the dev-only
 * "Seed demo frame" affordance on the Home page so the two stay byte-identical.
 *
 * Note 1 of the source spec (Stream C runtime gap — UNLESS gates do not yet
 * project boolean not_satisfied through the status_map) means this frame
 * cannot fully resolve to either Conclusion under the current runtime. The
 * frame structure itself, however, validates cleanly against the F-031
 * schema/validation amendment.
 */

import type {
  Frame,
  FrameVersion,
  Node,
  Edge,
  RootQuestion,
  SubQuestion,
  Term,
  Interpretation,
  Checkpoint,
  Conclusion,
  OrGate,
  UnlessGate,
  CheckpointOption,
  BurdenLevel,
} from "@/schema";

export interface BuildPeopleVZachOpts {
  /** ISO-8601 timestamp stamped onto every node/edge. */
  now: string;
  /** UUID-v4 source. */
  generateId: () => string;
  /** Created-by stamp (e.g., signed-in user's id). Optional. */
  user_id?: string;
}

export const PEOPLE_V_ZACH_TITLE = "People v. Zach — Grand Larceny 2° (NY PL § 155.40)";

const CRIM: BurdenLevel = "beyond_reasonable_doubt";

export interface BuildPeopleVZachResult {
  frame: Frame;
  frame_version: FrameVersion;
  /** role tag → persisted UUID, useful for downstream tooling/tests. */
  role_to_id: Readonly<Record<string, string>>;
}

export function buildPeopleVZach(opts: BuildPeopleVZachOpts): BuildPeopleVZachResult {
  const { now, generateId, user_id } = opts;

  // Map role tags to freshly generated UUIDs so each seed yields a distinct
  // frame in the user's account (no collision if seeded twice).
  const ROLES = [
    "frame",
    "version",
    "n-root",
    "g-charge",
    "sq-offense",
    "sq-steal",
    "sq-value",
    "sq-extortion",
    "sq-retail",
    "g-intent",
    "g-act",
    "g-aggregator",
    "g-fear",
    "t-deprive",
    "t-appropriate",
    "t-property",
    "t-owner",
    "t-value",
    "i-deprive-permanent",
    "i-deprive-dispose",
    "i-appropriate-control",
    "i-appropriate-dispose",
    "i-property-statutory",
    "i-property-narrow",
    "i-owner-superior",
    "i-owner-title",
    "i-value-market",
    "i-value-replacement",
    "cp-intent-deprive",
    "cp-intent-appropriate",
    "cp-takes",
    "cp-obtains",
    "cp-withholds",
    "cp-property",
    "cp-owner",
    "cp-value",
    "cp-obtained-by-extortion",
    "cp-fear-injury",
    "cp-fear-damage",
    "cp-fear-public-servant",
    "cp-common-scheme",
    "cp-value-aggregate",
    "cp-deed",
    "cp-claim-of-right",
    "c-guilty",
    "c-not-guilty",
  ] as const;
  const id_for: Record<(typeof ROLES)[number], string> = {} as Record<
    (typeof ROLES)[number],
    string
  >;
  for (const r of ROLES) id_for[r] = generateId();

  function nb(role: (typeof ROLES)[number]) {
    return {
      id: id_for[role],
      created_at: now,
      updated_at: now,
      ...(user_id ? { created_by: user_id } : {}),
    };
  }

  function root(role: "n-root", statement: string): RootQuestion {
    return { ...nb(role), type: "RootQuestion", layer: "frame", statement };
  }
  function subQ(role: keyof typeof id_for, statement: string): SubQuestion {
    return {
      ...nb(role as (typeof ROLES)[number]),
      type: "SubQuestion",
      layer: "frame",
      statement,
      is_jurisdictional: false,
    };
  }
  function term(role: keyof typeof id_for, name: string, order: number): Term {
    return {
      ...nb(role as (typeof ROLES)[number]),
      type: "Term",
      layer: "frame",
      name,
      order,
      dispositive: false,
    };
  }
  function interp(role: keyof typeof id_for, statement: string, notes?: string): Interpretation {
    return {
      ...nb(role as (typeof ROLES)[number]),
      type: "Interpretation",
      layer: "frame",
      statement,
      ...(notes ? { notes } : {}),
    };
  }
  function conclusion(
    role: keyof typeof id_for,
    statement: string,
    value: "favors_plaintiff" | "favors_defendant",
  ): Conclusion {
    return {
      ...nb(role as (typeof ROLES)[number]),
      type: "Conclusion",
      layer: "frame",
      statement,
      direction: { kind: "legal", value },
    };
  }
  function orGate(role: keyof typeof id_for, input_roles: string[], out_role?: string): OrGate {
    return {
      ...nb(role as (typeof ROLES)[number]),
      type: "LogicalGate",
      layer: "frame",
      gate_type: "OR",
      inputs: input_roles.map((r) => id_for[r as (typeof ROLES)[number]]),
      ...(out_role ? { output_target: id_for[out_role as (typeof ROLES)[number]] } : {}),
    };
  }
  function unlessGate(
    role: keyof typeof id_for,
    main_role: string,
    exception_role: string,
    out_role?: string,
  ): UnlessGate {
    return {
      ...nb(role as (typeof ROLES)[number]),
      type: "LogicalGate",
      layer: "frame",
      gate_type: "UNLESS",
      main: id_for[main_role as (typeof ROLES)[number]],
      exception: id_for[exception_role as (typeof ROLES)[number]],
      ...(out_role ? { output_target: id_for[out_role as (typeof ROLES)[number]] } : {}),
    };
  }

  interface CpOpt {
    suffix: string;
    label: string;
    satisfies: boolean;
    target_role?: string;
    routes_to?: "contested";
  }
  function checkpointFromOpts(
    role: keyof typeof id_for,
    question: string,
    answer_type: "boolean" | "multiple_choice" | "graded",
    opts: CpOpt[],
    extras?: { requires_authority?: boolean; burden_level?: BurdenLevel },
  ): Checkpoint {
    return {
      ...nb(role as (typeof ROLES)[number]),
      type: "Checkpoint",
      layer: "frame",
      question,
      answer_type,
      options: opts.map((o): CheckpointOption => {
        const opt: CheckpointOption = {
          id: `${id_for[role as (typeof ROLES)[number]]}-${o.suffix}`,
          label: o.label,
          satisfies: o.satisfies,
        };
        if (o.target_role) {
          opt.target_node_id = id_for[o.target_role as (typeof ROLES)[number]];
        }
        if (o.routes_to) opt.routes_to_status = o.routes_to;
        return opt;
      }),
      requires_premise: true,
      requires_authority: extras?.requires_authority ?? false,
      ...(extras?.burden_level ? { burden_level: extras.burden_level } : {}),
    };
  }

  function boolCP(
    role: keyof typeof id_for,
    question: string,
    extras?: { requires_authority?: boolean; burden_level?: BurdenLevel },
  ): Checkpoint {
    return checkpointFromOpts(
      role,
      question,
      "boolean",
      [
        { suffix: "yes", label: "Yes", satisfies: true, target_role: "c-guilty" },
        { suffix: "no", label: "No", satisfies: false, target_role: "c-not-guilty" },
      ],
      extras,
    );
  }

  // ===== Conclusions =====
  const cGuilty = conclusion(
    "c-guilty",
    "Zach is guilty of grand larceny in the second degree (§ 155.40).",
    "favors_plaintiff",
  );
  const cNotGuilty = conclusion(
    "c-not-guilty",
    "Zach is not guilty of grand larceny in the second degree.",
    "favors_defendant",
  );

  // ===== Top of the tree =====
  const nRoot = root(
    "n-root",
    "Is Zach guilty of grand larceny in the second degree (NY Penal Law § 155.40)?",
  );
  // UNLESS gate at top — main path: offense established; exception: claim-of-right.
  const gCharge = unlessGate("g-charge", "sq-offense", "cp-claim-of-right", "c-guilty");

  // sq-offense AND of sq-steal + g-aggregator (we model as an implicit AND
  // via sq-offense.all_children_resolved — no separate AND gate needed).
  const sqOffense = subQ("sq-offense", "Are all elements of grand larceny 2° established?");

  // ===== sq-steal subtree =====
  const sqSteal = subQ("sq-steal", 'Did Zach "steal property" within the meaning of § 155.05(1)?');

  const tDeprive = term("t-deprive", '"deprive" (§ 155.00[3])', 0);
  const iDeprivePermanent = interp(
    "i-deprive-permanent",
    "Withhold permanently / so extended that the major portion of economic value is lost to the owner.",
    "§ 155.00[3](a)",
  );
  const iDepriveDispose = interp(
    "i-deprive-dispose",
    "Dispose of it so an owner is unlikely to recover it.",
    "§ 155.00[3](b)",
  );
  const tAppropriate = term("t-appropriate", '"appropriate" (§ 155.00[4])', 1);
  const iAppropriateControl = interp(
    "i-appropriate-control",
    "Exercise control to acquire the major portion of economic value/benefit.",
    "§ 155.00[4](a)",
  );
  const iAppropriateDispose = interp(
    "i-appropriate-dispose",
    "Dispose of the property for the benefit of oneself or a third person.",
    "§ 155.00[4](b)",
  );
  const tProperty = term("t-property", '"property" (§ 155.00[1])', 2);
  const iPropertyStatutory = interp(
    "i-property-statutory",
    "Money, personal/real property, computer data or program, thing in action, evidence of debt, or any article/substance/thing of value.",
    "§ 155.00[1]",
  );
  const iPropertyAlt = interp(
    "i-property-narrow",
    "Tangible movables only — items that can be physically taken and carried away.",
    "Defense-favored construction; not the statutory definition.",
  );
  const tOwner = term("t-owner", '"owner" (§ 155.00[5])', 3);
  const iOwnerSuperior = interp(
    "i-owner-superior",
    "Any person with a right to possession superior to that of the taker.",
    "§ 155.00[5]",
  );
  const iOwnerTitle = interp(
    "i-owner-title",
    "Only the holder of legal title (narrower construction).",
    "Alternative reading; not adopted in NY.",
  );

  const cpIntentDeprive = boolCP(
    "cp-intent-deprive",
    "Did Zach act with intent to deprive an owner of the property? (§ 155.00[3])",
    { burden_level: CRIM },
  );
  const cpIntentAppropriate = boolCP(
    "cp-intent-appropriate",
    "Did Zach act with intent to appropriate the property? (§ 155.00[4])",
    { burden_level: CRIM },
  );
  const cpTakes = boolCP("cp-takes", "Did Zach wrongfully TAKE the property?", {
    burden_level: CRIM,
  });
  const cpObtains = boolCP("cp-obtains", "Did Zach wrongfully OBTAIN the property?", {
    burden_level: CRIM,
  });
  const cpWithholds = boolCP("cp-withholds", "Did Zach wrongfully WITHHOLD the property?", {
    burden_level: CRIM,
  });
  const cpProperty = boolCP("cp-property", 'Was the thing taken "property" within § 155.00(1)?', {
    burden_level: CRIM,
    requires_authority: true,
  });
  const cpOwner = boolCP(
    "cp-owner",
    'Was the property taken from an "owner" — someone with a possessory right superior to Zach\'s? (§ 155.00[5])',
    { burden_level: CRIM, requires_authority: true },
  );

  const gIntent = orGate("g-intent", ["cp-intent-deprive", "cp-intent-appropriate"]);
  const gAct = orGate("g-act", ["cp-takes", "cp-obtains", "cp-withholds"]);

  // ===== Aggregator subtree =====
  const tValue = term("t-value", '"value" (§ 155.20)', 4);
  const iValueMarket = interp(
    "i-value-market",
    "Market value at the time and place of the crime.",
    "§ 155.20(1)",
  );
  const iValueReplacement = interp(
    "i-value-replacement",
    "If market value cannot be ascertained, replacement cost within a reasonable time.",
    "§ 155.20(4)",
  );

  const sqValue = subQ("sq-value", "Did the value of the property exceed $50,000? (§ 155.40[1])");
  const cpValue = boolCP(
    "cp-value",
    "Did the value of the property exceed $50,000? (§ 155.40[1])",
    { burden_level: CRIM },
  );

  const sqExtortion = subQ(
    "sq-extortion",
    "Was the property obtained by qualifying extortion? (§ 155.40[2])",
  );
  const cpObtainedByExtortion = boolCP(
    "cp-obtained-by-extortion",
    "Was the property obtained by extortion (§ 155.05[2][e])?",
    { burden_level: CRIM, requires_authority: true },
  );
  const cpFearInjury = boolCP(
    "cp-fear-injury",
    "Was the extortion committed by instilling fear of future physical injury to a person?",
    { burden_level: CRIM },
  );
  const cpFearDamage = boolCP(
    "cp-fear-damage",
    "Was the extortion committed by instilling fear of damage to property?",
    { burden_level: CRIM },
  );
  const cpFearPublicServant = boolCP(
    "cp-fear-public-servant",
    "Was the extortion committed by instilling fear of abuse of a public-servant position?",
    { burden_level: CRIM },
  );
  const gFear = orGate("g-fear", ["cp-fear-injury", "cp-fear-damage", "cp-fear-public-servant"]);

  const sqRetail = subQ(
    "sq-retail",
    "Were retail goods stolen by common scheme with aggregate value over $50,000? (§ 155.40[3])",
  );
  const cpCommonScheme = boolCP(
    "cp-common-scheme",
    "Were the goods retail merchandise stolen pursuant to a common scheme / single ongoing intent? (§ 155.40[3])",
    { burden_level: CRIM },
  );
  const cpValueAggregate = boolCP(
    "cp-value-aggregate",
    "Does the aggregate value of the retail goods exceed $50,000?",
    { burden_level: CRIM },
  );

  // 155.40(3)[deed] — multiple_choice. Each satisfying option routes to
  // c-guilty; "None of these" routes to c-not-guilty.
  const cpDeed = checkpointFromOpts(
    "cp-deed",
    "Did Zach commit deed theft of qualifying real property? (§ 155.40[3])",
    "multiple_choice",
    [
      {
        suffix: "residential",
        label: "Yes — one residential real property",
        satisfies: true,
        target_role: "c-guilty",
      },
      {
        suffix: "mixed-use",
        label: "Yes — one mixed-use property with ≥1 residential unit",
        satisfies: true,
        target_role: "c-guilty",
      },
      {
        suffix: "commercial",
        label: "Yes — two or more commercial properties",
        satisfies: true,
        target_role: "c-guilty",
      },
      {
        suffix: "none",
        label: "None of these",
        satisfies: false,
        target_role: "c-not-guilty",
      },
    ],
    { burden_level: CRIM, requires_authority: true },
  );

  const gAggregator: OrGate = orGate("g-aggregator", [
    "sq-value",
    "sq-extortion",
    "sq-retail",
    "cp-deed",
  ]);

  // Claim-of-right defense — graded.
  const cpClaimOfRight = checkpointFromOpts(
    "cp-claim-of-right",
    "Did Zach have a good-faith claim of right to the property? (§ 155.15)",
    "graded",
    [
      { suffix: "met", label: "Met", satisfies: true, target_role: "c-not-guilty" },
      { suffix: "unclear", label: "Unclear", satisfies: false, routes_to: "contested" },
      { suffix: "not-met", label: "Not met", satisfies: false, target_role: "c-guilty" },
    ],
    { burden_level: CRIM, requires_authority: true },
  );

  const nodes: Node[] = [
    nRoot,
    gCharge,
    sqOffense,
    sqSteal,
    sqValue,
    sqExtortion,
    sqRetail,
    gIntent,
    gAct,
    gAggregator,
    gFear,
    tDeprive,
    tAppropriate,
    tProperty,
    tOwner,
    tValue,
    iDeprivePermanent,
    iDepriveDispose,
    iAppropriateControl,
    iAppropriateDispose,
    iPropertyStatutory,
    iPropertyAlt,
    iOwnerSuperior,
    iOwnerTitle,
    iValueMarket,
    iValueReplacement,
    cpIntentDeprive,
    cpIntentAppropriate,
    cpTakes,
    cpObtains,
    cpWithholds,
    cpProperty,
    cpOwner,
    cpValue,
    cpObtainedByExtortion,
    cpFearInjury,
    cpFearDamage,
    cpFearPublicServant,
    cpCommonScheme,
    cpValueAggregate,
    cpDeed,
    cpClaimOfRight,
    cGuilty,
    cNotGuilty,
  ];

  function edgeOf(type: Edge["type"], source_role: string, target_role: string): Edge {
    return {
      id: generateId(),
      type,
      source: id_for[source_role as (typeof ROLES)[number]],
      target: id_for[target_role as (typeof ROLES)[number]],
      layer: "frame",
      created_at: now,
      updated_at: now,
    } as Edge;
  }

  const edges: Edge[] = [
    edgeOf("DECOMPOSES_INTO", "n-root", "g-charge"),
    edgeOf("DECOMPOSES_INTO", "sq-offense", "sq-steal"),
    edgeOf("DECOMPOSES_INTO", "sq-offense", "g-aggregator"),
    edgeOf("DECOMPOSES_INTO", "sq-steal", "g-intent"),
    edgeOf("DECOMPOSES_INTO", "sq-steal", "g-act"),
    edgeOf("DECOMPOSES_INTO", "sq-steal", "cp-property"),
    edgeOf("DECOMPOSES_INTO", "sq-steal", "cp-owner"),

    edgeOf("TURNS_ON", "sq-steal", "t-deprive"),
    edgeOf("TURNS_ON", "sq-steal", "t-appropriate"),
    edgeOf("TURNS_ON", "sq-steal", "t-property"),
    edgeOf("TURNS_ON", "sq-steal", "t-owner"),

    edgeOf("INTERPRETED_AS", "t-deprive", "i-deprive-permanent"),
    edgeOf("INTERPRETED_AS", "t-deprive", "i-deprive-dispose"),
    edgeOf("INTERPRETED_AS", "t-appropriate", "i-appropriate-control"),
    edgeOf("INTERPRETED_AS", "t-appropriate", "i-appropriate-dispose"),
    edgeOf("INTERPRETED_AS", "t-property", "i-property-statutory"),
    edgeOf("INTERPRETED_AS", "t-property", "i-property-narrow"),
    edgeOf("INTERPRETED_AS", "t-owner", "i-owner-superior"),
    edgeOf("INTERPRETED_AS", "t-owner", "i-owner-title"),

    edgeOf("LEADS_TO", "i-deprive-permanent", "cp-intent-deprive"),
    edgeOf("LEADS_TO", "i-deprive-dispose", "cp-intent-deprive"),
    edgeOf("LEADS_TO", "i-appropriate-control", "cp-intent-appropriate"),
    edgeOf("LEADS_TO", "i-appropriate-dispose", "cp-intent-appropriate"),
    edgeOf("LEADS_TO", "i-property-statutory", "cp-property"),
    edgeOf("LEADS_TO", "i-property-narrow", "cp-property"),
    edgeOf("LEADS_TO", "i-owner-superior", "cp-owner"),
    edgeOf("LEADS_TO", "i-owner-title", "cp-owner"),

    edgeOf("DECOMPOSES_INTO", "sq-value", "cp-value"),
    edgeOf("TURNS_ON", "sq-value", "t-value"),
    edgeOf("INTERPRETED_AS", "t-value", "i-value-market"),
    edgeOf("INTERPRETED_AS", "t-value", "i-value-replacement"),
    edgeOf("LEADS_TO", "i-value-market", "cp-value"),
    edgeOf("LEADS_TO", "i-value-replacement", "cp-value"),

    edgeOf("DECOMPOSES_INTO", "sq-extortion", "cp-obtained-by-extortion"),
    edgeOf("DECOMPOSES_INTO", "sq-extortion", "g-fear"),

    edgeOf("DECOMPOSES_INTO", "sq-retail", "cp-common-scheme"),
    edgeOf("DECOMPOSES_INTO", "sq-retail", "cp-value-aggregate"),
  ];

  const frame: Frame = {
    id: id_for["frame"],
    title: PEOPLE_V_ZACH_TITLE,
    description:
      "Demo frame instantiating the spec'd decomposition of NY Penal Law § 155.40 (Grand Larceny 2°). Includes definitions (§ 155.00, § 155.20), the qualifying-aggravator branches, and the § 155.15 claim-of-right defense.",
    mode: "legal",
    jurisdiction_default: { level: "state", region: "New York" },
    default_satisfaction_policies: {},
    tags: ["criminal", "larceny", "theft", "NY-Penal-Law", "demo"],
    pinned: false,
    created_at: now,
    updated_at: now,
    current_version_id: id_for["version"],
  };

  const frame_version: FrameVersion = {
    id: id_for["version"],
    frame_id: frame.id,
    version_number: 1,
    created_at: now,
    ...(user_id ? { created_by: user_id } : {}),
    change_summary: "Initial seed",
    is_milestone: true,
    nodes,
    edges,
    mode: "legal",
    jurisdiction_default: frame.jurisdiction_default,
  };

  return { frame, frame_version, role_to_id: id_for };
}
