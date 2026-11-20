import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D111A] py-6 mt-auto mb-14 md:mb-0">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center justify-center gap-6 font-medium">
          <Link to="/search" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Search
          </Link>
          <Link to="/map" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            World Map
          </Link>
          <Link to="/contact" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Contact
          </Link>
          <Link to="/terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Terms
          </Link>
        </div>
        <div className="font-medium text-slate-500 dark:text-slate-500">
          &copy; {new Date().getFullYear()} SportsNetwork
        </div>
      </div>
    </footer>
  );
}
