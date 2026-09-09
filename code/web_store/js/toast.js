

const Toast = () => {
    const Container = () => {
        return document.getElementById('toast-container');
    } 

    const showToast = (message, type = 'success', duration = 5000) => {
        const container = Container();
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

    return {
        showToast
    }    
};

export default Toast;