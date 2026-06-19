
const DEBUG = true;/* MUST BE SET TO FALSE ON IMPLEMENTATION */
const PGBC_Agents = "/cgi-bin/boudica_pos";
const PGBC_Manager = "/cgi-bin/pgbcadmin";
const TAX_RATE = 20;

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
    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    showToast('Setting the daily float.', 'info');
    const float = document.getElementById('float-amount').value;
    let response = await fetch(`${PGBC_Agents}?username=${User}&command=setfloat&password=${Password}&float=${float}`);
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
            } else {
                showToast(json.response, 'success');
                openTill('till');
            }
        } catch {/** Do nothing it is the expected result */}
        return;
    }
    showToast('Sorry the service is currently unavailable. Please retry', 'error'); 
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
    /** queryString="username=sibain@omniindex.io&command=addsupplier&password=Ch35t3r&supplier=&address=telephone=&postcode="; */
    const params = new URLSearchParams({
        username: User,
        password: Password,
        command: 'addsupplier',
        supplier: sup_name,
        address: sup_address,
        telephone: sup_phone,
        supplier_email: sup_email,
        postcode: sup_zip
    });
    let response = await fetch(`${PGBC_Agents}?${params.toString()}`);  
        if (response.status == 200) {
            let response_text = await response.text();
            if (DEBUG) {
                console.log(response_text);
            }
            const i_end = response_text.indexOf("}");
            if (i_end > 0) {
                response_text = response_text.substring(0, i_end + 1);
            }
            try {
                const json = JSON.parse(response_text);
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
            } catch (e) {
                console.error("Error parsing add supplier response:", e, response_text);
                showToast('Received an invalid response from server.', 'error');
            }
        } else {
            showToast('Sorry, the service is currently unavailable. Please try again.', 'error');
        }      
});
