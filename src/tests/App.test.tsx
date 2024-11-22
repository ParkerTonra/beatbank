import { render, screen } from "@testing-library/react";
import App from "../App.tsx";

describe("BeatBank", () => {
  it("Renders the Application", () => {
    render(<App />);
    expect(screen.getByText("BEATBANK", {exact: true})).toBeInTheDocument();
  });
});