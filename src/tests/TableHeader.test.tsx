import { render, screen } from "@testing-library/react";
import TableHeader from "../components/TableHeader.tsx";

const setupTableHeader = () => {
  render(
    <TableHeader
      selectedBeats={[]}
      setIsEditingBeat={jest.fn()}
      beatActionItems={[]}
      addBeatItems={[]}
      uploadStatus={""}
      showStatusDialog={false}
      setShowStatusDialog={jest.fn()}
      uploadedFiles={[]}
      showEditColumnsDialog={false}
      setShowEditColumnsDialog={jest.fn()}
    />);
}

describe("TableHeader", () => {
  it("Renders the header with the buttons", () => {
    setupTableHeader();
    expect(screen.getByRole("button", { name: "Edit Columns" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});