document.addEventListener("DOMContentLoaded", () => {
  const now = new Date().getTime();
  savedAddresses = JSON.parse(localStorage.getItem("savedAddresses")) || [];
  lastUpdated = localStorage.getItem("lastUpdated") || null;
  btcPrice = localStorage.getItem("btcPrice") || null;
  refreshTime = 5 * 60 * 1000; // Current refresh time is every 5 minutes
  
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
  btcPriceSpan.textContent = `USD/BTC: $${btcPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  // CHECK IF THE USER HAS ANY SAVED ADDRESSES AND DISPLAY THEM IF THEY DO
  if (savedAddresses) {
  const dataTable = document.querySelector("#dataTable tbody");
  dataTable.innerHTML = "";
  savedAddresses.forEach((entry, index) => {
    const row = document.createElement("tr");
    const addressCell = document.createElement("td");
    // addressCell.textContent = entry.nickname
    //   ? `${entry.nickname} (${entry.address.slice(-6)})`
    //   : entry.address;
    if(entry.nickname) {
      const newCell = createTableCell(entry.nickname, entry.address);
      addressCell.appendChild(newCell);
    } else {
      addressCell.textContent = entry.address;
      addressCell.classList.add('opacity-50');
      addressCell.classList.add('truncate');
    }
    // const editIcon = document.createElement("span");
    // editIcon.textContent = " ✏️";
    // editIcon.className = "edit-icon";
    // editIcon.style.cursor = "pointer";
    // editIcon.onclick = () => editNickname(index);
    // addressCell.appendChild(editIcon);
    const balanceCell = document.createElement("td");
    balanceCell.textContent = entry.balance ? (entry.balance/100000000) : "Loading...";
    const valueCell = document.createElement("td");
    valueCell.textContent = entry.value ? ` $${entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Loading...";
    row.appendChild(addressCell);
    row.appendChild(balanceCell);
    row.appendChild(valueCell);
    dataTable.appendChild(row);
  });
  document.getElementById(
    "lastUpdated"
  ).textContent = `Updated: ${new Date(
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
  btcPrice = data.bpi.USD.rate_float;
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
        savedAddresses[i].value = ((savedAddresses[i].balance/100000000) * btcPrice);
      } else {
        savedAddresses[i].balance = "Error";
        savedAddresses[i].value = "Error";
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

function createTableCell(nickname, address) {
  // Create the <div> with class "flex items-center gap-3"
  // const flexDiv = document.createElement('div');
  // flexDiv.className = 'flex items-center gap-3';

  // Create the inner <div>
  const innerDiv = document.createElement('div');
  innerDiv.style.width = '100%';

  // Create the <div> with class "font-bold" and set its text content
  const nicknameDiv = document.createElement('div');
  nicknameDiv.className = 'font-bold';
  nicknameDiv.textContent = nickname;

  // Create the <div> with class "text-sm opacity-50" and set its text content
  const addressDiv = document.createElement('div');
  addressDiv.className = 'text-sm opacity-50';
  addressDiv.textContent = address;

  // Apply CSS styles to truncate text
addressDiv.style.overflow = 'hidden';
addressDiv.style.textOverflow = 'ellipsis';
addressDiv.style.whiteSpace = 'nowrap';

  // Append the nameDiv and locationDiv to the innerDiv
  innerDiv.appendChild(nicknameDiv);
  innerDiv.appendChild(addressDiv);

  // Append the innerDiv to the flexDiv
  // flexDiv.appendChild(innerDiv);

  return innerDiv;
}