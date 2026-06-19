// Reports functionality for Till Dashboard

let currentReportType = 'sales';
let currentReportData = null;

document.addEventListener('DOMContentLoaded', function() {
    // Set default dates (last 30 days)
    setDefaultReportDates();
    
    // Load initial report if reports tab is visible
    const reportStartDateInput = document.getElementById('report-start-date');
    if (reportStartDateInput) {
        loadReport();
    }
});

function setDefaultReportDates() {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago
    
    document.getElementById('report-start-date').valueAsDate = startDate;
    document.getElementById('report-end-date').valueAsDate = endDate;
}

async function loadReport() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    
    if (!startDate || !endDate) {
        showToast('Please select a date range', 'warning');
        return;
    }

    showLoadingOverlay();

    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    
    if (!User || !Password) {
        hideLoadingOverlay();
        showToast('Not authenticated', 'error');
        return;
    }

    try {
        // Determine which report to load based on active tab
        const activeTab = document.querySelector('.report-tab.active');
        if (activeTab) {
            const tabText = activeTab.textContent.toLowerCase();
            if (tabText.includes('sales')) {
                currentReportType = 'sales';
                await loadSalesReport(User, Password, startDate, endDate);
            } else if (tabText.includes('revenue')) {
                currentReportType = 'revenue';
                await loadRevenueReport(User, Password, startDate, endDate);
            } else if (tabText.includes('inventory')) {
                currentReportType = 'inventory';
                await loadInventoryReport(User, Password, startDate, endDate);
            } else if (tabText.includes('tax')) {
                currentReportType = 'tax';
                await loadTaxReport(User, Password, startDate, endDate);
            }
        }
    } catch (error) {
        console.error('Error loading report:', error);
        showToast('Error loading report', 'error');
    } finally {
        hideLoadingOverlay();
    }
}

async function loadSalesReport(user, password, startDate, endDate) {
    const params = new URLSearchParams({
        username: user,
        password: password,
        command: 'salesreport',
        start_date: startDate,
        end_date: endDate
    });

    try {
        let response = await fetch(`${PGBC_Agents}?${params.toString()}`);
        let responseText = await response.text();
        
        // Extract JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            
            if (jsonData.error) {
                showToast(jsonData.error, 'error');
                return;
            }

            currentReportData = jsonData;
            displaySalesReport(jsonData);
        }
    } catch (error) {
        console.error('Error loading sales report:', error);
        showToast('Error loading sales report', 'error');
    }
}

function displaySalesReport(data) {
    const container = document.getElementById('sales-report-container');
    
    if (!data.sales || data.sales.length === 0) {
        container.innerHTML = '<p>No sales data for the selected period</p>';
        return;
    }

    let html = '<table class="report-table"><thead><tr>';
    html += '<th>Product</th><th>Qty</th><th>Unit Price</th><th>Revenue</th></tr></thead><tbody>';
    
    data.sales.forEach(item => {
        html += `<tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>£${parseFloat(item.unit_price).toFixed(2)}</td>
            <td>£${parseFloat(item.revenue).toFixed(2)}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    
    // Add summary
    if (data.total_revenue) {
        html += `<div class="report-summary">
            <div class="summary-item">
                <strong>Total Revenue:</strong> £${parseFloat(data.total_revenue).toFixed(2)}
            </div>
            <div class="summary-item">
                <strong>Total Items Sold:</strong> ${data.total_items_sold || 0}
            </div>
        </div>`;
    }

    container.innerHTML = html;
}

async function loadRevenueReport(user, password, startDate, endDate) {
    const params = new URLSearchParams({
        username: user,
        password: password,
        command: 'revenuereport',
        start_date: startDate,
        end_date: endDate
    });

    try {
        let response = await fetch(`${PGBC_Agents}?${params.toString()}`);
        let responseText = await response.text();
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            
            if (jsonData.error) {
                showToast(jsonData.error, 'error');
                return;
            }

            currentReportData = jsonData;
            displayRevenueReport(jsonData);
        }
    } catch (error) {
        console.error('Error loading revenue report:', error);
        showToast('Error loading revenue report', 'error');
    }
}

function displayRevenueReport(data) {
    const container = document.getElementById('revenue-report-container');
    
    let html = '<div class="report-metrics">';
    
    html += `
        <div class="metric-card">
            <div class="metric-label">Gross Revenue</div>
            <div class="metric-value">£${parseFloat(data.gross_revenue || 0).toFixed(2)}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">COGS (Est.)</div>
            <div class="metric-value">£${parseFloat(data.cogs || 0).toFixed(2)}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Gross Profit</div>
            <div class="metric-value">£${parseFloat(data.gross_profit || 0).toFixed(2)}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Profit Margin</div>
            <div class="metric-value">${parseFloat(data.profit_margin_percent || 0).toFixed(1)}%</div>
        </div>
    `;
    
    html += '</div><div class="report-details">';
    html += `
        <p><strong>Transactions:</strong> ${data.transaction_count || 0}</p>
        <p><strong>Customers:</strong> ${data.customer_count || 0}</p>
        <p><strong>Avg Transaction:</strong> £${parseFloat(data.average_transaction_value || 0).toFixed(2)}</p>
    `;
    html += '</div>';

    container.innerHTML = html;
}

async function loadInventoryReport(user, password, startDate, endDate) {
    const params = new URLSearchParams({
        username: user,
        password: password,
        command: 'inventoryreport'
    });

    try {
        let response = await fetch(`${PGBC_Agents}?${params.toString()}`);
        let responseText = await response.text();
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            
            if (jsonData.error) {
                showToast(jsonData.error, 'error');
                return;
            }

            currentReportData = jsonData;
            displayInventoryReport(jsonData);
        }
    } catch (error) {
        console.error('Error loading inventory report:', error);
        showToast('Error loading inventory report', 'error');
    }
}

function displayInventoryReport(data) {
    const container = document.getElementById('inventory-report-container');
    
    if (!data.inventory || data.inventory.length === 0) {
        container.innerHTML = '<p>No inventory data available</p>';
        return;
    }

    let html = '<table class="report-table"><thead><tr>';
    html += '<th>Product</th><th>Qty</th><th>Unit Price</th><th>Value</th><th>Supplier</th></tr></thead><tbody>';
    
    data.inventory.forEach(item => {
        html += `<tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>£${parseFloat(item.unit_price).toFixed(2)}</td>
            <td>£${parseFloat(item.inventory_value).toFixed(2)}</td>
            <td>${item.supplier || 'N/A'}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    
    if (data.total_inventory_value) {
        html += `<div class="report-summary">
            <div class="summary-item">
                <strong>Total Inventory Value:</strong> £${parseFloat(data.total_inventory_value).toFixed(2)}
            </div>
            <div class="summary-item">
                <strong>Total Items:</strong> ${data.total_items || 0}
            </div>
        </div>`;
    }

    container.innerHTML = html;
}

async function loadTaxReport(user, password, startDate, endDate) {
    const params = new URLSearchParams({
        username: user,
        password: password,
        command: 'taxsummary',
        start_date: startDate,
        end_date: endDate
    });

    try {
        let response = await fetch(`${PGBC_Agents}?${params.toString()}`);
        let responseText = await response.text();
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            
            if (jsonData.error) {
                showToast(jsonData.error, 'error');
                return;
            }

            currentReportData = jsonData;
            displayTaxReport(jsonData);
        }
    } catch (error) {
        console.error('Error loading tax report:', error);
        showToast('Error loading tax report', 'error');
    }
}

function displayTaxReport(data) {
    const container = document.getElementById('tax-report-container');
    
    let html = '<div class="report-metrics">';
    
    html += `
        <div class="metric-card">
            <div class="metric-label">Total Sales</div>
            <div class="metric-value">£${parseFloat(data.total_sales || 0).toFixed(2)}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">VAT 20%</div>
            <div class="metric-value">£${parseFloat(data.vat_20pct || 0).toFixed(2)}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">VAT 5%</div>
            <div class="metric-value">£${parseFloat(data.vat_5pct || 0).toFixed(2)}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Total VAT</div>
            <div class="metric-value">£${parseFloat(data.total_vat_estimate || 0).toFixed(2)}</div>
        </div>
    `;
    
    html += '</div><div class="report-details">';
    html += `<p><strong>Order Count:</strong> ${data.order_count || 0}</p>`;
    html += '</div>';

    container.innerHTML = html;
}

function exportReportCSV() {
    if (!currentReportData) {
        showToast('No report data to export', 'warning');
        return;
    }

    let csv = '';
    const timestamp = new Date().toLocaleString();

    if (currentReportType === 'sales' && currentReportData.sales) {
        csv = 'Sales Report\n' + timestamp + '\n\n';
        csv += 'Product,Quantity,Unit Price,Revenue\n';
        currentReportData.sales.forEach(item => {
            csv += `"${item.description}",${item.quantity},${parseFloat(item.unit_price).toFixed(2)},${parseFloat(item.revenue).toFixed(2)}\n`;
        });
    } else if (currentReportType === 'revenue' && currentReportData.gross_revenue) {
        csv = 'Revenue Report\n' + timestamp + '\n\n';
        csv += 'Metric,Value\n';
        csv += `Gross Revenue,${parseFloat(currentReportData.gross_revenue).toFixed(2)}\n`;
        csv += `COGS,${parseFloat(currentReportData.cogs || 0).toFixed(2)}\n`;
        csv += `Gross Profit,${parseFloat(currentReportData.gross_profit || 0).toFixed(2)}\n`;
        csv += `Profit Margin %,${parseFloat(currentReportData.profit_margin_percent || 0).toFixed(1)}\n`;
    } else if (currentReportType === 'inventory' && currentReportData.inventory) {
        csv = 'Inventory Report\n' + timestamp + '\n\n';
        csv += 'Product,Quantity,Unit Price,Inventory Value,Supplier\n';
        currentReportData.inventory.forEach(item => {
            csv += `"${item.description}",${item.quantity},${parseFloat(item.unit_price).toFixed(2)},${parseFloat(item.inventory_value).toFixed(2)},"${item.supplier || 'N/A'}"\n`;
        });
    } else if (currentReportType === 'tax' && currentReportData.total_sales) {
        csv = 'Tax Summary Report\n' + timestamp + '\n\n';
        csv += 'Metric,Value\n';
        csv += `Total Sales,${parseFloat(currentReportData.total_sales).toFixed(2)}\n`;
        csv += `VAT 20%,${parseFloat(currentReportData.vat_20pct || 0).toFixed(2)}\n`;
        csv += `VAT 5%,${parseFloat(currentReportData.vat_5pct || 0).toFixed(2)}\n`;
        csv += `Total VAT,${parseFloat(currentReportData.total_vat_estimate || 0).toFixed(2)}\n`;
    }

    if (!csv) {
        showToast('No data to export', 'warning');
        return;
    }

    // Download CSV file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${currentReportType}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    showToast('Report exported successfully', 'success');
}
