const API = "http://127.0.0.1:8000";

const els = {

  select: document.getElementById("agentSelect"),
  helper: document.getElementById("agentHelper"),
  activeLabel: document.getElementById("activeAgentLabel"),

  createBtn: document.getElementById("createAgentBtn"),
  viewUrlsBtn: document.getElementById("viewUrlsBtn"),

  modal: document.getElementById("agentModal"),
  confirmCreate: document.getElementById("confirmCreateBtn"),
  cancelCreate: document.getElementById("cancelCreateBtn"),
  agentNameInput: document.getElementById("agentNameInput"),

  urlsModal: document.getElementById("urlsModal"),
  urlsList: document.getElementById("urlsList"),
  closeUrlsBtn: document.getElementById("closeUrlsBtn"),

  saveBtn: document.getElementById("savePageBtn"),

};

let agents = [];
let activeAgent = null;



document.addEventListener("DOMContentLoaded", async () => {

  chrome.runtime.sendMessage({ action: "INIT_IDENTITY" });

  await loadAgents();

  attachEvents();

});



function attachEvents(){

  els.select.onchange = handleAgentChange;

  els.createBtn.onclick =
    () => els.modal.classList.remove("hidden");

  els.cancelCreate.onclick =
    () => els.modal.classList.add("hidden");

  els.confirmCreate.onclick =
    createAgent;

  els.viewUrlsBtn.onclick =
    showUrls;

  els.closeUrlsBtn.onclick =
    () => els.urlsModal.classList.add("hidden");

  els.saveBtn.onclick = savePage;

}



async function loadAgents(){

  const storage =
    await chrome.storage.local.get(["agents","activeAgent"]);

  agents = storage.agents || [];
  activeAgent = storage.activeAgent;

  populateDropdown();

}



function populateDropdown(){

  els.select.innerHTML = "";

  const system =
    agents.filter(a =>
      a.type === "system_inbox" ||
      a.type === "general");

  const custom =
    agents.filter(a =>
      a.type !== "system_inbox" &&
      a.type !== "general");

  [...system,...custom].forEach(agent=>{

    const option =
      document.createElement("option");

    option.value = agent.id;

    option.text =
      `${agent.name} (${agent.url_count || 0})`;

    els.select.appendChild(option);

  });

  els.select.value = activeAgent;

  updateHelper();

}



function updateHelper(){

  const agent =
    agents.find(a => a.id === els.select.value);

  if(!agent) return;

  activeAgent = agent.id;

  els.activeLabel.textContent = agent.name;

  if(agent.type === "system_inbox")
    els.helper.textContent =
      "Inbox: Best for single-page questions.";

  else if(agent.type === "general")
    els.helper.textContent =
      "General: Best for cross-page research.";

  else
    els.helper.textContent =
      "Custom assistant for focused knowledge.";

}



async function handleAgentChange(){

  await chrome.storage.local.set({
    activeAgent: els.select.value
  });

  updateHelper();

}



async function createAgent(){

  const name = els.agentNameInput.value.trim();

  if(!name) return;

  const {userId} =
    await chrome.storage.local.get("userId");

  await fetch(`${API}/agents`,{

    method:"POST",

    headers:{
      "Content-Type":"application/json"
    },

    body: JSON.stringify({
      user_id:userId,
      name
    })

  });

  els.modal.classList.add("hidden");

  await refreshAgents();

}



async function refreshAgents(){

  const {userId} =
    await chrome.storage.local.get("userId");

  const res =
    await fetch(`${API}/agents/${userId}`);

  agents = await res.json();

  await chrome.storage.local.set({agents});

  populateDropdown();

}



async function showUrls(){

  const agentId = els.select.value;

  const res =
    await fetch(`${API}/agents/${agentId}/urls`);

  const urls = await res.json();

  if(!urls.length){
    els.urlsList.innerHTML =
      "<div style='font-size:12px;'>No pages saved.</div>";
  }
  else{

    els.urlsList.innerHTML =
      `<div class="urls-list">` +

      urls.map(u => {

        const short =
          truncateUrl(u.url, 60);

        return `
          <div class="url-item"
               title="${u.url}"
               data-url="${u.url}">
            • ${short}
          </div>
        `;

      }).join("")

      + `</div>`;

  }

  // click handler
  document.querySelectorAll(".url-item")
    .forEach(el => {

      el.onclick = () => {

        const url = el.dataset.url;

        chrome.tabs.create({ url });

      };

    });

  els.urlsModal.classList.remove("hidden");

}

function truncateUrl(url, maxLength){

  if(url.length <= maxLength)
    return url;

  return url.substring(0, maxLength) + "...";

}



async function savePage(){

  const [tab] =
    await chrome.tabs.query({
      active:true,
      currentWindow:true
    });

  chrome.runtime.sendMessage({
    action:"Save_Page",
    tabId:tab.id
  });

}



