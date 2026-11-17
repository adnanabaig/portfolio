// The OPS console parser and command table (components/ops/commands.ts),
// run against a recording stub of its DOM context.
import { describe, expect, it } from "vitest";
import portfolio from "../data/portfolio.json";
import { allCommands, commandNames, complete, run, type Ctx, type Kind } from "../components/ops/commands";
import { splitRow, tableRows } from "../components/ops/table";

const projects = [...portfolio.projects, ...portfolio.engineeringProjects];

function stub(over: Partial<Ctx> = {}) {
  const out: { text: string; kind: Kind; href?: string }[] = [];
  const calls: [string, ...unknown[]][] = [];
  const ctx: Ctx = {
    latched: false,
    print: (text, kind = "out") => out.push({ text, kind }),
    link: (text, href) => out.push({ text, kind: "out", href }),
    clear: () => calls.push(["clear"]),
    close: () => calls.push(["close"]),
    history: () => ["help"],
    open: (url) => calls.push(["open", url]),
    navigate: (p) => calls.push(["navigate", p]),
    copy: async (t) => (calls.push(["copy", t]), true),
    focusCard: (id) => (calls.push(["focusCard", id]), true),
    focusSection: (id) => (calls.push(["focusSection", id]), true),
    ping: async () => 12,
    soundOn: () => false,
    setSound: (on) => calls.push(["setSound", on]),
    showKeys: () => calls.push(["showKeys"]),
    ...over,
  };
  const exec = async (line: string) => {
    out.length = 0;
    calls.length = 0;
    const result = await run(line, ctx);
    return { result, out: out.slice(), calls: calls.slice(), text: out.map((l) => l.text) };
  };
  return { ctx, exec };
}

describe("help and the registry", () => {
  it("lists every visible command and alias, and hides the eggs", async () => {
    const { exec } = stub();
    const { text } = await exec("help");
    const body = text.join("\n");
    for (const cmd of allCommands()) {
      expect(typeof cmd.run).toBe("function");
      if (cmd.secret) expect(body).not.toMatch(new RegExp(`^${cmd.name}\\b`, "m"));
      else expect(body).toMatch(new RegExp(`^${cmd.name}\\b`, "m"));
    }
    expect(body).toContain("projects, ls");
    expect(commandNames()).not.toContain("sudo");
    expect(commandNames()).not.toContain("rm");
  });

  it("has no duplicate names or aliases", () => {
    const names = allCommands().flatMap((c) => [c.name, ...(c.aliases ?? [])]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("matches the command name case-insensitively and ignores blank input", async () => {
    const { exec } = stub();
    expect((await exec("HELP")).text[0]).toBe("Commands");
    const blank = await exec("   ");
    expect(blank.result).toBe("ok");
    expect(blank.out).toEqual([]);
  });

  it("an unknown command is denied with a hint", async () => {
    const { exec } = stub();
    const r = await exec("frobnicate now");
    expect(r.result).toBe("deny");
    expect(r.out).toEqual([{ text: "frobnicate: command not found. Type help.", kind: "err" }]);
  });

  it.each(["teleop", "latency 120"])("%s is gone with the teleop game", async (line) => {
    const { exec } = stub();
    expect((await exec(line)).result).toBe("deny");
    expect(commandNames()).not.toContain(line.split(" ")[0]);
  });
});

describe("open and dossier", () => {
  it("open <id> focuses the card and offers the dossier", async () => {
    const { exec } = stub();
    const r = await exec("open operator-hmi");
    expect(r.calls).toContainEqual(["focusCard", "operator-hmi"]);
    expect(r.text).toContain("For the full page, type dossier operator-hmi.");
  });

  it("open navigates home to the card when it is not on this page", async () => {
    const { exec } = stub({ focusCard: () => false });
    const r = await exec("open wram");
    expect(r.calls).toContainEqual(["navigate", "/#card-wram"]);
  });

  it("dossier <id> goes to /work/<id> for every project", async () => {
    const { exec } = stub();
    for (const p of projects) expect((await exec(`dossier ${p.id}`)).calls).toContainEqual(["navigate", `/work/${p.id}`]);
  });

  it.each(["open nope", "open", "dossier nope", "dossier"])("%s prints an error and stays put", async (line) => {
    const { exec } = stub();
    const r = await exec(line);
    expect(r.out[0].kind).toBe("err");
    expect(r.calls.some(([k]) => k === "navigate" || k === "focusCard")).toBe(false);
  });
});

describe("eggs", () => {
  it("sudo hire adnan opens a channel and focuses Contact, nothing more", async () => {
    const { exec } = stub();
    const r = await exec("sudo hire adnan");
    expect(r.out[0]).toEqual({ text: "Access granted. Opening a channel.", kind: "ok" });
    expect(r.out).toContainEqual({ text: portfolio.email, kind: "out", href: `mailto:${portfolio.email}` });
    expect(r.calls).toContainEqual(["focusSection", "contact-section"]);
    expect(r.text.join(" ")).not.toMatch(/\b(available|open to work|for hire)\b/i);
  });

  it("sudo hire adnan is case-insensitive in its arguments", async () => {
    const { exec } = stub();
    expect((await exec("sudo HIRE Adnan")).text[0]).toBe("Access granted. Opening a channel.");
  });

  it("any other sudo is refused", async () => {
    const { exec } = stub();
    const r = await exec("sudo make me a sandwich");
    expect(r.out).toEqual([{ text: "sudo: that request needs a human. Type contact.", kind: "err" }]);
  });

  it.each(["rm -rf /", "rm -r /", "rm -fr /"])("%s is refused and latches the console until clear", async (line) => {
    const { ctx, exec } = stub();
    const r = await exec(line);
    expect(r.out).toEqual([{ text: "Fail-closed. Request denied and latched. Type clear to resume.", kind: "err" }]);
    expect(ctx.latched).toBe(true);
    for (const next of ["whoami", "help", "open wram", "nonsense"]) {
      const denied = await exec(next);
      expect(denied.result).toBe("deny");
      expect(denied.out).toEqual([{ text: "Latched. Type clear to resume.", kind: "err" }]);
    }
    await exec("clear");
    expect(ctx.latched).toBe(false);
    expect((await exec("whoami")).result).toBe("ok");
  });

  it.each(["rm notes.txt", "rm -f /", "rm -rf"])("%s is refused without latching", async (line) => {
    const { ctx, exec } = stub();
    const r = await exec(line);
    expect(r.out).toEqual([{ text: "rm: nothing here is yours to remove.", kind: "err" }]);
    expect(ctx.latched).toBe(false);
  });
});

describe("argument checks", () => {
  it("theme, sound, and crt reject bad values", async () => {
    const { exec } = stub();
    for (const line of ["theme pink", "sound loud", "crt maybe"]) expect((await exec(line)).out[0].kind).toBe("err");
  });

  it("ping labels the round trip as your link", async () => {
    const { exec } = stub();
    expect((await exec("ping")).text).toContain("Reply in 12 ms (your link).");
  });
});

describe("tab completion", () => {
  it("completes a unique command with a trailing space", () => {
    expect(complete("pro")).toEqual({ value: "projects ", options: ["projects"] });
    expect(complete("dos")).toEqual({ value: "dossier ", options: ["dossier"] });
  });

  it("extends to the longest common prefix, then lists the choices", () => {
    const e = complete("e");
    expect(e.options).toEqual(expect.arrayContaining(["experience", "education", "email", "estop", "exit"]));
    expect(e.value).toBeNull();
    expect(complete("ex")).toEqual({ value: null, options: ["experience", "exit"] });
    expect(complete("exp").value).toBe("experience ");
  });

  it("completes project ids for open and dossier", () => {
    expect(complete("open op").value).toBe("open operator-hmi ");
    expect(complete("dossier fl").value).toBe("dossier fleet-operations ");
    expect(complete("open ").options).toEqual(projects.map((p) => p.id));
  });

  it("completes fixed argument sets", () => {
    expect(complete("theme a").value).toBe("theme amber ");
    expect(complete("sound o").options).toEqual(["on", "off"]);
    expect(complete("crt of").value).toBe("crt off ");
  });

  it("never completes the eggs or unknown words", () => {
    expect(complete("su")).toEqual({ value: null, options: [] });
    expect(complete("rm")).toEqual({ value: null, options: [] });
    expect(complete("zzz")).toEqual({ value: null, options: [] });
    expect(complete("help me")).toEqual({ value: null, options: [] });
  });

  it("keeps leading whitespace", () => {
    expect(complete("  pro").value).toBe("  projects ");
  });
});

describe("table rows (help, projects)", () => {
  it("every help row splits into the command and its description", async () => {
    const { out } = await stub().exec("help");
    const rows = out.filter((l) => l.kind === "row");
    const visible = allCommands().filter((c) => !c.secret);
    expect(rows).toHaveLength(visible.length);
    rows.forEach((l, i) => {
      const row = splitRow(l.text);
      expect(row, l.text).not.toBeNull();
      expect(row!.name.split(/[ ,]/)[0]).toBe(visible[i].name);
      expect(row!.description).toBe(visible[i].help);
    });
    expect(new Set(rows.map((l) => splitRow(l.text)!.col)).size).toBe(1);
  });

  it("every projects row splits into the id and title, in one column for both lists", async () => {
    const { out } = await stub().exec("projects");
    const rows = out.filter((l) => l.kind === "row").map((l) => splitRow(l.text));
    expect(rows.map((r) => r?.name)).toEqual(projects.map((p) => p.id));
    expect(rows.map((r) => r?.description)).toEqual(projects.map((p) => p.title));
    expect(new Set(rows.map((r) => r!.col)).size).toBe(1);
  });

  it("a long name still leaves two spaces, and only row lines are tables", async () => {
    const long = "a-project-id-longer-than-the-old-padding";
    const [row] = tableRows([[long, "Title"], ["x", "y"]]);
    expect(splitRow(row)).toEqual({ name: long, description: "Title", col: long.length + 2 });
    const { out } = await stub({ history: () => ["echo  two  spaces"] }).exec("history");
    expect(out.every((l) => l.kind !== "row")).toBe(true);
  });
});
