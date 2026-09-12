/**
 * Boudica AI Forecasting Module
 * Integrates with Boudica AI for sales prediction and inventory reordering
 * Features:
 *  - Daily sales forecast (last 10 same days of week)
 *  - Weekly sales forecast (last 10 same weeks)
 *  - Monthly sales forecast (last 10 same months)
 *  - Inventory reordering predictions
 */

// Configuration
const FORECAST_API_BASE = '/api/boudica';

/**
 * Show/hide loading indicator
 */
function setLoading(show) {
    const loader = document.getElementById('forecast-loading');
    if (loader) {
        loader.style.display = show ? 'block' : 'none';
    }
}

/**
 * Format currency for display
 */
function formatCurrency(amount) {
    return '£' + parseFloat(amount).toFixed(2);
}

/**
 * Parse JSON response from Boudica
 */
function parseJson(text) {
    try {
        // Extract JSON from response (may contain surrounding text)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(text);
    } catch (e) {
        console.error('Failed to parse JSON:', e, text);
        return null;
    }
}

/**
 * Forecast daily sales based on last 10 same days of week
 */
async function forecastDailySales() {
    setLoading(true);
    const resultDiv = document.getElementById('daily-forecast-result');
    resultDiv.style.display = 'none';

    try {
        const data = await apiCall('predict_daily_sales');
        console.log('Daily forecast response:', data);

        if (data && !data.error) {
            // Extract forecast data
            const dailyData = data.daily_sales_data ? parseJson(JSON.stringify(data.daily_sales_data)) : null;
            const forecast = data.boudica_forecast ? parseJson(JSON.stringify(data.boudica_forecast)) : null;

            let html = '<div class="result-label">📅 Today\'s Forecast</div>';
            
            if (forecast && forecast.predicted_sales) {
                html += `<div class="result-value">${formatCurrency(forecast.predicted_sales)}</div>`;
                html += `<div class="result-detail"><strong>Confidence:</strong> ${escapeHtml(forecast.confidence_level || 'N/A')}</div>`;
                if (forecast.explanation) {
                    html += `<div class="result-detail"><strong>Analysis:</strong> ${escapeHtml(forecast.explanation)}</div>`;
                }
            } else if (dailyData) {
                html += `<div class="result-detail"><strong>Historical Data:</strong> Available (${dailyData.num_days || 0} days)</div>`;
                html += `<div class="result-value">${formatCurrency(dailyData.avg_total || 0)}</div>`;
                html += '<div class="result-detail"><em>Boudica AI analysis is processing...</em></div>';
            } else {
                html += '<div class="result-detail">Unable to generate forecast. Insufficient historical data.</div>';
            }

            resultDiv.innerHTML = html;
            resultDiv.classList.add('success');
            resultDiv.style.display = 'block';
            showToast('Daily forecast generated ✓', 'success');
        } else {
            resultDiv.innerHTML = '<div class="result-label">Error</div><div class="result-detail">' + (data.error || 'Unknown error') + '</div>';
            resultDiv.classList.add('error');
            resultDiv.style.display = 'block';
            showToast('Forecast failed: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Daily forecast error:', error);
        resultDiv.innerHTML = '<div class="result-label">Error</div><div class="result-detail">' + error.message + '</div>';
        resultDiv.classList.add('error');
        resultDiv.style.display = 'block';
        showToast('Forecast failed: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

/**
 * Forecast weekly sales based on last 10 same weeks
 */
async function forecastWeeklySales() {
    setLoading(true);
    const resultDiv = document.getElementById('weekly-forecast-result');
    resultDiv.style.display = 'none';

    try {
        const data = await apiCall('predict_weekly_sales');
        console.log('Weekly forecast response:', data);

        if (data && !data.error) {
            const weeklyData = data.weekly_sales_data ? parseJson(JSON.stringify(data.weekly_sales_data)) : null;
            const forecast = data.boudica_forecast ? parseJson(JSON.stringify(data.boudica_forecast)) : null;

            let html = '<div class="result-label">📊 Weekly Forecast</div>';
            
            if (forecast && forecast.predicted_sales) {
                html += `<div class="result-value">${formatCurrency(forecast.predicted_sales)}</div>`;
                html += `<div class="result-detail"><strong>Confidence:</strong> ${escapeHtml(forecast.confidence_level || 'N/A')}</div>`;
                if (forecast.trend) {
                    html += `<div class="result-detail"><strong>Trend:</strong> ${escapeHtml(forecast.trend)}</div>`;
                }
                if (forecast.explanation) {
                    html += `<div class="result-detail"><strong>Analysis:</strong> ${escapeHtml(forecast.explanation)}</div>`;
                }
            } else if (weeklyData) {
                html += `<div class="result-detail"><strong>Historical Data:</strong> Available</div>`;
                html += `<div class="result-value">${formatCurrency(weeklyData.avg_total || 0)}</div>`;
                html += '<div class="result-detail"><em>Boudica AI analysis is processing...</em></div>';
            } else {
                html += '<div class="result-detail">Unable to generate forecast. Insufficient historical data.</div>';
            }

            resultDiv.innerHTML = html;
            resultDiv.classList.add('success');
            resultDiv.style.display = 'block';
            showToast('Weekly forecast generated ✓', 'success');
        } else {
            resultDiv.innerHTML = '<div class="result-label">Error</div><div class="result-detail">' + (data.error || 'Unknown error') + '</div>';
            resultDiv.classList.add('error');
            resultDiv.style.display = 'block';
            showToast('Forecast failed: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Weekly forecast error:', error);
        resultDiv.innerHTML = '<div class="result-label">Error</div><div class="result-detail">' + error.message + '</div>';
        resultDiv.classList.add('error');
        resultDiv.style.display = 'block';
        showToast('Forecast failed: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

/**
 * Forecast monthly sales based on last 10 same months
 */
async function forecastMonthlySales() {
    setLoading(true);
    const resultDiv = document.getElementById('monthly-forecast-result');
    resultDiv.style.display = 'none';

    try {
        const data = await apiCall('predict_monthly_sales');
        console.log('Monthly forecast response:', data);

        if (data && !data.error) {
            const monthlyData = data.monthly_sales_data ? parseJson(JSON.stringify(data.monthly_sales_data)) : null;
            const forecast = data.boudica_forecast ? parseJson(JSON.stringify(data.boudica_forecast)) : null;

            let html = '<div class="result-label">📈 Monthly Forecast</div>';
            
            if (forecast && forecast.predicted_sales) {
                html += `<div class="result-value">${formatCurrency(forecast.predicted_sales)}</div>`;
                html += `<div class="result-detail"><strong>Confidence:</strong> ${escapeHtml(forecast.confidence_level || 'N/A')}</div>`;
                if (forecast.seasonal_trend) {
                    html += `<div class="result-detail"><strong>Seasonal Trend:</strong> ${escapeHtml(forecast.seasonal_trend)}</div>`;
                }
                if (forecast.explanation) {
                    html += `<div class="result-detail"><strong>Analysis:</strong> ${escapeHtml(forecast.explanation)}</div>`;
                }
            } else if (monthlyData) {
                html += `<div class="result-detail"><strong>Historical Data:</strong> Available</div>`;
                html += `<div class="result-value">${formatCurrency(monthlyData.avg_total || 0)}</div>`;
                html += '<div class="result-detail"><em>Boudica AI analysis is processing...</em></div>';
            } else {
                html += '<div class="result-detail">Unable to generate forecast. Insufficient historical data.</div>';
            }

            resultDiv.innerHTML = html;
            resultDiv.classList.add('success');
            resultDiv.style.display = 'block';
            showToast('Monthly forecast generated ✓', 'success');
        } else {
            resultDiv.innerHTML = '<div class="result-label">Error</div><div class="result-detail">' + (data.error || 'Unknown error') + '</div>';
            resultDiv.classList.add('error');
            resultDiv.style.display = 'block';
            showToast('Forecast failed: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Monthly forecast error:', error);
        resultDiv.innerHTML = '<div class="result-label">Error</div><div class="result-detail">' + error.message + '</div>';
        resultDiv.classList.add('error');
        resultDiv.style.display = 'block';
        showToast('Forecast failed: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

/**
 * Predict reorder date for a specific product
 */
async function predictReorderDate() {
    const barcodeInput = document.getElementById('reorder-barcode');
    const barcode = barcodeInput.value.trim();

    if (!barcode) {
        showToast('Please enter a barcode', 'warning');
        return;
    }

    setLoading(true);
    const resultDiv = document.getElementById('reorder-prediction-result');
    resultDiv.style.display = 'none';

    try {
        const data = await apiCall('predict_reorder_date', { barcode });
        console.log('Reorder prediction response:', data);

        if (data && !data.error) {
            const itemData = data.item_data ? parseJson(JSON.stringify(data.item_data)) : null;
            const prediction = data.reorder_prediction ? parseJson(JSON.stringify(data.reorder_prediction)) : null;

            let html = `<div class="result-label">📦 ${escapeHtml(barcode)}</div>`;
            
            if (itemData && itemData.product_description) {
                html += `<div class="result-detail"><strong>Product:</strong> ${escapeHtml(itemData.product_description)}</div>`;
                html += `<div class="result-detail"><strong>Stock:</strong> ${itemData.quantity || 0} | Available: ${itemData.available || 0}</div>`;
            }

            if (prediction) {
                if (prediction.days_until_reorder !== undefined) {
                    const daysNum = parseInt(prediction.days_until_reorder);
                    const priorityClass = prediction.priority === 'urgent' ? 'priority-urgent' : 
                                        prediction.priority === 'normal' ? 'priority-normal' : 'priority-low';
                    
                    html += `<div class="result-value ${priorityClass}">`;
                    html += `⏰ ${daysNum} days`;
                    html += `</div>`;
                    
                    html += `<div class="result-detail"><strong>Priority:</strong> ${escapeHtml(prediction.priority ? prediction.priority.toUpperCase() : 'NORMAL')}</div>`;
                }

                if (prediction.recommended_quantity) {
                    html += `<div class="result-detail"><strong>Recommended Qty:</strong> ${escapeHtml(prediction.recommended_quantity)} units</div>`;
                }

                if (prediction.explanation) {
                    html += `<div class="result-detail">${escapeHtml(prediction.explanation)}</div>`;
                }
            } else {
                html += '<div class="result-detail"><em>Boudica AI analysis is processing...</em></div>';
            }

            resultDiv.innerHTML = html;
            resultDiv.classList.add('success');
            resultDiv.style.display = 'block';
            showToast('Reorder prediction generated ✓', 'success');
        } else {
            resultDiv.innerHTML = '<div class="result-label">Error</div><div class="result-detail">' + (data.error || 'Unknown error') + '</div>';
            resultDiv.classList.add('error');
            resultDiv.style.display = 'block';
            showToast('Prediction failed: ' + (data.error || 'Product not found'), 'error');
        }
    } catch (error) {
        console.error('Reorder prediction error:', error);
        resultDiv.innerHTML = '<div class="result-label">Error</div><div class="result-detail">' + error.message + '</div>';
        resultDiv.classList.add('error');
        resultDiv.style.display = 'block';
        showToast('Prediction failed: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
}

/**
 * Initialize forecasting module when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    // Daily sales forecast button
    const dailyBtn = document.getElementById('forecast-daily-btn');
    if (dailyBtn) {
        dailyBtn.addEventListener('click', forecastDailySales);
    }

    // Weekly sales forecast button
    const weeklyBtn = document.getElementById('forecast-weekly-btn');
    if (weeklyBtn) {
        weeklyBtn.addEventListener('click', forecastWeeklySales);
    }

    // Monthly sales forecast button
    const monthlyBtn = document.getElementById('forecast-monthly-btn');
    if (monthlyBtn) {
        monthlyBtn.addEventListener('click', forecastMonthlySales);
    }

    // Reorder prediction button
    const reorderBtn = document.getElementById('forecast-reorder-btn');
    if (reorderBtn) {
        reorderBtn.addEventListener('click', predictReorderDate);
    }

    // Allow Enter key to trigger reorder prediction
    const barcodeInput = document.getElementById('reorder-barcode');
    if (barcodeInput) {
        barcodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                predictReorderDate();
            }
        });
    }

    console.log('✓ Forecasting module initialized');
});
