document.addEventListener('DOMContentLoaded', function() {
    const testButton = document.getElementById('testAjax');
    const resultDiv = document.getElementById('result');

    testButton.addEventListener('click', function() {
        console.log('[CLIENT][AJAX][INFO] Initiating AJAX test call');
        fetch('/api/test', {
            method: 'GET',
            credentials: 'same-origin' // Include cookies for session
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('AJAX call failed');
            }
        })
        .then(data => {
            console.log('[CLIENT][AJAX][SUCCESS] Response:', data);
            resultDiv.innerHTML = `<p>${data.message}</p>`;
        })
        .catch(error => {
            console.error('[CLIENT][AJAX][ERROR] Error:', error);
            resultDiv.innerHTML = `<p>Error: ${error.message}</p>`;
        });
    });
});
