import { fireEvent, render, screen } from "@testing-library/react";
import BeatJockey from "../components/BeatJockey.tsx";

const mockPlayPause = jest.fn();
const mockStopPlay = jest.fn();

const mockRef = { current: null };

const defaultProps = {
  isPlaying: false,
  currentBeat: null,
  togglePlayPause: mockPlayPause,
  stopBeat: mockStopPlay,
  audioRef: mockRef,
}

const setupBeatJockey = (props = {}) => {
  const combinedProps = {...defaultProps, ...props};

  render(
    <BeatJockey
      {...combinedProps}
    />);
}

describe("BeatJockey", () => {
  it("Renders the component with the buttons", () => {
    setupBeatJockey();
    expect(screen.getByTestId("stop-beat", {exact: true})).toBeInTheDocument();
    expect(screen.getByTestId("play-pause-beat", {exact: true})).toBeInTheDocument();
  });

  it("play pause button works as expected", () => {
    setupBeatJockey();
    fireEvent.click(screen.getByTestId("play-pause-beat", {exact: true}));
    expect(mockPlayPause).toHaveBeenCalledTimes(1)
  });

  it("stop button works as expected", () => {
    setupBeatJockey();
    fireEvent.click(screen.getByTestId("stop-beat", {exact: true}));
    expect(mockPlayPause).toHaveBeenCalledTimes(1)
  });
});