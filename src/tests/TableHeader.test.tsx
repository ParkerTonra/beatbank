import { render, screen } from "@testing-library/react";
import TableHeader from "../components/TableHeader.tsx";

const defaultProps = {
  selectedBeats: [],
  setIsEditingBeat: jest.fn(),
  beatActionItems: [],
  addBeatItems: [],
  uploadStatus: "",
  showStatusDialog: false,
  setShowStatusDialog: jest.fn(),
  uploadedFiles: [],
  showEditColumnsDialog: true,
  setShowEditColumnsDialog: jest.fn(),
  handleForceFirstTimeSetup: jest.fn(),
  handleEditSet: jest.fn(),
  isInCollection: false,
  handleDeleteSet: jest.fn(),
}

const setupTableHeader = (props = {}) => {
  const combinedProps = {...defaultProps, ...props};

  render(
    <TableHeader
      {...combinedProps}
      
    />);
}

describe("TableHeader", () => {
  it("Renders the header with the buttons", () => {
    setupTableHeader();
    expect(screen.getByRole("button", { name: "Edit Columns" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});