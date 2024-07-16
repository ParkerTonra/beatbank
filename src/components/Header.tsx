interface HeaderProps {
  iconPath: string;
}

const Header = ({ iconPath }: HeaderProps) => {
  return (
    <header className="w-full text-white shadow-md">
      <div className="container mx-auto h-16 flex items-center justify-center border">
        <div className="flex items-center space-x-4">
          <img className="icon w-8 h-8" alt="icon" src={iconPath} />
          <h1 className="text-3xl font-bold">Beat Bank</h1>
          <img className="icon w-8 h-8" alt="icon" src={iconPath} />
        </div>
      </div>
    </header>
  );
};

export default Header;
