
    const User = get_localStorage('user');
    const Password = get_localStorage('password');

    if ( User && Password ) {
        document.getElementById('login_div').style.display = 'none';  
        load_supplier_list(User, Password); /** Do not wait for this to return */
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
            const i_end = response_text.indexOf("}");
            if ( i_end > 0 ) {
                response_text = response_text.substring(0, i_end + 1);
            }
            try {
                const json = JSON.parse(response_text);
                if ( json.error != undefined ) {
                    showToast(json.error, 'error');   
                } 
            } catch {/** Do nothing it is the expected result */}
            set_localStorage('user', email);
            set_localStorage('password', password);                
            document.getElementById('login_div').style.display = 'none'; 
            load_supplier_list(email, password); /** Do not wait for this to return */    
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

document.getElementById('exit_button').addEventListener('click', function() {
    clear_localStorage();
    document.getElementById('login_div').style.display = 'flex';  
});



async function load_supplier_list(email, password) {
    let response = await fetch(`${PGBC_Agents}?username=${email}&command=getsupplierlist&password=${password}`);
    if ( response.status == 200 ) {
        let response_text = await response.text();
        if ( DEBUG ) {
            console.log ( response_text);
        }
        const i_end = response_text.indexOf("}");
        if ( i_end > 0 ) {
            response_text = response_text.substring(0, i_end + 1);
        }
        try {
            const json = JSON.parse(response_text);
            if ( json.error != undefined ) {
                showToast(json.error, 'error');
                clear_localStorage();
                document.getElementById('login_div').style.display = 'flex'; 
                return;                 
            } else {
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
            
        } catch (e) { console.error("Error parsing supplier list JSON:", e, response_text); }
        return;
    }
}