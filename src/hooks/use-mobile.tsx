
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Initialize state to false (desktop) to ensure consistency between server and initial client render.
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    // This effect runs only on the client side.
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    const handleResize = () => {
      setIsMobile(mql.matches);
    };

    // Call handler once on mount to set the initial client-side state.
    handleResize(); 

    // Add event listener for future changes.
    mql.addEventListener("change", handleResize);

    // Clean up event listener on unmount.
    return () => mql.removeEventListener("change", handleResize);
  }, []); // Empty dependency array ensures this effect runs only once on mount and cleanup on unmount.

  return isMobile;
}
