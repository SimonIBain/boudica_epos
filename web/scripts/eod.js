document.addEventListener('DOMContentLoaded', function() {
    const processBtn = document.getElementById('process-eod-btn');
    const resultsForm = document.getElementById('eod-results');

    // Exit if the EOD elements aren't on the page
    if (!processBtn) {
        return;
    }

    processBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        showLoadingOverlay();
        try {
            const User = get_localStorage('user');
            const Password = get_localStorage('password');
            if (!User || !Password) { throw new Error("User not logged in"); }

            showToast('Processing End of Day...', 'info');
            const params = new URLSearchParams({ username: User, password: Password, command: 'cashup' });
            const response = await fetch(`${PGBC_Agents}?${params.toString()}`);
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Populate the form with the final, confirmed values from the 'cashup' call
            for (const key in data) {
                const elementId = `eod-${key.replace(/_/g, '-')}`;
                const input = document.getElementById(elementId);
                if (input) {
                    const value = parseFloat(data[key]);
                    if (!isNaN(value)) input.value = value.toFixed(2);
                }
            }

            // Show the results and disable the button to prevent re-submission
            resultsForm.style.display = 'block';
            processBtn.textContent = 'EOD Complete';
            processBtn.disabled = true;
            showToast('End of Day report processed successfully!', 'success');
        } catch (error) {
            console.error("Error processing EOD:", error);
            showToast(error.message, 'error');
        } finally {
            hideLoadingOverlay();
        }
    });
});