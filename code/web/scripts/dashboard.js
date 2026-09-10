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
        // 7.1#13: this used to hardcode fake figures behind a setTimeout labeled
        // "Simulate network delay" and never called the backend at all — nothing in the
        // UI marked it as placeholder data, so it looked like a real live comparison.
        // Now built from the same real `getdashboard` data the other two buttons use:
        // "today" is the live running total (store.period_sales), "previous" is the most
        // recent day with a completed cashup (store.cash_up) before today.
        showLoading('Fetching sales comparison...');

        try {
            const json = await apiCall('getdashboard');
            if (json.error) throw new Error(json.error);

            const last24h = parseFloat(json.today_total) || 0;
            const dateEntries = Object.entries(json)
                .filter(([key]) => key !== 'today_total' && !isNaN(new Date(key)))
                .sort(([dateA], [dateB]) => new Date(dateB) - new Date(dateA));
            const previous24h = dateEntries.length > 0 ? (parseFloat(dateEntries[0][1]) || 0) : 0;

            clearResults();
            const canvas = document.createElement('canvas');
            dashboardResults.appendChild(canvas);

            currentChart = new Chart(canvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Sales Comparison (£)'],
                    datasets: [{
                        label: 'Today (running total)',
                        data: [last24h],
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                        color: '#FFFFFF'
                    }, {
                        label: dateEntries.length > 0 ? `Previous day (${dateEntries[0][0]})` : 'Previous day (no data)',
                        data: [previous24h],
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
                        title: { display: true, text: 'Sales: Today vs. Previous Day' },
                        tooltip: { callbacks: { label: (context) => `Total: £${context.raw.toFixed(2)}` } }
                    },
                    scales: { y: { beginAtZero: true, ticks: { callback: (value) => `£${value}` } } }
                }
            });

            const change = last24h - previous24h;
            const changePercent = previous24h > 0 ? (change / previous24h) * 100 : 0;
            const summary = document.createElement('p');
            summary.innerHTML = dateEntries.length > 0
                ? `<strong>Change:</strong> £${change.toFixed(2)} (${changePercent.toFixed(2)}%)`
                : `<strong>No prior day's cashup on record yet — comparison unavailable.</strong>`;
            summary.style.textAlign = 'center';
            summary.style.marginTop = '10px';
            dashboardResults.appendChild(summary);

            showToast('Comparison loaded.', 'success');
        } catch (error) {
            console.error("Error fetching sales comparison:", error);
            showToast(error.message, "error");
            clearResults();
            dashboardResults.innerHTML = `<p>Could not load sales comparison.</p>`;
        }
    });

    currentSalesBtn.addEventListener('click', async function() {
        showLoading('Fetching current sales totals...');

        try {
            const data = await apiCall('getdashboard');
            if (data.error) throw new Error(data.error);
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
            const data = await apiCall('getdashboard');
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