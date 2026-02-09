// Toast notification system for user feedback
// Usage: toast.success('Message'), toast.error('Message'), toast.info('Message')

class ToastManager {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Create toast container
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-width: 400px;
        `;
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        const colors = {
            success: { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', text: '#22c55e' },
            error: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#ef4444' },
            warning: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#f59e0b' },
            info: { bg: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6', text: '#3b82f6' }
        };

        const color = colors[type] || colors.info;

        toast.style.cssText = `
            background: ${color.bg};
            border: 1px solid ${color.border};
            border-radius: 8px;
            padding: 14px 16px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
            min-width: 300px;
        `;

        toast.innerHTML = `
            <div style="font-size: 18px; color: ${color.text}; font-weight: bold; flex-shrink: 0;">
                ${icons[type]}
            </div>
            <div style="flex: 1;">
                <div style="color: #fafafa; font-size: 14px; font-weight: 500; margin-bottom: 2px;">
                    ${type.charAt(0).toUpperCase() + type.slice(1)}
                </div>
                <div style="color: #a1a1aa; font-size: 13px;">
                    ${message}
                </div>
            </div>
            <button class="toast-close" style="
                background: none;
                border: none;
                color: #71717a;
                cursor: pointer;
                font-size: 18px;
                line-height: 1;
                padding: 0;
                margin: 0;
                flex-shrink: 0;
            ">×</button>
        `;

        // Add animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
            .toast-close:hover {
                color: #fafafa !important;
            }
        `;
        if (!document.getElementById('toast-styles')) {
            style.id = 'toast-styles';
            document.head.appendChild(style);
        }

        // Close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.onclick = () => this.remove(toast);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => this.remove(toast), duration);
        }

        this.container.appendChild(toast);
        return toast;
    }

    remove(toast) {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    loading(message) {
        const toast = this.show(message + ' ⟳', 'info', 0);
        toast.classList.add('toast-loading');

        // Add spinning animation
        const spinner = toast.querySelector('div:first-child');
        spinner.style.animation = 'spin 1s linear infinite';

        const spinStyle = document.createElement('style');
        spinStyle.textContent = `
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        if (!document.getElementById('spinner-styles')) {
            spinStyle.id = 'spinner-styles';
            document.head.appendChild(spinStyle);
        }

        return toast;
    }
}

// Create global instance
window.toast = new ToastManager();

// Example usage:
// toast.success('Project saved successfully!');
// toast.error('Failed to upload PDF. Please try again.');
// toast.warning('This GC has a low rating');
// toast.info('Analysis complete');
// const loadingToast = toast.loading('Analyzing PDF...');
// // Later: toast.remove(loadingToast);
