// utils.js

function showLoading() {
    loadingIndicator.style.display = 'block';
}

function hideLoading() {
    loadingIndicator.style.display = 'none';
}

function appendMessage(message) {
    const p = document.createElement('p');
    p.innerHTML = message;
    messageArea.appendChild(p);
    messageArea.scrollTop = messageArea.scrollHeight;
}

// 関数をグローバルスコープに定義します。
