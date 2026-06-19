function openTab(evt, tabName) {
    // Declare all variables
    let i, tabcontent, tabbuttons;
  
    // Get all elements with class="tab-content" and hide them by removing the .active class
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].classList.remove("active");
    }
  
    // Get all elements with class="tab-button" and remove the "active" class
    tabbuttons = document.getElementsByClassName("tab-button");
    for (i = 0; i < tabbuttons.length; i++) { 
        tabbuttons[i].classList.remove("active");
    }
  
    // Show the current tab's content and add an "active" class to the button that opened the tab
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
        if ( tabName === 'tab10') {
        document.getElementById('staockTakeAdd').focus();
    }

    // If the clicked button is inside a dropdown, also style the dropdown toggle
    const dropdown = evt.currentTarget.closest('.tab-dropdown');
    if (dropdown) {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        if (toggle) {
            toggle.classList.add('active');
        }
    }
}

function openTill(tabName) {
    // Declare all variables
    let i, tabcontent, tabbuttons;
    const till = document.getElementById(tabName);
  
    // Get all elements with class="tab-content" and hide them by removing .active
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].classList.remove("active");
    }
  
    // Get all elements with class="tab-button" and remove the "active" class
    tabbuttons = document.getElementsByClassName("tab-button");
    for (i = 0; i < tabbuttons.length; i++) { 
        tabbuttons[i].classList.remove("active");
    }
  
    // Show the current tab's content and add an "active" class to it
    document.getElementById(tabName).classList.add("active");
    document.getElementById(tabName).classList.add("active");
    // Find the Till button to make it active. This is better than passing the tabName.
    document.querySelector('.tab-button[onclick*="\'till\'"]').classList.add('active');
}

// Add event listener to open the first tab by default
document.addEventListener("DOMContentLoaded", function() {
    // Open the Till tab by default as it's the primary function
    document.querySelector('.tab-button[onclick*="\'tab9\'"]').click();
});