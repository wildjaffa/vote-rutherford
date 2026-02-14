/**
 * Toast Service
 * Provides a simple API for displaying toast notifications across the application
 */

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  type?: ToastType;
  duration?: number; // in milliseconds, 0 = no auto-dismiss
  dismissible?: boolean;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  dismissible: boolean;
}

class ToastService {
  private container: HTMLElement | null = null;
  private toastCounter = 0;

  /**
   * Initialize the toast service
   * This should be called once when the page loads
   */
  init(): void {
    this.container = document.getElementById("toast-container");
    if (!this.container) {
      console.warn("Toast container not found. Toasts will not be displayed.");
    }
  }

  /**
   * Show a toast notification
   */
  show(message: string, options: ToastOptions = {}): string {
    if (!this.container) {
      console.warn("Toast service not initialized");
      return "";
    }

    const toast: Toast = {
      id: `toast-${++this.toastCounter}-${Date.now()}`,
      message,
      type: options.type || "info",
      duration: options.duration !== undefined ? options.duration : 5000,
      dismissible:
        options.dismissible !== undefined ? options.dismissible : true,
    };

    this.createToastElement(toast);
    return toast.id;
  }

  /**
   * Convenience method for success toast
   */
  success(message: string, options: Omit<ToastOptions, "type"> = {}): string {
    return this.show(message, { ...options, type: "success" });
  }

  /**
   * Convenience method for error toast
   */
  error(message: string, options: Omit<ToastOptions, "type"> = {}): string {
    return this.show(message, { ...options, type: "error" });
  }

  /**
   * Convenience method for warning toast
   */
  warning(message: string, options: Omit<ToastOptions, "type"> = {}): string {
    return this.show(message, { ...options, type: "warning" });
  }

  /**
   * Convenience method for info toast
   */
  info(message: string, options: Omit<ToastOptions, "type"> = {}): string {
    return this.show(message, { ...options, type: "info" });
  }

  /**
   * Dismiss a specific toast by ID
   */
  dismiss(toastId: string): void {
    const toastElement = document.getElementById(toastId);
    if (toastElement) {
      this.removeToast(toastElement);
    }
  }

  /**
   * Dismiss all toasts
   */
  dismissAll(): void {
    if (!this.container) return;
    const toasts = this.container.querySelectorAll(".toast");
    toasts.forEach((toast) => this.removeToast(toast as HTMLElement));
  }

  private createToastElement(toast: Toast): void {
    if (!this.container) return;

    const toastEl = document.createElement("div");
    toastEl.id = toast.id;
    toastEl.className = this.getToastClasses(toast.type);
    toastEl.setAttribute("role", "alert");

    // Create toast content
    const content = document.createElement("div");
    content.className = "flex items-center gap-3";

    // Icon
    const icon = this.getIcon(toast.type);
    content.appendChild(icon);

    // Message
    const messageEl = document.createElement("p");
    messageEl.className = "flex-1 text-sm font-medium";
    messageEl.textContent = toast.message;
    content.appendChild(messageEl);

    // Close button (if dismissible)
    if (toast.dismissible) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "ml-auto hover:opacity-70 transition-opacity";
      closeBtn.innerHTML = this.getCloseIcon();
      closeBtn.setAttribute("aria-label", "Close notification");
      closeBtn.onclick = () => this.removeToast(toastEl);
      content.appendChild(closeBtn);
    }

    toastEl.appendChild(content);

    // Add to container with animation
    this.container.appendChild(toastEl);

    // Trigger animation
    requestAnimationFrame(() => {
      toastEl.classList.add("toast-enter");
    });

    // Auto-dismiss
    if (toast.duration > 0) {
      setTimeout(() => {
        this.removeToast(toastEl);
      }, toast.duration);
    }
  }

  private removeToast(toastEl: HTMLElement): void {
    toastEl.classList.remove("toast-enter");
    toastEl.classList.add("toast-exit");

    setTimeout(() => {
      toastEl.remove();
    }, 300); // Match animation duration
  }

  private getToastClasses(type: ToastType): string {
    const baseClasses =
      "toast pointer-events-auto min-w-80 max-w-md rounded-lg shadow-lg p-4 transition-all duration-300 transform";

    const typeClasses = {
      success: "bg-green-50 border border-green-200 text-green-900",
      error: "bg-red-50 border border-red-200 text-red-900",
      warning: "bg-yellow-50 border border-yellow-200 text-yellow-900",
      info: "bg-blue-50 border border-blue-200 text-blue-900",
    };

    return `${baseClasses} ${typeClasses[type]}`;
  }

  private getIcon(type: ToastType): HTMLElement {
    const iconWrapper = document.createElement("div");
    iconWrapper.className = "flex-shrink-0";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "w-5 h-5");
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("viewBox", "0 0 20 20");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    switch (type) {
      case "success":
        svg.classList.add("text-green-600");
        path.setAttribute("fill-rule", "evenodd");
        path.setAttribute(
          "d",
          "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z",
        );
        path.setAttribute("clip-rule", "evenodd");
        break;
      case "error":
        svg.classList.add("text-red-600");
        path.setAttribute("fill-rule", "evenodd");
        path.setAttribute(
          "d",
          "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z",
        );
        path.setAttribute("clip-rule", "evenodd");
        break;
      case "warning":
        svg.classList.add("text-yellow-600");
        path.setAttribute("fill-rule", "evenodd");
        path.setAttribute(
          "d",
          "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z",
        );
        path.setAttribute("clip-rule", "evenodd");
        break;
      case "info":
        svg.classList.add("text-blue-600");
        path.setAttribute("fill-rule", "evenodd");
        path.setAttribute(
          "d",
          "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z",
        );
        path.setAttribute("clip-rule", "evenodd");
        break;
    }

    svg.appendChild(path);
    iconWrapper.appendChild(svg);
    return iconWrapper;
  }

  private getCloseIcon(): string {
    return `
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
      </svg>
    `;
  }
}

// Create singleton instance
const toastService = new ToastService();

// Export the service
export default toastService;

// Extend Window interface for TypeScript
declare global {
  interface Window {
    toast: ToastService;
  }
}

// Also export as a global for use in inline scripts
if (typeof window !== "undefined") {
  window.toast = toastService;
}
