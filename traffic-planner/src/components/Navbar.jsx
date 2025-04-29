import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// You can replace this emoji with an SVG or image if desired
const Logo = () => (
  <span className="text-2xl mr-2">🚦</span>
);

const Navbar = () => {
  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-400 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Logo />
            <Link to="/" className="text-2xl font-extrabold text-white tracking-tight hover:text-yellow-200 transition-colors">
              SmartRoute
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/map" className="text-white hover:text-yellow-200 font-medium transition-colors text-lg">
              Plan Route
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
