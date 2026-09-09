document.addEventListener('DOMContentLoaded', function() {
    // Ensure Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Please include it in your HTML.');
        return;
    }

    const salesComparisonBtn = document.getElementById('sales-comparison-btn');
    const currentSalesBtn = document.getElementById('current-sales-btn');
    const stockSalesComparisonBtn = document.getElementById('stock-sales-comparison-btn');
    const dashboardResults = document.getElementById('dashboard-results');
    let currentChart = null;

    // Exit if dashboard elements aren't on the page
    if (!salesComparisonBtn || !currentSalesBtn || !stockSalesComparisonBtn || !dashboardResults) {
        return;
    }

    // Helper to clear results, destroy old chart, and show a loading message
    const clearResults = () => {
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }
        dashboardResults.innerHTML = '';
    };

    const showLoading = (message) => {
        clearResults();
        dashboardResults.innerHTML = `<p>${message}</p>`;
        showToast(message, 'info');
    };

    salesComparisonBtn.addEventListener('click', async function() {
        showLoading('Fetching sales comparison...');
        // Mock data for demonstration
        setTimeout(() => {
            const data = {
                last24h: 1250.75,
                previous24h: 1100.50,
            };

            clearResults();
            const canvas = document.createElement('canvas');
            dashboardResults.appendChild(canvas);

            currentChart = new Chart(canvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Sales Comparison (£)'],
                    datasets: [{
                        label: 'Last 24 Hours',
                        data: [data.last24h],
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                        color: '#FFFFFF'
                    }, {
                        label: 'Previous 24 Hours',
                        data: [data.previous24h],
                        backgroundColor: 'rgba(255, 159, 64, 0.6)',
                        borderColor: 'rgba(255, 159, 64, 1)',
                        borderWidth: 1,
                        color: '#FFFFFF'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: true, text: 'Sales: Last 24h vs. Previous 24h' },
                        tooltip: { callbacks: { label: (context) => `Total: £${context.raw.toFixed(2)}` } }
                    },
                    scales: { y: { beginAtZero: true, ticks: { callback: (value) => `£${value}` } } }
                }
            });

            const change = data.last24h - data.previous24h;
            const changePercent = data.previous24h > 0 ? (change / data.previous24h) * 100 : 0;
            const summary = document.createElement('p');
            summary.innerHTML = `<strong>Change:</strong> £${change.toFixed(2)} (${changePercent.toFixed(2)}%)`;
            summary.style.textAlign = 'center';
            summary.style.marginTop = '10px';
            dashboardResults.appendChild(summary);

            showToast('Comparison loaded.', 'success');
        }, 500); // Simulate network delay
    });

    currentSalesBtn.addEventListener('click', async function() {
        // const User = get_localStorage('user');
        // const Password = get_localStorage('password');
        // if (!User || !Password) { showToast("User not logged in", "error"); return; }
        // showLoading('Fetching current sales total...');
        // //queryString="username=sibain@omniindex.io&command=getdashboard&password=Ch35t3r";
        // const params = new URLSearchParams({ username: User, password: Password, command: 'getdashboard' });
        // let updategetDashboardRespnse = await fetch(`${PGBC_Agents}?${params.toString()}`);
        // if (!updategetDashboardRespnse.ok) throw new Error(`Failed to fetch current totals..`);
        // const data = await updategetDashboardRespnse.json();
        // const today = data.today_total;


        showLoading('Fetching current sales totals...');

        try {
            const User = get_localStorage('user');
            const Password = get_localStorage('password');
            if (!User || !Password) { throw new Error("User not logged in"); }

            const params = new URLSearchParams({ username: User, password: Password, command: 'getdashboard' });
            const response = await fetch(`${PGBC_Agents}?${params.toString()}`);
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);

            const data = await response.json();
            clearResults();

            let resultsHtml = '<h4>Current Day\'s Sales Totals</h4>';
            for (const key in data) {
                if (Object.hasOwnProperty.call(data, key)) {
                    const value = data[key];
                    const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    const formattedValue = `£${parseFloat(value).toFixed(2)}`;
                    const pClass = (key === 'today_total') ? 'dashboard-total-sales' : '';
                    resultsHtml += `<p class="${pClass}">${formattedKey}: ${formattedValue}</p>`;
                }
            }
            dashboardResults.innerHTML = resultsHtml;
            showToast('Current sales loaded.', 'success');
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            showToast(error.message, "error");
            clearResults();
            dashboardResults.innerHTML = `<p>Could not load sales data.</p>`;
        }        

    });

    stockSalesComparisonBtn.addEventListener('click', async function() {
        showLoading('Fetching 7-day sales history...');

        try {
            const User = get_localStorage('user');
            const Password = get_localStorage('password');
            if (!User || !Password) { throw new Error("User not logged in"); }

            // Assuming a new command 'getsaleshistory' for this data.
            const params = new URLSearchParams({ username: User, password: Password, command: 'getdashboard' });
            const response = await fetch(`${PGBC_Agents}?${params.toString()}`);
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            // Filter out the 'today_total' key and work with valid date entries.
            const dateEntries = Object.entries(data).filter(([key]) => key !== 'today_total' && !isNaN(new Date(key)));
            
            // Sort entries by date to ensure the chart is chronological.
            dateEntries.sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB));

            const labels = dateEntries.map(([date]) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
            const salesData = dateEntries.map(([, value]) => parseFloat(value));

            clearResults();
            const canvas = document.createElement('canvas');
            dashboardResults.appendChild(canvas);

            currentChart = new Chart(canvas.getContext('2d'), {
                type: 'bar', // or 'line'
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Daily Sales (£)',
                        data: salesData,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: true, text: 'Sales History (Last 7 Days)' },
                        tooltip: { callbacks: { label: (context) => `Sales: £${context.raw.toFixed(2)}` } }
                    },
                    scales: { y: { beginAtZero: true, ticks: { callback: (value) => `£${value}` } } }
                }
            });

            showToast('Sales history loaded.', 'success');

        } catch (error) {
            console.error("Error fetching sales history:", error);
            showToast(error.message, "error");
            clearResults();
            dashboardResults.innerHTML = `<p>Could not load sales history.</p>`;
        }
    });
});