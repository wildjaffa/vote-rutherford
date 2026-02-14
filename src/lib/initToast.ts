/**
 * Toast Initialization Script
 * This script should be included in the layout to initialize the toast service
 */

import toast from "./toast";

// Initialize toast service when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    toast.init();
  });
} else {
  toast.init();
}

// Export for use in other modules
export default toast;
