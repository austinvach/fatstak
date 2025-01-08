document.addEventListener("DOMContentLoaded", () => {
  const now = new Date().getTime();
  savedAddresses = JSON.parse(localStorage.getItem("savedAddresses")) || [];
  lastUpdated = localStorage.getItem("lastUpdated") || null;
  btcPrice = localStorage.getItem("btcPrice") || null;
  refreshTime = 1 * 60 * 1000; // Current refresh time is every 5 minutes
  
//CHECK IF A USER HAS ANY SAVED ADDRESSES BEFORE TRYING TO FETCH OR DISPLAY UPDATES
  if (!lastUpdated || now - lastUpdated > refreshTime) {
    fetchUpdates();
  } else {
    displayInformation();
    const timeUntilNextRefresh = refreshTime - (now - lastUpdated);
    setTimeout(fetchUpdates, timeUntilNextRefresh);
  }
});

function addAddress() {
  const address = document.getElementById("btcAddress").value;
  if (address) {
    const currentDate = new Date().toISOString();
    savedAddresses.push({ address: address, dateAdded: currentDate });
    localStorage.setItem("savedAddresses", JSON.stringify(savedAddresses));
    document.getElementById("btcAddress").value = "";
    fetchUpdates();
  }
}

function displayInformation() {
  // console.log("DISPLAY INFORMATION");
  // DISPLAY THE CURRENT BITCOIN PRICE
  const btcPriceSpan = document.getElementById("btcPrice");
  btcPriceSpan.textContent = ` $${btcPrice}`;
  // CHECK IF THE USER HAS ANY SAVED ADDRESSES AND DISPLAY THEM IF THEY DO
  if (savedAddresses) {
  const addressTableBody = document.querySelector("#addressTable tbody");
  addressTableBody.innerHTML = "";
  savedAddresses.forEach((entry, index) => {
    const row = document.createElement("tr");
    const addressCell = document.createElement("td");
    addressCell.textContent = entry.nickname
      ? `${entry.nickname} (${entry.address.slice(-6)})`
      : entry.address;
    const editIcon = document.createElement("span");
    editIcon.textContent = " ✏️";
    editIcon.className = "edit-icon";
    editIcon.style.cursor = "pointer";
    editIcon.onclick = () => editNickname(index);
    addressCell.appendChild(editIcon);
    const balanceCell = document.createElement("td");
    balanceCell.textContent = entry.balance ? entry.balance : "Loading...";
    const valueCell = document.createElement("td");
    valueCell.textContent = entry.value ? entry.value : "Loading...";
    row.appendChild(addressCell);
    row.appendChild(balanceCell);
    row.appendChild(valueCell);
    addressTableBody.appendChild(row);
  });
  document.getElementById(
    "lastUpdated"
  ).textContent = `Last Updated: ${new Date(
    parseInt(lastUpdated)
  ).toLocaleString()}`;
  }
}

function editNickname(index) {
  const newNickname = prompt(
    "Enter a nickname for this address:",
    savedAddresses[index].nickname
  );
  if (newNickname !== null) {
    const addressSuffix = savedAddresses[index].address.slice(-6);
    savedAddresses[index].nickname = newNickname;
    localStorage.setItem("savedAddresses", JSON.stringify(savedAddresses));
    displayInformation();
  }
}

async function fetchUpdates() {
  console.log("FETCH UPDATES");
  // FETCH BITCOIN PRICE
  const response = await fetch(
    "https://api.coindesk.com/v1/bpi/currentprice/BTC.json"
  );
  const data = await response.json();
  btcPrice = data.bpi.USD.rate_float.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  localStorage.setItem("btcPrice", btcPrice);
  
  // IF THE USER HAS ANY SAVED ADDRESSES, FETCH THIER BALANCES TOO
  if (savedAddresses) {
    const rows = document.querySelectorAll("#addressTable tbody tr");
    for (let i = 0; i < savedAddresses.length; i++) {
      const address = savedAddresses[i].address;
      const response = await fetch(
        `https://blockchain.info/q/addressbalance/${address}`
      );
      if (response.ok) {
        savedAddresses[i].balance = await response.json();
      } else {
        savedAddresses[i].balance = "Error";
      }
    }
    localStorage.setItem("savedAddresses", JSON.stringify(savedAddresses));
  }
  // UPDATE THE LAST UPDATED TIME
  lastUpdated = new Date().getTime();
  localStorage.setItem("lastUpdated", lastUpdated);
  // SET A TIMEOUT FOR THE NEXT REFRESH
  setTimeout(fetchUpdates, refreshTime);
  displayInformation();
}