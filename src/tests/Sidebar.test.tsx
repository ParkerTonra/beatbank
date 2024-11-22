import { render, screen, within, fireEvent, act } from "@testing-library/react";
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

describe("Sidebar", () => {
  it("Renders with the correct sets", () => {
    render(<Router><Sidebar collections={mockCollections} /></Router>);
    expect(screen.getByText("My sets:", { exact: true })).toBeInTheDocument();

    const list = screen.getByRole("list", {
      name: /My sets:/i,
    });
    const { getAllByRole } = within(list);
    const items = getAllByRole("listitem");
    expect(items.length).toBe(3);

    expect(screen.getByText("All Beats", { exact: true })).toBeInTheDocument();
    expect(screen.getByText(mockCollections[1].set_name, { exact: true })).toBeInTheDocument();
  });

  it("Renders with the add new set input and button", () => {
    render(<Router><Sidebar collections={mockCollections} /></Router>);
    expect(screen.getByRole("button", { name: /Add New Set/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/enter a name for a new set/i, {exact: true})).toBeInTheDocument();
  });

  it("Allows for a new set to be added", async () => {
    render(<Router><Sidebar collections={mockCollections} /></Router>);

    const newSetName = "New Test 3";
    const newBeatResponse = {set_name: newSetName, id: 999};

    mockIPC((cmd, args) => {
      if(cmd === "new_beat_collection") {
        return {set_name: args.setName, id: 999};
      }
    });

    const inputElement = screen.queryByPlaceholderText(/enter a name for a new set/i, {exact: true});

    if (!inputElement) {
      throw new Error("Input Element not found")
    }

    await act(async () => {
      fireEvent.change(inputElement, {target: {value: newSetName}});
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Add New Set/i }));
    });

    expect(invoke("new_beat_collection", { setName: newSetName })).resolves.toStrictEqual(newBeatResponse);
  });
});