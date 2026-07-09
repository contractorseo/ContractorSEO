import { Link } from 'react-router-dom';

export function PublicFooter() {
  return (
    <div className="mt-8 text-center text-xs text-gray-500 space-x-4">
      <Link to="/pricing" className="hover:text-gray-300 transition-colors">Pricing</Link>
      <span className="text-gray-600">·</span>
      <Link to="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
      <span className="text-gray-600">·</span>
      <Link to="/terms" className="hover:text-gray-300 transition-colors">Terms of Service</Link>
    </div>
  );
}
