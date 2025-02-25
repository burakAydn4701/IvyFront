import { Search, User, Bell } from "lucide-react";
import Link from "next/link";

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between p-4 bg-slate-100 shadow-sm">
      <Link href="/">
        <h1 className="text-2xl font-bold text-green-600 hover:text-green-700 transition-colors cursor-pointer">
          IvyLeagueTr
        </h1>
      </Link>
      <div className="flex items-center gap-6">
        <Search className="w-5 h-5 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer" />
        <Bell className="w-5 h-5 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer" />
        <User className="w-5 h-5 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer" />
      </div>
    </nav>
  );
};

export default Navbar;
