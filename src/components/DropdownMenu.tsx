// DropdownMenu.tsx
import { MenuItem } from 'primereact/menuitem';
import { Menu } from 'primereact/menu';
import { useRef } from 'react';

interface DropdownMenuProps {
  title: string;
  icon: string;
  items: MenuItem[];
  className?: string;
}

const DropdownMenu = ({ title, icon, items, className = '' }: DropdownMenuProps) => {
  const menuRef = useRef<Menu>(null);

  return (
    <div className={className}>
      <button
        className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={(e) => menuRef.current?.toggle(e)}
      >
        <span className={`${icon} mr-2`} />
        {title}
      </button>
      <Menu
        model={items}
        popup
        ref={menuRef}
        className="bg-gray-800"
      />
    </div>
  );
};

export default DropdownMenu;