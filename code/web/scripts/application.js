
const DEBUG = false; /* 7.1#15 — was shipped `true`, logging every API response (incl. credentials) to the browser console. */
const PGBC_Agents = "/cgi-bin/boudica_pos";
const PGBC_Manager = "/cgi-bin/pgbcadmin";
const TAX_RATE = 20;

/**
 * Shared helper for every till->backend call. Two things every ad hoc fetch() in this
 * codebase used to get wrong on its own:
 *  - Sends credentials in a POST body instead of a GET query string (7.1#14 — a GET
 *    query string lands in the browser's own history and in any server/proxy access
 *    log along the way).
 *  - Parses the *whole* response body as JSON instead of truncating at the first "}"
 *    (7.1#3/#6 — that trick landed inside nested objects on real API responses, e.g.
 *    getdetails, and silently corrupted or dropped them).
 * Always resolves to a parsed object; a transport, HTTP, or parse failure resolves to
 * { error: "..." } rather than throwing, so every caller only ever needs to check
 * `.error` on the result — never response.ok alone.
 */
async function apiCall(command, extraParams = {}) {
    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    const body = new URLSearchParams({ username: User || '', password: Password || '', command, ...extraParams });
    let response;
    try {
        response = await fetch(PGBC_Agents, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });
    } catch (error) {
        console.error(`apiCall(${command}) network error:`, error);
        return { error: 'Sorry, the service is currently unavailable. Please retry.' };
    }
    const response_text = await response.text();
    if (DEBUG) {
        console.log(`apiCall(${command}) response:`, response_text);
    }
    if (!response.ok) {
        return { error: `Server error: ${response.status}` };
    }
    try {
        return JSON.parse(response_text);
    } catch (e) {
        console.error(`apiCall(${command}) invalid JSON:`, e, response_text);
        return { error: 'Received an invalid response from the server.' };
    }
}

function updateDateTime() {
    const dateTimeContainer = document.getElementById('date-time-container');
    if (dateTimeContainer) {
        const now = new Date();
        const dateString = now.toLocaleDateString(undefined, {
           year: 'numeric', month: 'long', day: 'numeric'
        });
        const timeString = now.toLocaleTimeString();
        dateTimeContainer.innerHTML = `<div>${timeString} | ${dateString}</div>`;
    }
}



document.addEventListener('DOMContentLoaded', function() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    if ( !User || !Password ) {
        document.getElementById('login_div').style.display = 'flex'; 
        return; 
    }
    load_supplier_list(User, Password); /** Do not wait for this to return */
});


function set_localStorage(key, value) {
    localStorage.setItem(key, value);
}

function get_localStorage(key) {
    if ( localStorage.getItem(key) && localStorage.getItem(key) != '' ) {
        return localStorage.getItem(key);
    }
    return undefined; /** We do it this way to make sure we have a null return if teh value is empty but not undefined */
}

function delete_localStorage(key) {
    localStorage.removeItem(key);
}

function clear_localStorage() {
    localStorage.clear();
}

// --- Loading Overlay Functions ---
function showLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('show');
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

document.getElementById('set-float-btn').addEventListener('click', async function(ev) {
    ev.preventDefault();
    showToast('Setting the daily float.', 'info');
    const float = document.getElementById('float-amount').value;
    const json = await apiCall('setfloat', { float });
    if ( json.error != undefined ) {
        showToast(json.error, 'error');
    } else {
        showToast(json.response, 'success');
        openTill('till');
    }
});

/** Add a supplier */
document.getElementById('add-supplier-form').addEventListener('submit', async function(ev) {
    ev.preventDefault();
    const sup_name = document.getElementById('supplier-name').value;
    const sup_address = document.getElementById('supplier-address').value;
    const sup_phone = document.getElementById('supplier-phone').value;
    const sup_zip = document.getElementById('supplier-postcode').value;
    const sup_email = document.getElementById('supplier-email').value;
    /** We will doa combination check here  */
    if ( (!sup_name && !sup_address) || (!sup_name && !sup_phone )) {
        showToast('Please insert teh supplier name together with either address or phone number.', 'info');
        return;
    }
    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    if ( !User || !Password ) {
        document.getElementById('login_div').style.display = 'flex';
        //showToast('You must be logged in to add a supplier.', 'error');
        return;
    }
    const json = await apiCall('addsupplier', {
        supplier: sup_name,
        address: sup_address,
        telephone: sup_phone,
        supplier_email: sup_email,
        postcode: sup_zip
    });
    if (json.error) {
        showToast(json.error, 'error');
    } else if (json.response) {
        showToast(json.response, 'success');
        document.getElementById('add-supplier-form').reset();
    } else {
        showToast('Supplier has been added to the system.', 'info');
        /** Update teh supplier list  */
        load_supplier_list(User, Password);
    }
});
