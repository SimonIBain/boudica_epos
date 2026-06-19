function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.error('Toast container not found!');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.add('show');
    }, 100); // Small delay to allow CSS transition

    // Animate out and remove
    setTimeout(() => {
        toast.classList.remove('show');
        // Remove the element after the fade-out transition completes
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}