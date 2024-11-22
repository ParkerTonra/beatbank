import { useRef } from "react";
import { TieredMenu } from "primereact/tieredmenu";
import { Button } from "primereact/button";


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
  const menuRef = useRef<TieredMenu>(null);

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (menuRef.current) {
      menuRef.current.toggle(e);
    }
  };

  return (
    <div className="mr-2">
      <Button icon={icon} onClick={handleButtonClick}>
        <span className="ml-2">{title}</span>
      </Button>
      <TieredMenu
        className={`absolute left-full top-0 bg-slate-800 p-2 ${className} select-none`}
        model={items}
        breakpoint="767px"
        popup
        ref={menuRef}
      />
    </div>
  );
};

export default DropdownMenu;