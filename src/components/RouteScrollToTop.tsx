import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const RouteScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (hash) {
      // Wait for page render, then scroll to the anchor
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else if (navType !== 'POP') {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [pathname, hash, navType]);

  return null;
};

export default RouteScrollToTop;
