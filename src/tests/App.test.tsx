import { render, screen } from "@testing-library/react";
import App from "../App.tsx";

it("Renders the Application", () => {
  render(<App />);
  expect(screen.getByText("BEATBANK")).toBeInTheDocument();
});