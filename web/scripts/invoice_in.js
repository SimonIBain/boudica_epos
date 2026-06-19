const invoiceForm = document.getElementById('invoice-in-form');
const dropZone = document.getElementById('invoice-file-dropzone');
const fileInput = document.getElementById('invoice-file-input');
const dropZonePrompt = dropZone?.querySelector('.drop-zone-prompt');
let uploadedFile = null;

if (dropZone && fileInput && dropZonePrompt) {
    // Open file selector when drop zone is clicked
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle file selection from input
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFile(fileInput.files[0]);
        }
    });

    // Drag and drop events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drop-zone-over');
    });

    ['dragleave', 'dragend'].forEach(type => {
        dropZone.addEventListener(type, () => {
            dropZone.classList.remove('drop-zone-over');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drop-zone-over');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files; // Assign dropped files to the input
            handleFile(e.dataTransfer.files[0]);
        }
    });
}

function handleFile(file) {
    uploadedFile = file;
    dropZonePrompt.textContent = `File ready: ${file.name}`;
}

function resetDropZone() {
    uploadedFile = null;
    if (dropZonePrompt) dropZonePrompt.textContent = 'Drag & drop an invoice file here, or click to select a file';
    if (fileInput) fileInput.value = '';
}

document.getElementById('invoice-in-form')?.addEventListener('submit', async function(ev) {
    ev.preventDefault();

    const User = get_localStorage('user');
    const Password = get_localStorage('password');
    if (!User || !Password) {
        document.getElementById('login_div').style.display = 'flex';
        showToast('You must be logged in to add an invoice.', 'error');
        return;
    }

    const supplier = document.getElementById("invoice-supplier").value;
    const invoiceNumber = document.getElementById("invoice-number").value;
    const details = document.getElementById("invoice-details").value;
    const amount = document.getElementById("invoice-amount").value;
    const isPaid = document.getElementById("invoice-paid").checked;

    // Basic validation
    if (!supplier || !invoiceNumber || !details || !amount ) {
        showToast('Please fill out all fields to add an invoice.', 'error');
        return;
    }

    showToast('Adding invoice...', 'info');

    // Use FormData to handle both form fields and the potential file upload.
    const formData = new FormData();
    formData.append('username', User);
    formData.append('password', Password);
    formData.append('command', 'addinvoice');
    formData.append('supplier', supplier);
    formData.append('invoicenumber', invoiceNumber);
    formData.append('details', details);
    formData.append('amount', amount);
    formData.append('paid', isPaid);

    // Append the file if one has been selected/dropped.
    if (uploadedFile) {
        formData.append('invoice_file', uploadedFile, uploadedFile.name);
    }

    try {
        // Sending FormData requires a POST request. The browser will automatically set
        // the 'Content-Type' to 'multipart/form-data' with the correct boundary.
        const response = await fetch(PGBC_Agents, {
            method: 'POST',
            body: formData
        });

        let response_text = await response.text();
        if (DEBUG) {
            console.log("Add Invoice Response:", response_text);
        }
        // Handle potential non-JSON text at the end of the response
        const i_end = response_text.indexOf("}");
        if (i_end > 0) {
            response_text = response_text.substring(0, i_end + 1);
        }

        if (response.ok) {
            const json = JSON.parse(response_text);
            if (json.error) {
                showToast(json.error, 'error');
            } else if (json.response) {
                showToast(json.response, 'success');
                document.getElementById('invoice-in-form').reset();
                resetDropZone();
            } else {
                showToast('Invoice added, but no confirmation received.', 'info');
                document.getElementById('invoice-in-form').reset();
                resetDropZone();
            }
        } else {
            showToast(`Error: ${response.statusText}`, 'error');
        }
    } catch (error) {
        console.error('Failed to add invoice:', error);
        showToast('An error occurred while adding the invoice.', 'error');
    }
});