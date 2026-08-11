export function indexarHTML(arquivo) {
  fetch(`./frontend/html/${arquivo}.html`)
      .then(response => response.text())
      .then(data => {
        document.getElementById(arquivo).innerHTML = data;
      });
}