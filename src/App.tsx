import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './hooks/useTheme';
import { FavoritesProvider } from './hooks/useFavorites';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/layout/Navbar';
import ScoreTicker from './components/ScoreTicker';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import SportCategory from './pages/SportCategory';
import MatchDetail from './pages/MatchDetail';
import NewsDetail from './pages/NewsDetail';
import SearchPage from './pages/SearchPage';
import MapPage from './pages/MapPage';
import Contact from './pages/Contact';
import Terms from './pages/Terms';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FavoritesProvider>
          <BrowserRouter>
            <div className="flex flex-col min-h-screen bg-[#F6F7F9] text-slate-900 dark:bg-[#0A0D14] dark:text-slate-100">
              <Navbar />
              <ErrorBoundary fallbackTitle="Live Scoreboard Ticker Unavailable">
                <ScoreTicker />
              </ErrorBoundary>
              <main className="flex-grow w-full">
                <ErrorBoundary fallbackTitle="Page Error">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/sport/:sport" element={<SportCategory />} />
                    <Route path="/category/:sport" element={<SportCategory />} />
                    <Route path="/match/:sport/:id" element={<MatchDetail />} />
                    <Route path="/news/:id" element={<NewsDetail />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/map" element={<MapPage />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </ErrorBoundary>
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </FavoritesProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
