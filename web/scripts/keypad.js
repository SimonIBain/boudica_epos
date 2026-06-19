document.addEventListener('DOMContentLoaded', function () {
    const keypadContainer = document.querySelector('.keypad-container');
    if (!keypadContainer) {
        return; // Do nothing if the keypad is not on the page
    }

    const display = document.getElementById('keypad-display');
    let rawValue = '0'; // Store the raw digits as a string

    // Function to format the raw value for display
    function updateDisplay() {
        // Prevent the string from getting too long to avoid number overflow issues.
        if (rawValue.length > 9) {
            rawValue = rawValue.substring(rawValue.length - 9);
        }
        const numberValue = parseInt(rawValue, 10);
        const formattedValue = (numberValue / 100).toFixed(2);
        display.textContent = formattedValue;
    }

    // Expose a reset function for other scripts (like till.js) to use
    window.resetKeypadDisplay = function() {
        rawValue = '0';
        updateDisplay();
    };

    // Initialize display
    updateDisplay();

    keypadContainer.addEventListener('click', function (e) {
        const key = e.target.closest('.keypad-btn'); // Only handle keypad buttons, not payment buttons
        if (!key) {
            return;
        }

        const action = key.dataset.action;
        const keyContent = key.textContent;

        // Let till.js handle the logic for these actions, this script only manages the display value
        if (action === 'enter' || action === 'multiply' || key.classList.contains('payment-btn')) {
            return;
        }
        
        if (!action) { // It's a number key
            if (rawValue === '0') {
                rawValue = keyContent;
            } else {
                rawValue += keyContent;
            }
            updateDisplay();
        }

        if (action === 'period' || action === 'comma') {
            // This button is now redundant with automatic decimal placement. Do nothing.
            return;
        }

        if (action === 'backspace') {
            if (rawValue.length > 1) {
                rawValue = rawValue.slice(0, -1);
            } else {
                rawValue = '0';
            }
            updateDisplay();
        }

        if (action === 'clear') {
            rawValue = '0';
            updateDisplay();
        }
    });
});