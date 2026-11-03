import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useDemo } from "@/lib/demo-store";

function Probe() {
  const { error, projects, isAdmin } = useDemo();
  return (
    <div>
      <span data-testid="count">{projects.length}</span>
      <span data-testid="admin">{String(isAdmin)}</span>
      <p data-testid="err">{error}</p>
    </div>
  );
}

// The portal must never blank the screen when its data layer is missing
// (e.g. a stale dev bundle where the provider module never mounted).
describe("Portalen utan dataleverantör", () => {
  it("visar ett fel i stället för att krascha till en tom sida", () => {
    render(<Probe />);

    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("admin")).toHaveTextContent("false");
    expect(screen.getByTestId("err")).toHaveTextContent(
      "Portalen kunde inte laddas – ladda om sidan.",
    );
  });
});
