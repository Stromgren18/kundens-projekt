import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DemoProvider, useDemo } from "@/lib/demo-store";
import { Overview } from "@/components/AdminOverview";

// The overview must count days from the real calendar, not a fixed test date:
// a ticket that came in today reads "Idag", never a negative number.
vi.mock("@tanstack/react-start", async (orig) => ({
  ...(await orig<typeof import("@tanstack/react-start")>()),
  useServerFn: (fn: unknown) => fn,
}));

vi.mock("@/lib/db.functions", () => {
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const now = new Date();
  const ago = (n: number) => iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n));
  const ticket = (id: string, title: string, createdAt: string) => ({
    id,
    title,
    body: "",
    images: [],
    notify: false,
    status: "Ej läst" as const,
    urgent: false,
    createdAt,
  });
  const project = {
    code: "TESTKUND",
    name: "Testprojekt",
    client: "Testkund",
    subs: [
      {
        id: "s1",
        name: "Underprojekt",
        codes: ["UNDER"],
        tickets: [ticket("t-new", "Inkom idag", ago(0)), ticket("t-old", "Inkom för två veckor sedan", ago(14))],
      },
    ],
  };
  const noop = async () => ({});
  return {
    loadProjects: async () => [project],
    loadByCode: async () => project,
    createTicket: noop,
    setTicketStatus: noop,
    createProject: noop,
    createSub: noop,
    addSubCode: noop,
    setSubArchived: noop,
    moveTicket: noop,
    updateProject: noop,
    deleteProject: noop,
    setTicketTime: noop,
  };
});

function Portal() {
  const { setAdminToken } = useDemo();
  return (
    <div>
      <button onClick={() => void setAdminToken("token")}>Logga in som admin</button>
      <Overview onOpen={() => {}} />
    </div>
  );
}

describe("Att göra-översiktens datum", () => {
  it("visar Idag för ett ärende som kom in idag och rätt ålder för äldre", async () => {
    render(
      <DemoProvider>
        <Portal />
      </DemoProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Logga in som admin" }));

    await screen.findByText("Inkom idag");

    expect(screen.getByText("Idag")).toBeInTheDocument();
    expect(screen.getByText("14 dagar sedan")).toBeInTheDocument();
    expect(screen.queryByText(/-14 dagar/)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/-1?\d+ dagar sedan/);
  });
});
