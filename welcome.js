// Handle form submission to redirect to ./login
document.addEventListener('DOMContentLoaded', function () {
    // Login form redirection logic
    document.getElementById('loginForm').addEventListener('submit', function(event) {
      event.preventDefault(); // Prevent the default form submission
      //window.location.href = './login'; // Redirect to the ./login route
    });

  
    // Modal functionality for Sign Up
    var signUpModal = document.getElementById("signUpModal");
    var signUpBtn = document.getElementById("signUpBtn");
    var closeBtn = document.getElementsByClassName("close")[0];
  
    // Show the modal when "Sign Up" button is clicked
    signUpBtn.onclick = function() {
      console.log('Sign Up Button clicked')
      signUpModal.style.display = "block";
    };
  
    // Close the modal when "x" is clicked
    closeBtn.onclick = function() {
      signUpModal.style.display = "none";
    };
  
    // Close the modal when clicking outside of the modal
    window.onclick = function(event) {
      if (event.target == signUpModal) {
        signUpModal.style.display = "none";
      }
    };
  
    // Handle sign-up form submission
    document.getElementById('signUpForm').addEventListener('submit', function(event) {
      event.preventDefault();
      alert('Account created for ' + document.getElementById('signupEmail').value);
      signUpModal.style.display = "none"; // Close the modal after submission
    });
});
  