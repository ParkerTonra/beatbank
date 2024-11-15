import { useRef } from "react";
import { TieredMenu } from "primereact/tieredmenu";
import { Button } from "primereact/button";


interface DropdownMenuItem {
  label: string;
  icon?: string;
  items?: DropdownMenuItem[];
}

interface DropdownMenuProps {
  title: string;
  icon?: string;
  items: any[];
  className?: string;
}

const DropdownMenu = ({
  title,
  icon,
  items,
  className,
}: DropdownMenuProps) => {
  const menuRef = useRef(null);

  return (
    <div className="mr-2">
      <Button icon={icon} onClick={(e) => menuRef.current.toggle(e)}>
        <span className="ml-2">{title}</span>
      </Button>
      <TieredMenu
        className={`absolute left-full top-0 bg-slate-800 p-2 ${className}`}
        model={items}
        breakpoint="767px"
        popup
        ref={menuRef}
      />
    </div>
  );
};

export default DropdownMenu;