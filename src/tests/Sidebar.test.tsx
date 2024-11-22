import { render, screen, fireEvent, act } from "@testing-library/react";
import Sidebar from "../components/Sidebar.tsx";
import { HashRouter as Router } from "react-router-dom";
import { mockIPC } from '@tauri-apps/api/mocks';
import { invoke } from "@tauri-apps/api/tauri";

const mockCollections = [{
    id: 1,
    set_name: "Test Set 1",
  },{
    id: 2,
    set_name: "Test Set 2",
  }
]

const mockSetSelectedBeats = jest.fn();
const mockSetIsCreatingSet = jest.fn();

const defaultProps = {
  beatCollections: mockCollections,
  setSelectedBeats: mockSetSelectedBeats,
  setBeatCollections: jest.fn(),
  setIsCreatingSet: mockSetIsCreatingSet,
  isCreatingSet: false,
  setIsEditingSet: jest.fn(),
  isEditingSet: false,
  currentCollection: null,
  fetchSetData: jest.fn(),
}

describe("Sidebar", () => {
  it("Renders with the correct sets", () => {
    render(<Router><Sidebar {...defaultProps}/></Router>);
    expect(screen.getByText("My sets:", { exact: true })).toBeInTheDocument();

    const items = screen.getAllByRole("button", {});

    // 3 sets plus Add New Set button
    expect(items.length).toBe(4);

    expect(screen.getByText("All Beats", { exact: true })).toBeInTheDocument();
    expect(screen.getByText(mockCollections[1].set_name, { exact: true })).toBeInTheDocument();
  });

  it("Renders with the add new set input and button", () => {
    render(<Router><Sidebar  {...defaultProps}/></Router>);
    expect(screen.getByRole("button", { name: /Add New Set/i, hidden: true })).toBeInTheDocument();
  });

  it("Selecting a new set clears selected beats", () => {
    render(<Router><Sidebar {...defaultProps}/></Router>);
    fireEvent.click(screen.getByText(mockCollections[1].set_name, { exact: true }));
    expect(mockSetSelectedBeats).toHaveBeenCalledTimes(1);
    expect(mockSetSelectedBeats).toHaveBeenCalledWith([]);
  });

  it("Add New Set button opens modal and sets isCreatingSet", async () => {
    render(<Router><Sidebar {...defaultProps}/></Router>);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Add New Set/i }));
    });

    expect(mockSetIsCreatingSet).toHaveBeenCalledTimes(1);
    expect(mockSetIsCreatingSet).toHaveBeenCalledWith(true);
  });

  // We changed the way sets were added, so this test is no longer accurate.
  // But I think its worth leaving for now because it shows how to mock out tauri and the invoke command.

  // it("Allows for a new set to be added", async () => {
  //   render(<Router><Sidebar {...defaultProps}/></Router>);
  //   const newSetName = "New Test 3";
  //   const newBeatResponse = {set_name: newSetName, id: 999};
  //
  //   mockIPC((cmd, args) => {
  //     if(cmd === "new_beat_collection") {
  //       return {set_name: args.setName, id: 999};
  //     }
  //   });
  //
  //   const inputElement = screen.queryByPlaceholderText(/enter a name for a new set/i, {exact: true});
  //
  //   if (!inputElement) {
  //     throw new Error("Input Element not found")
  //   }
  //
  //   await act(async () => {
  //     fireEvent.change(inputElement, {target: {value: newSetName}});
  //   });
  //
  //   await act(async () => {
  //     fireEvent.click(screen.getByRole("button", { name: /Add New Set/i }));
  //   });
  //
  //   expect(invoke("new_beat_collection", { setName: newSetName })).resolves.toStrictEqual(newBeatResponse);
  // });
});