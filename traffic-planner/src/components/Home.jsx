import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const HeroIllustration = () => (
  <div className="flex justify-center mb-8">
    {/* Simple SVG illustration */}
    <svg width="180" height="120" viewBox="0 0 180 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="60" width="140" height="40" rx="20" fill="#6366f1" opacity="0.15"/>
      <circle cx="60" cy="80" r="16" fill="#6366f1"/>
      <circle cx="120" cy="80" r="16" fill="#6366f1"/>
      <rect x="80" y="40" width="20" height="40" rx="10" fill="#6366f1"/>
      <rect x="70" y="30" width="40" height="20" rx="10" fill="#818cf8"/>
    </svg>
  </div>
);

const Home = () => {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#eae6db]">
      <div className="text-center px-4 py-12 rounded-2xl shadow-xl bg-[#232623] max-w-xl mx-auto">
        <HeroIllustration />
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl font-extrabold text-[#eae6db] mb-4 drop-shadow"
        >
          Find Your Safest Route
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-[#bdbdbd] mb-10"
        >
          Navigate through traffic with real-time updates and safety alerts.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Link 
            to="/map" 
            className="bg-[#353835] text-[#eae6db] px-10 py-4 rounded-full text-xl font-semibold shadow-lg hover:scale-105 hover:bg-[#444844] transition-all duration-200"
          >
            Start Planning
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
