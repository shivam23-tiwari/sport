import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, Home as HomeIcon, Trophy, CircleDot, Flag, Dribbble } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

const NAV_LINKS = [
  { name: 'Home', path: '/', icon: HomeIcon },
  { name: 'Football', path: '/sport/football', icon: CircleDot },
  { name: 'Cricket', path: '/sport/cricket', icon: Trophy },
  { name: 'NBA', path: '/sport/nba', icon: Dribbble },
  { name: 'F1', path: '/sport/f1', icon: Flag },
];

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/search');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 h-14 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0A0D14]/95 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Brand Wordmark (single line, preserved SportsNetwork branding) */}
          <Link
            to="/"
            className="text-2xl font-display font-extrabold italic tracking-tight uppercase text-slate-950 dark:text-white whitespace-nowrap shrink-0 hover:opacity-85 transition-opacity"
          >
            SportsNetwork
          </Link>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-6 h-full">
            {NAV_LINKS.map((link) => {
              const active =
                link.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(link.path) ||
                    location.pathname.startsWith(`/category/${link.name.toLowerCase()}`);
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`h-full inline-flex items-center text-sm font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                    active
                      ? 'border-rose-600 text-slate-950 dark:text-white'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: Working Search + Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search
                size={15}
                className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teams, players..."
                aria-label="Search teams, players, leagues"
                className="w-40 sm:w-56 md:w-64 pl-9 pr-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-[#121722] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-rose-500 dark:focus:border-rose-500 transition-colors"
              />
            </form>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#121722] text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile Sport Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-13 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0A0D14]/95 backdrop-blur-md grid grid-cols-5"
      >
        {NAV_LINKS.map((link) => {
          const Icon = link.icon;
          const active =
            link.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(link.path) ||
                location.pathname.startsWith(`/category/${link.name.toLowerCase()}`);
          return (
            <Link
              key={link.name}
              to={link.path}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
                active
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon size={17} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
