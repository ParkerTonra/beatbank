
// GhostDragRow.tsx
interface GhostRowProps {
  title: string;
}

function GhostRow({ title }: GhostRowProps) {
  return (
    <div className="bg-blue-500 rounded px-4 py-2 text-white font-bold whitespace-nowrap shadow-lg w-max">
      {title}
    </div>
  );
}

export default GhostRow;