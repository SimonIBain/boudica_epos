
    const User = get_localStorage('user');
    const Token = get_localStorage('token');

    if ( User && Token ) {
        document.getElementById('login_div').style.display = 'none';
        load_supplier_list(User); /** Do not wait for this to return */
        // loadWorkshops() (till.js) is only defined on the till page, and its own
        // DOMContentLoaded call races this same auto-login check on a page that already
        // has stored credentials — call it again here, same pattern as load_supplier_list,
        // so a fresh login (below) also populates it, not just a reload with existing creds.
        if ( typeof loadWorkshops === 'function' ) { loadWorkshops(); }
    }


async function check_user(email, password) {   
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const params = new URLSearchParams();
        params.append('username', email);
        params.append('command', 'login');
        params.append('password', password);
        
        console.log('Sending login request to:', PGBC_Agents);
        
        let response = await fetch(PGBC_Agents, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString(),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        console.log('Login response status:', response.status);
        return response;
    } catch (error) {
        console.error('Login fetch error:', error);
        throw error;
    }
}

document.getElementById('login_ok_button').addEventListener('click', async function(ev) {
    ev.preventDefault();
    const email = login_email.value;
    const password = login_password.value;
    showToast('Checking login credentials', 'info');                
    try {
        const response = await check_user(email, password);
        if ( response.status == 200 ) {
            let response_text = await response.text();
            if ( DEBUG ) {
                console.log ( response_text);
            }
            let json;
            try {
                json = JSON.parse(response_text);
                if ( json.error != undefined ) {
                    showToast(json.error, 'error');
                    return;
                }
            } catch (e) {
                console.error("Error parsing login response:", e, response_text);
                showToast('Received an invalid response from server.', 'error');
                return;
            }
            if ( !json.token ) {
                console.error("Login succeeded but no session token was returned:", response_text);
                showToast('Server error: login did not return a session token.', 'error');
                return;
            }
            // The password itself is never stored, even in memory beyond this handler —
            // every later call authenticates with the session token `login` just issued
            // (CODE_VERIFIED_AUDIT.md §3.6/§5/§6.2).
            set_localStorage('user', email);
            set_localStorage('token', json.token);
            document.getElementById('login_div').style.display = 'none';
            load_supplier_list(email); /** Do not wait for this to return */
            if ( typeof loadWorkshops === 'function' ) { loadWorkshops(); }
        } else  {
            showToast('Server error: ' + response.status, 'error');  
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Connection error: ' + error.message, 'error');
    }
});

document.getElementById('sign_up_button').addEventListener('click', function() {
    alert('Sign Up button clicked')
});

document.getElementById('exit_button').addEventListener('click', async function() {
    // Revoke the session token server-side before clearing it locally — otherwise it
    // would stay valid (anyone who somehow captured it could still use it) until its
    // normal 12-hour expiry, rather than dying the moment the operator logs out.
    await apiCall('logout');
    clear_localStorage();
    document.getElementById('login_div').style.display = 'flex';
});



async function load_supplier_list(email) {
    const json = await apiCall('getsupplierlist');
    if ( json.error != undefined ) {
        showToast(json.error, 'error');
        clear_localStorage();
        document.getElementById('login_div').style.display = 'flex';
        return;
    }
    const supplierSelects = document.querySelectorAll('.supplier-select-list');
    if (supplierSelects.length > 0 && json.suppliers && Array.isArray(json.suppliers)) {
        supplierSelects.forEach(select => {
            // Clear existing options but keep the placeholder (the first option)
            while (select.options.length > 1) {
                select.remove(1);
            }
            json.suppliers.forEach(supplierName => {
                const option = document.createElement('option');
                option.value = supplierName;
                option.textContent = supplierName;
                select.appendChild(option);
            });
        });
    }
}